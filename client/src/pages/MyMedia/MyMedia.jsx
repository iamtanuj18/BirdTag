import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useMyMedia } from "./hooks/useMyMedia";
import { useMediaUpload } from "./hooks/useMediaUpload";
import { formatDate, openMediaInNewTab, renderMediaPreview } from "./utils/mediaHelpers.jsx";
import { TABS, AUTO_REFRESH_INTERVAL, MODAL_CLOSE_DELAY } from "./constants";
import SpeciesModal from "./components/SpeciesModal";
import MyMediaTab from "./components/MyMediaTab";
import UploadTab from "./components/UploadTab";
import ProcessingTab from "./components/ProcessingTab";
import FailedTab from "./components/FailedTab";
import "./MyMedia.css";

const MyMedia = () => {
  const { userInfo } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Tab state
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || TABS.MY_MEDIA);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalSpecies, setModalSpecies] = useState(null);
  
  // Custom hooks for data fetching and uploading
  const {
    myMediaItems,
    myMediaLoading,
    myMediaLoadingMore,
    myMediaTotal,
    myMediaHasMore,
    myMediaError,
    processingFiles,
    failedFiles,
    fetchMyMedia,
    handleLoadMore,
    trackUploadedFile
  } = useMyMedia(userInfo);
  
  const {
    file,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleReset,
    handleUpload,
    setIsUploading
  } = useMediaUpload(userInfo, (uploadUuid) => {
    // Start tracking and keep loader visible until file appears
    trackUploadedFile(uploadUuid, () => {
      // Callback when file is found - hide loader and reset form
      setIsUploading(false);
      handleReset();
    });
  });

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && Object.values(TABS).includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Fetch My Media data on initial mount
  useEffect(() => {
    fetchMyMedia(0);
  }, []);

  // Fetch My Media data when myMedia tab becomes active
  useEffect(() => {
    if (activeTab === TABS.MY_MEDIA) {
      fetchMyMedia(0);
    }
  }, [activeTab]);
  
  // Auto-refresh when there are processing files
  useEffect(() => {
    let refreshInterval;
    
    if (processingFiles.length > 0) {
      refreshInterval = setInterval(() => {
        fetchMyMedia(0);
      }, AUTO_REFRESH_INTERVAL);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [processingFiles.length]);

  /**
   * Open species modal
   */
  const openSpeciesModal = (tags) => {
    setModalSpecies(tags);
    setShowModal(true);
  };

  /**
   * Close species modal with delay for animation
   */
  const closeSpeciesModal = () => {
    setShowModal(false);
    setTimeout(() => setModalSpecies(null), MODAL_CLOSE_DELAY);
  };

  return (
    <div className="page-content">
      <div className="upload-container">
        <div className="upload-header">
          <h1 className="upload-title">My Media</h1>
          <p className="upload-subtitle">
            Upload new files and manage your bird media files
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="tabs-nav">
          <button
            className={`tab-button ${activeTab === TABS.MY_MEDIA ? "active" : ""}`}
            onClick={() => setActiveTab(TABS.MY_MEDIA)}
          >
            My Media
            {myMediaLoading && myMediaTotal === 0 ? (
              <span className="tab-count tab-count-loading">...</span>
            ) : myMediaTotal > 0 ? (
              <span className="tab-count">{myMediaTotal}</span>
            ) : null}
          </button>
          <button
            className={`tab-button ${activeTab === TABS.UPLOAD ? "active" : ""}`}
            onClick={() => setActiveTab(TABS.UPLOAD)}
          >
            Upload New File
          </button>
          <button
            className={`tab-button ${activeTab === TABS.PROCESSING ? "active" : ""}`}
            onClick={() => setActiveTab(TABS.PROCESSING)}
          >
            Currently Processing
            {myMediaLoading && processingFiles.length === 0 ? (
              <span className="tab-count tab-count-loading">...</span>
            ) : processingFiles.length > 0 ? (
              <span className="tab-count">{processingFiles.length}</span>
            ) : null}
          </button>
          <button
            className={`tab-button ${activeTab === TABS.FAILED ? "active" : ""}`}
            onClick={() => setActiveTab(TABS.FAILED)}
          >
            Failed Files
            {myMediaLoading && failedFiles.length === 0 ? (
              <span className="tab-count tab-count-loading">...</span>
            ) : failedFiles.length > 0 ? (
              <span className="tab-count">{failedFiles.length}</span>
            ) : null}
          </button>
        </nav>

        {/* Auto-refresh indicator */}
        {processingFiles.length > 0 && (
          <div className="auto-refresh-indicator">
            <div className="refresh-spinner"></div>
            <span>
              Your recently uploaded files are being analyzed for bird species identification. 
              Status updates automatically every 10 seconds.
            </span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === TABS.MY_MEDIA && (
          <MyMediaTab
            loading={myMediaLoading}
            error={myMediaError}
            items={myMediaItems}
            total={myMediaTotal}
            hasMore={myMediaHasMore}
            loadingMore={myMediaLoadingMore}
            renderMediaPreview={renderMediaPreview}
            formatDate={formatDate}
            onOpenSpeciesModal={openSpeciesModal}
            onOpenMediaInNewTab={openMediaInNewTab}
            onLoadMore={handleLoadMore}
            onRetry={() => fetchMyMedia(0)}
          />
        )}
        
        {activeTab === TABS.UPLOAD && (
          <UploadTab
            file={file}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onUpload={handleUpload}
            onReset={handleReset}
          />
        )}
        
        {activeTab === TABS.PROCESSING && (
          <ProcessingTab
            files={processingFiles}
            renderMediaPreview={renderMediaPreview}
            formatDate={formatDate}
          />
        )}
        
        {activeTab === TABS.FAILED && (
          <FailedTab
            files={failedFiles}
            renderMediaPreview={renderMediaPreview}
            formatDate={formatDate}
          />
        )}

        {/* Species Modal */}
        <SpeciesModal
          show={showModal}
          species={modalSpecies}
          onClose={closeSpeciesModal}
        />
      </div>
    </div>
  );
};

export default MyMedia;
