import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import MediaCard from "../../components/Cards/MediaCard/MediaCard.jsx";
import config from "../../config.js";
import "./ModifyTags.css";

const ModifyTags = () => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  
  // Data state
  const [myFiles, setMyFiles] = useState([]);
  const [allSpecies, setAllSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Modal state
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [modalSpecies, setModalSpecies] = useState(null);
  const [modifyModal, setModifyModal] = useState({ open: false, file: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });
  
  // Modify modal form state
  const [newSpecies, setNewSpecies] = useState("");
  const [newCount, setNewCount] = useState("");
  const [tagChanges, setTagChanges] = useState({}); // { species: count } - new count or null to remove
  const [suggestedSpecies, setSuggestedSpecies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [countError, setCountError] = useState("");
  
  const speciesInputRef = useRef(null);

  // Fetch data on mount
  useEffect(() => {
    fetchMyFiles();
    fetchAllSpecies();
  }, []);

  const fetchMyFiles = async (isLoadMore = false) => {
    isLoadMore ? setLoadingMore(true) : setLoading(true);
    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    try {
      const offset = isLoadMore ? myFiles.length : 0;
      const res = await fetch(`${config.apiGateway.url}/my-media?userEmail=${encodeURIComponent(userInfo)}&limit=9&offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.myMedia && data.myMedia.items) {
        if (isLoadMore) {
          setMyFiles((prev) => [...prev, ...data.myMedia.items]);
        } else {
          setMyFiles(data.myMedia.items);
        }
        setTotal(data.myMedia.total);
        setHasMore(data.myMedia.hasMore);
      }
    } catch (err) {
      // Fetch error handled silently
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchAllSpecies = async () => {
    const idToken = localStorage.getItem("id_token");
    if (!idToken) return;

    try {
      const res = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ queryType: "listSpecies" }),
      });
      const data = await res.json();
      if (res.ok && data.species) {
        setAllSpecies(data.species);
      }
    } catch (err) {
      // Species fetch error handled silently
    }
  };

  const handleLoadMore = () => {
    fetchMyFiles(true);
  };

  // Media helpers (same as MyMedia page)
  const renderMediaPreview = (item) => {
    if (item.fileType === "image") {
      return (
        <img
          src={item.mediaUrl}
          alt="Bird media"
          className="feed-media-preview"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<div style="color:#666;padding:2rem;text-align:center;">Image failed to load</div>`;
          }}
        />
      );
    } else if (item.fileType === "audio") {
      return (
        <div className="feed-audio-preview">
          <div className="audio-icon">🎵</div>
          <audio controls className="w-100">
            <source src={item.fullSizeUrl} type="audio/wav" />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    } else if (item.fileType === "video") {
      return (
        <video controls className="feed-media-preview">
          <source src={item.mediaUrl} type="video/mp4" />
          Your browser does not support video playback.
        </video>
      );
    }
    return null;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Format date as "Jan 16, 2026" for dates older than 7 days
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const openSpeciesModal = (tags) => {
    setModalSpecies(tags);
    setShowSpeciesModal(true);
  };

  const closeSpeciesModal = () => {
    setShowSpeciesModal(false);
    setTimeout(() => setModalSpecies(null), 300);
  };

  const openMediaInNewTab = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Autocomplete for species (suggestions only, user can type anything)
  useEffect(() => {
    if (newSpecies.trim().length >= 2) {
      const trimmed = newSpecies.trim().toLowerCase();
      const matches = allSpecies.filter(s => {
        const existingSpecies = Object.keys(tagChanges);
        return s.toLowerCase().includes(trimmed) && 
               !existingSpecies.some(existing => existing.toLowerCase() === s.toLowerCase());
      });
      setSuggestedSpecies(matches.slice(0, 8));
    } else {
      setSuggestedSpecies([]);
    }
  }, [newSpecies, allSpecies, tagChanges]);

  // Modify Tags handlers
  const openModifyModal = (file) => {
    setModifyModal({ open: true, file });
    setNewSpecies("");
    setNewCount("");
    // Initialize tagChanges with existing tags
    setTagChanges({ ...file.tags });
  };

  const closeModifyModal = () => {
    setModifyModal({ open: false, file: null });
    setNewSpecies("");
    setNewCount("");
    setTagChanges({});
    setSuggestedSpecies([]);
    setCountError("");
  };

  const handleAddNewTag = () => {
    if (!newSpecies.trim() || !newCount) return;
    
    const count = parseInt(newCount);
    if (count <= 0) {
      setCountError("Count must be greater than 0");
      return;
    }
    
    setCountError("");
    const speciesName = newSpecies.trim();
    setTagChanges(prev => ({
      ...prev,
      [speciesName]: count
    }));
    setNewSpecies("");
    setNewCount("");
    setTimeout(() => speciesInputRef.current?.focus(), 0);
  };

  const handleUpdateTagCount = (species, value) => {
    const count = parseInt(value);
    
    if (value === "" || isNaN(count)) {
      setTagChanges(prev => ({
        ...prev,
        [species]: ""
      }));
      return;
    }
    
    if (count <= 0) {
      // Remove tag if count is 0 or negative
      setTagChanges(prev => {
        const updated = { ...prev };
        delete updated[species];
        return updated;
      });
      return;
    }
    
    setTagChanges(prev => ({
      ...prev,
      [species]: count
    }));
  };

  const handleRemoveTag = (species) => {
    setTagChanges(prev => {
      const updated = { ...prev };
      delete updated[species];
      return updated;
    });
  };

  const hasChanges = () => {
    const original = modifyModal.file?.tags || {};
    
    // Check if any tags were removed
    for (const species in original) {
      if (!tagChanges.hasOwnProperty(species)) return true;
    }
    
    // Check if any tags were added or counts changed
    for (const species in tagChanges) {
      if (!original.hasOwnProperty(species) || original[species] !== tagChanges[species]) {
        return true;
      }
    }
    
    return false;
  };
  
  const handleSubmitModify = async () => {
    if (!hasChanges()) return;
    
    setSubmitting(true);
    const file = modifyModal.file;
    
    try {
      // Build the final tags array for the API
      const tags = Object.entries(tagChanges).map(([species, count]) => `${species},${count}`);
      const url = file.mediaUrl;

      const idToken = localStorage.getItem("id_token");
      const res = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          queryType: "modifyTags",
          mode: "replace",
          url,
          tags,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        closeModifyModal();
        alert("✓ Species updated successfully!");
        setTimeout(() => fetchMyFiles(), 300);
      } else {
        alert("⚠ " + (data.message || "Failed to update species"));
      }
    } catch (err) {
      alert("⚠ Failed to update species");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const openDeleteModal = (file) => {
    setDeleteModal({ open: true, file });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, file: null });
  };

  const handleDeleteFile = async () => {
    if (!deleteModal.file) return;
    
    setSubmitting(true);
    try {
      const url = deleteModal.file.mediaUrl;
      const idToken = localStorage.getItem("id_token");
      
      const res = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          queryType: "deleteFiles",
          urls: [url],
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        closeDeleteModal();
        alert("✓ File deleted successfully!");
        setTimeout(() => fetchMyFiles(), 300);
      } else {
        alert("⚠ " + (data.message || "Failed to delete file"));
      }
    } catch (err) {
      alert("⚠ Failed to delete file");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="manage-files-container">
          <div className="manage-files-header">
            <h1 className="manage-files-title">Manage My Files</h1>
            <p className="manage-files-subtitle">
              Modify tags or delete your uploaded bird media files
            </p>
          </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your files...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && myFiles.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <h3 className="empty-state-title">No files found</h3>
            <p className="empty-state-message">You haven't uploaded any files yet.</p>
          </div>
        )}

        {/* Files Grid */}
        {!loading && myFiles.length > 0 && (
          <>
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <p className="text-muted mb-0">Your uploaded files with birds detected • Most recent first</p>
              <span className="text-muted">
                Showing {myFiles.length} of {total} items
              </span>
            </div>

            <div className="my-media-grid">
              {myFiles.map((item, index) => (
                <MediaCard
                  key={`${item.mediaId}-${index}`}
                  item={item}
                  renderMediaPreview={renderMediaPreview}
                  formatDate={formatDate}
                  onOpenSpeciesModal={openSpeciesModal}
                  onOpenMediaInNewTab={openMediaInNewTab}
                  hideUploadedBy={true}
                  extraActions={
                    <div className="card-extra-actions">
                      <button className="btn btn-primary" onClick={() => openModifyModal(item)}>
                        Edit Species
                      </button>
                      <button className="btn btn-danger" onClick={() => openDeleteModal(item)}>
                        Delete File
                      </button>
                    </div>
                  }
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-4">
                <button
                  className="btn btn-primary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Species Modal (same as MyMedia) */}
        {showSpeciesModal && modalSpecies && (
          <div className="modal-overlay" onClick={closeSpeciesModal}>
            <div className="modal-content modal-species" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">All Detected Species</h2>
                <button className="modal-close" onClick={closeSpeciesModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="species-full-list">
                  {Object.entries(modalSpecies).map(([species, count]) => (
                    <div key={species} className="species-full-item">
                      <span className="species-full-name">{species}</span>
                      <span className="species-full-count">{count} detected</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeSpeciesModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modify Tags Modal */}
        {modifyModal.open && (
          <div className="modal-overlay" onClick={closeModifyModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Species</h2>
                <button className="modal-close" onClick={closeModifyModal}>×</button>
              </div>
              <div className="modal-body">
                {/* Add New Species - TOP */}
                <div className="modal-section">
                  <label className="modal-label">Add New Species</label>
                  <div className="species-count-input-row">
                    <div className="species-input-wrapper">
                      <input
                        ref={speciesInputRef}
                        type="text"
                        className="form-control species-input"
                        placeholder="Type species name..."
                        value={newSpecies}
                        onChange={(e) => setNewSpecies(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCount) handleAddNewTag();
                        }}
                        onBlur={() => setTimeout(() => setSuggestedSpecies([]), 200)}
                      />
                      {suggestedSpecies.length > 0 && (
                        <div className="autocomplete-dropdown">
                          {suggestedSpecies.map((sp, idx) => (
                            <div
                              key={idx}
                              className="autocomplete-item"
                              onMouseDown={() => {
                                setNewSpecies(sp);
                                setSuggestedSpecies([]);
                                setTimeout(() => document.querySelector('.count-input')?.focus(), 0);
                              }}
                            >
                              {sp}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      className="form-control count-input"
                      placeholder="Count"
                      min="1"
                      value={newCount}
                      onChange={(e) => {
                        setNewCount(e.target.value);
                        setCountError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSpecies.trim()) handleAddNewTag();
                      }}
                    />
                    <button 
                      className="btn btn-success" 
                      onClick={handleAddNewTag}
                      disabled={!newSpecies.trim() || !newCount}
                    >
                      + Add
                    </button>
                  </div>
                  {countError && <small className="text-danger d-block mt-1">{countError}</small>}
                </div>

                <hr />

                {/* Existing Species - Edit or Remove */}
                <div className="modal-section">
                  <label className="modal-label">Detected Species (Edit count or click × to remove)</label>
                  {Object.keys(tagChanges).length > 0 ? (
                    <div className="tag-edit-list">
                      {Object.entries(tagChanges).map(([species, count]) => (
                        <div key={species} className="tag-edit-item">
                          <span className="tag-edit-name">{species}</span>
                          <input
                            type="number"
                            className="form-control tag-edit-count"
                            min="1"
                            value={count}
                            onChange={(e) => handleUpdateTagCount(species, e.target.value)}
                            placeholder="0 to remove"
                          />
                          <button 
                            className="tag-edit-remove" 
                            onClick={() => handleRemoveTag(species)}
                            title="Remove this species"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No species detected in this file</p>
                  )}
                  <small className="text-muted d-block mt-2">
                    💡 Type 0 or click × to remove a species
                  </small>
                </div>

                <hr />

                {/* Preview Section - Always Visible */}
                <div className="modal-section preview-section">
                  <label className="modal-label">Preview</label>
                  {hasChanges() ? (
                    <div className="preview-box">
                      <div className="preview-row">
                        <div className="preview-column">
                          <span className="preview-label">Current:</span>
                          <div className="preview-tags">
                            {Object.entries(modifyModal.file?.tags || {}).map(([sp, cnt]) => (
                              <span key={sp} className="preview-tag">{sp}: {cnt}</span>
                            ))}
                          </div>
                        </div>
                        <div className="preview-arrow">→</div>
                        <div className="preview-column">
                          <span className="preview-label">After changes:</span>
                          <div className="preview-tags">
                            {Object.keys(tagChanges).length === 0 ? (
                              <span className="preview-warning">⚠️ All species removed - file and its metadata will be permanently deleted</span>
                            ) : (
                              Object.entries(tagChanges).map(([sp, cnt]) => (
                                <span key={sp} className="preview-tag preview-tag-new">{sp}: {cnt}</span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted">No changes made yet</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModifyModal} disabled={submitting}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmitModify}
                  disabled={!hasChanges() || submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="modal-overlay" onClick={closeDeleteModal}>
            <div className="modal-content modal-delete" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Delete File</h2>
                <button className="modal-close" onClick={closeDeleteModal}>×</button>
              </div>

              <div className="modal-body">
                <div className="warning-box">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <h3 className="warning-title">This action is irreversible!</h3>
                    <p className="warning-message">
                      This will permanently delete the file from cloud storage and remove all metadata. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {deleteModal.file && (
                  <div className="delete-file-info">
                    <p><strong>File Type:</strong> {deleteModal.file.fileType}</p>
                    <p><strong>Species present in this file:</strong> {Object.entries(deleteModal.file.tags || {}).map(([sp, cnt]) => `${sp}: ${cnt}`).join(", ")}</p>
                    <p><strong>Total Birds Detected:</strong> {deleteModal.file.birdCount}</p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={closeDeleteModal} disabled={submitting}>
                  Cancel
                </button>
                <button 
                  className="btn-delete-confirm" 
                  onClick={handleDeleteFile}
                  disabled={submitting}
                >
                  {submitting ? "Deleting..." : "Yes, Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifyTags;
