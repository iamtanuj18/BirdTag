import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import config from "../config.js";

const allowedExtensions = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"];

const FindByFile = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [logs, setLogs] = useState([]);
  const [mockResUrls, setMockResUrls] = useState({});
  const [message, setMessage] = useState("");
  const [loadingImage, setLoadingImage] = useState(null);
  const fileInputRef = useRef(null);
  const pollingInterval = useRef(null);

  const logMessage = (msg) => setLogs((prev) => [...prev, msg]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      alert("Unsupported file type.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(selectedFile);
    setLogs([]);
    setUploadComplete(false);
    setMockResUrls({});
    setMessage("");
  };

  const handleReset = () => {
    setFile(null);
    setLogs([]);
    setUploadComplete(false);
    setMockResUrls({});
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a valid file to upload.");
    const idToken = localStorage.getItem("id_token");
    if (!idToken) return navigate("/");

    const uniqueFileName = `${uuidv4()}-${file.name}`;
    const presignedUrl = config.apiGateway.url + "/presignedurl";
    const pollingUrl = config.apiGateway.url + "/query_polling";

    setIsUploading(true);
    logMessage(" Requesting backend to detect species from this file");

    try {
      const res = await fetch(presignedUrl, {
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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to get presigned URL");
      }

      const { s3Key, uploadUrl } = await res.json();
      logMessage("✅ Detection prcoess started.");

      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!s3Upload.ok) throw new Error(`S3 upload failed: ${s3Upload.statusText}`);

      logMessage("📤Model at it work.........");
      startPolling(pollingUrl, s3Key);
    } catch (err) {
      console.error(err);
      logMessage(`❌ detection failed: ${err.message}`);
      setIsUploading(false);
    }
  };

  const startPolling = (url, s3Key) => {
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${url}?mediaId=${encodeURIComponent(s3Key)}`);
        const data = await res.json();

        if (["success", "no_bird", "unsupported_file", "error"].includes(data.status)) {
          clearInterval(pollingInterval.current);
          
          logMessage(`✅ Status: ${data.status} (Results of this are present below)`);
          
          setUploadComplete(true);
          setIsUploading(false);
          setMessage(data.message || "Done");

          const links = data.links || [];
          const images = links.filter((l) => /\.(jpg|jpeg|png)$/i.test(l));
          const videos = links.filter((l) => /\.(mp4|webm|ogg|mov|mkv)$/i.test(l));
          const audios = links.filter((l) => /\.(mp3|wav|m4a|wma|flac|ogg)$/i.test(l));
          setMockResUrls({ images, videos, audios });
        } else {
          logMessage("⏳ Still processing...");
        }
      } catch (err) {
        clearInterval(pollingInterval.current);
        logMessage(`❌ Detection failed: ${err.message}`);
        setIsUploading(false);
      }
    }, 3000);
  };

  const renderImageGrid = () => (
    <>
      <h4>Images: <span style={{ color: "red" }}>Please click on image to open full sized image.</span></h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
        {mockResUrls.images.map((img, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
            onClick={async () => {
              setLoadingImage(img);
              try {
                const idToken = localStorage.getItem("id_token");
                const res = await fetch(`${config.apiGateway.url}/query_raw`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: idToken },
                  body: JSON.stringify({ queryType: "byThumbnailUrl", thumbnailUrl: img }),
                });
                const data = await res.json();
                if (res.ok && data.fullSizeUrl) window.open(data.fullSizeUrl, "_blank");
                else alert("Could not fetch full-size image.");
              } catch (err) {
                alert("Error loading full-size image.");
              } finally {
                setLoadingImage(null);
              }
            }}>
            <div style={{ position: "relative" }}>
              <img src={img} alt={`Image ${i + 1}`} style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", boxShadow: "0 0 8px rgba(0,0,0,0.15)", opacity: loadingImage === img ? 0.5 : 1, transition: "opacity 0.3s ease" }} />
              {loadingImage === img && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.4rem", fontWeight: "bold", color: "#333" }}>⏳</div>
              )}
            </div>
            <div style={{ marginTop: "5px", fontSize: "0.9em", textAlign: "center" }}>
              Download URL: <a href={img} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#0645AD", wordBreak: "break-all" }}>{img}</a>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div style={{ padding: "30px", textAlign: "center", color: "black" }}>
      {!isUploading && !uploadComplete && (
        <>
          <h2>Find Files Using Species detected from your uploaded File</h2>
          <p>Please note that entire process may take upto 3 minutes...</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
            <label>
              Select File: <input type="file" onChange={handleFileChange} ref={fileInputRef} />
            </label>
            <button
              onClick={handleUpload}
              disabled={!file}
              style={{ backgroundColor: "black", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: !file ? "not-allowed" : "pointer" }}
            >
              Upload File
            </button>
          </div>
          <NavLink to="/home" style={{ textDecoration: "underline", color: "black" }}>Back to Home</NavLink>
        </>
      )}

      {(isUploading || uploadComplete) && (
        <div style={{ marginTop: "30px", backgroundColor: "white", border: "1px solid #ccc", borderRadius: "8px", padding: "20px", width: "90%", maxWidth: "800px", marginLeft: "auto", marginRight: "auto", textAlign: "left", fontFamily: "monospace", overflowY: "auto", maxHeight: "500px" }}>
          <h4>📟 Upload Console</h4>
          <hr />
          {logs.map((line, idx) => (<div key={idx}>{line}</div>))}
        </div>
      )}

 <div style={{ backgroundColor: "white" }}>
  {uploadComplete &&
    mockResUrls.images.length === 0 &&
    mockResUrls.videos.length === 0 &&
    mockResUrls.audios.length === 0 && (
      <div style={{ color: "red", textAlign: "center", marginBottom: "20px" }}>
        No media files found from the uploaded file.
      </div>
  )}
     
 {mockResUrls.images?.length > 0 && (
  <>
    <h4>Images: <span style={{color:"red"}}>Please click on image to open full sized image.</span></h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
      {mockResUrls.images.map((img, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={async () => {
            setLoadingImage(img); // Start spinner
            try {
              const idToken = localStorage.getItem("id_token");
              const res = await fetch(`${config.apiGateway.url}/query_raw`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: idToken,
                },
                body: JSON.stringify({
                  queryType: "byThumbnailUrl",
                  thumbnailUrl: img,
                }),
              });
              const data = await res.json();
              if (res.ok && data.fullSizeUrl) {
                window.open(data.fullSizeUrl, "_blank");
              } else {
                alert("Could not fetch full-size image.");
              }
            } catch (err) {
              console.error("Failed to fetch full-size image", err);
              alert("Error loading full-size image.");
            } finally {
              setLoadingImage(null); // Stop spinner
            }
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={img}
              alt={`Image ${i + 1}`}
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
                boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                opacity: loadingImage === img ? 0.5 : 1,
                transition: "opacity 0.3s ease",
              }}
            />
            {loadingImage === img && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                ⏳
              </div>
            )}
          </div>
          <div style={{ marginTop: "5px", fontSize: "0.9em", textAlign: "center" }}>
            Thumbnail Download URL:{" "}
            <a
              href={img}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // 🛑 prevent triggering full-size fetch
              style={{ color: "#0645AD", wordBreak: "break-all" }}
            >
              {img}
            </a>
          </div>
        </div>
      ))}
    </div>
  </>
)}
          {mockResUrls.videos?.length > 0 && (
            <>
              <h4 style={{ marginTop: "20px" }}>Videos:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                {mockResUrls.videos.map((video, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <video controls width="300" style={{ borderRadius: "8px" }}>
                      <source src={video} />
                      Your browser does not support the video tag.
                    </video>
                    <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
                      Download URL: <a href={video} target="_blank" rel="noopener noreferrer">{video}</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {mockResUrls.audios?.length > 0 && (
            <>
              <h4 style={{ marginTop: "20px" }}>Audio:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
                {mockResUrls.audios.map((audio, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <audio controls>
                      <source src={audio} />
                      Your browser does not support the audio element.
                    </audio>
                    <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
                      Download URL: <a href={audio} target="_blank" rel="noopener noreferrer">{audio}</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

      </div>

      {uploadComplete && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleReset}
            style={{ backgroundColor: "black", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default FindByFile;
