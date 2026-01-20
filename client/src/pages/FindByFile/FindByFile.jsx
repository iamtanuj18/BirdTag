import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import config from "../../config.js";
import { MediaCard } from "../../components/Cards";
import SpeciesModal from "../MyMedia/components/SpeciesModal";
import "./FindByFile.css";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"];
const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024;

const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const openMediaInNewTab = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const renderMediaPreview = (item) => {
  if (item.fileType === "image") {
    return (
      <img
        src={item.thumbUrl || item.mediaUrl}
        alt="Bird media"
        className="feed-media-preview"
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = '<div style="color:#666;padding:2rem;text-align:center;">Image failed to load</div>';
        }}
      />
    );
  } else if (item.fileType === "audio") {
    return (
      <div className="feed-audio-preview">
        <div className="audio-icon">🎵</div>
        <audio controls className="w-100">
          <source src={item.s3Url || item.fullSizeUrl} type="audio/wav" />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  } else if (item.fileType === "video") {
    return (
      <video controls className="feed-media-preview">
        <source src={item.thumbUrl || item.mediaUrl} type="video/mp4" />
        Your browser does not support video playback.
      </video>
    );
  }
};

const FindByFile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [modalSpecies, setModalSpecies] = useState(null);

  const openSpeciesModal = (tags) => {
    setModalSpecies(tags);
    setShowSpeciesModal(true);
  };

  const closeSpeciesModal = () => {
    setShowSpeciesModal(false);
    setTimeout(() => setModalSpecies(null), 300);
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (!ALLOWED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      alert("Unsupported file type. Please upload an image, video, or audio file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setResultData(null);
    setSearchResults([]);
    setSearchAttempted(false);
    setUploadProgress("");
  };

  const handleClear = () => {
    setFile(null);
    setFileName("");
    setResultData(null);
    setSearchResults([]);
    setSearchAttempted(false);
    setUploadProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a valid file to upload.");
      return;
    }
    
    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    setLoading(true);
    setUploadProgress("🔍 Analyzing your file for bird species...");
    setSearchAttempted(true);
    setResultData(null);
    setSearchResults([]);
    setTotal(0);

    try {
      const fileSize = file.size;
      
      if (fileSize < FILE_SIZE_THRESHOLD) {
        // small files - direct upload
        setUploadProgress("📤 Processing file (this may take up to 3 minutes)...");
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result.split(',')[1];
            const fileExt = file.name.substring(file.name.lastIndexOf('.'));
            
            setUploadProgress("🤖 Running AI detection models...");
            
            const response = await fetch(config.lambdaFunctions.queryWithFileUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                fileData: base64Data,
                fileExt: fileExt
              })
            });
            
            await handleQueryResponse(response);
          } catch (err) {
            console.error(err);
            alert(`Detection failed: ${err.message}`);
            setLoading(false);
            setUploadProgress("");
          }
        };
        reader.readAsDataURL(file);
        
      } else {
        // large files - upload to S3 first
        setUploadProgress("📤 Uploading large file to temporary storage...");
        
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        const presignedUrl = config.apiGateway.url + "/presignedurl";
        
        const presignedRes = await fetch(presignedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            filename: uniqueFileName,
            contentType: file.type || "application/octet-stream",
            folder: "query_uploads",
          }),
        });

        if (!presignedRes.ok) {
          const errorData = await presignedRes.json();
          throw new Error(errorData.message || "Failed to get presigned URL");
        }

        const { s3Key, uploadUrl } = await presignedRes.json();
        
        const s3Upload = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!s3Upload.ok) throw new Error(`S3 upload failed: ${s3Upload.statusText}`);
        
        setUploadProgress("🤖 Running AI detection models (this may take up to 3 minutes)...");
        
        const response = await fetch(config.lambdaFunctions.queryWithFileUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            s3Key: s3Key
          })
        });
        
        await handleQueryResponse(response);
      }
      
    } catch (err) {
      console.error(err);
      alert(`Process failed: ${err.message}`);
      setLoading(false);
      setUploadProgress("");
    }
  };
  
  const handleQueryResponse = async (response) => {
    if (!response.ok) {
      let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
      
      if (response.status === 403) {
        errorMessage = '403 Forbidden: Lambda Function URL authentication is not configured correctly. Please ensure the Lambda Function URL auth type is set to NONE.';
      } else if (response.status === 401) {
        errorMessage = '401 Unauthorized: Your session has expired. Please log in again.';
      }
      
      try {
        const errorData = await response.json();
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (e) {
        // ignore json parse errors
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    const normalizedData = {
      scenario: data.status,
      speciesNames: data.detectedSpecies || [],
      totalBirds: data.totalBirds || 0,
      message: data.message || '',
      detectedCounts: data.detectedCounts || {}
    };
    
    setResultData(normalizedData);
    setSearchAttempted(true);
    
    if (data.status === "success" && data.matchingFiles && data.matchingFiles.length > 0) {
      const formattedResults = data.matchingFiles.map(file => ({
        mediaId: file.mediaId || '',
        mediaUrl: file.url,
        thumbUrl: file.url,
        fullSizeUrl: file.url,
        s3Url: file.url,
        fileType: file.fileType || 'image',
        tags: file.tags || {},
        uploadedBy: file.uploadedBy || 'Unknown',
        uploadedAt: file.uploadedAt || Date.now() / 1000
      }));
      setSearchResults(formattedResults);
      setTotal(formattedResults.length);
    } else {
      setSearchResults([]);
      setTotal(0);
    }
    
    setTimeout(() => {
      document.getElementById('search-results')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
    
    setLoading(false);
    setUploadProgress("");
  };

  return (
    <div className="species-browser-container">
      <div className="species-browser-header">
        <h1 className="species-browser-title">Find Community Files by Uploading Your File</h1>
        <div className="info-banner" style={{ 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginTop: '1rem',
          fontSize: '0.95rem',
          color: '#1e40af'
        }}>
          <strong>How it works:</strong> Upload your file → AI detects species (e.g., "Kingfisher, Sparrow") → System searches all community uploads for files with those species → Results displayed below
          <br />
          <strong>⏱️ Processing time:</strong> Usually 30 seconds, but expect delays of up to 3-5 minutes
        </div>
      </div>

      <div className="search-config-card" style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '8px'
          }}>
            <div className="spinner" style={{ 
              width: '3rem', 
              height: '3rem', 
              borderWidth: '4px',
              marginBottom: '1.5rem'
            }} />
            <p style={{ 
              color: '#6b7280',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              margin: 0,
              textAlign: 'center',
              paddingLeft: '1rem',
              paddingRight: '1rem'
            }}>
              Please wait up to 3-5 minutes.<br />
              <strong style={{ color: '#dc2626' }}>Please do not close this page or browser.</strong>
            </p>
          </div>
        )}
        
        <div className="search-section">
          <label className="search-label">Select Media File</label>
          <div className="species-input-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.mp4,.mov,.mkv,.wav,.mp3,.flac,.ogg,.m4a,.wma"
              className="species-input"
              onChange={handleFileChange}
              style={{ padding: '0.75rem' }}
            />
          </div>
          {fileName && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#059669' }}>
              ✓ Selected: <strong>{fileName}</strong>
            </div>
          )}
        </div>

        <div className="search-section" style={{ paddingTop: 0 }}>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
            <strong>Supported formats:</strong> Images (.jpg, .png), Videos (.mp4, .mov, .mkv), Audio (.wav, .mp3, .flac, .ogg, .m4a, .wma)
          </p>
        </div>

        <div className="search-actions">
          <button 
            className="btn-search" 
            onClick={handleUpload}
            disabled={!file || loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ 
                  width: '1rem', 
                  height: '1rem', 
                  borderWidth: '2px',
                  marginRight: '0.5rem'
                }} />
                Processing...
              </>
            ) : (
              'Detect & Search'
            )}
          </button>
          {file && !loading && (
            <button className="btn-clear" onClick={handleClear}>
              Clear File
            </button>
          )}
        </div>
      </div>

      {searchResults.length > 0 && (
        <div id="search-results" className="results-section">
          <div className="results-header">
            <h2 className="results-title">
              Matching Community Files
              {total > 0 && (
                <span className="results-count"> ({total} file{total !== 1 ? 's' : ''})</span>
              )}
            </h2>
            {resultData?.speciesNames && resultData.speciesNames.length > 0 && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
                Detected species: <strong style={{ color: '#059669' }}>{resultData.speciesNames.join(", ")}</strong>
                {resultData.totalBirds > 0 && ` (${resultData.totalBirds} bird${resultData.totalBirds !== 1 ? 's' : ''})`}
              </p>
            )}
          </div>

          <div className="feed-grid">
            {searchResults.map((item, i) => (
              <MediaCard
                key={`${item.mediaId}-${i}`}
                item={item}
                renderMediaPreview={renderMediaPreview}
                formatDate={formatDate}
                onOpenSpeciesModal={() => openSpeciesModal(item.tags)}
                onOpenMediaInNewTab={() => openMediaInNewTab(item.fullSizeUrl)}
                hideUploadedBy={false}
              />
            ))}
          </div>
        </div>
      )}
      
      {searchAttempted && !loading && resultData?.scenario === "no_birds" && (
        <div id="search-results" className="empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No Bird Species Detected</h3>
          <p className="empty-state-message">
            {resultData.message || "Our AI couldn't detect any bird species in your uploaded file. Please try uploading a different file with clear bird visuals or sounds."}
          </p>
        </div>
      )}
      
      {searchAttempted && !loading && resultData?.scenario === "no_matches" && (
        <div id="search-results" className="empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">Species Detected, But No Matching Files</h3>
          <p className="empty-state-message">
            {resultData.speciesNames && resultData.speciesNames.length > 0 && (
              <>
                <strong>Detected species:</strong> {resultData.speciesNames.join(", ")} 
                {resultData.totalBirds > 0 && ` (${resultData.totalBirds} bird${resultData.totalBirds !== 1 ? 's' : ''})`}
                <br /><br />
              </>
            )}
            {resultData.message || "No community files contain these specific bird species. The species were successfully detected in your file, but no other users have uploaded files with these birds yet."}
          </p>
        </div>
      )}
      
      <SpeciesModal
        show={showSpeciesModal}
        species={modalSpecies}
        onClose={closeSpeciesModal}
      />
    </div>
  );
};

export default FindByFile;
