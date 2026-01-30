import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../config.js";
import { MediaCard } from "../../components/Cards";
import "./FindByTag.css";

// Helper functions for MediaCard
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
  
  // Format date as "Jan 16, 2026" for dates older than 7 days
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

const FindByTag = () => {
  const navigate = useNavigate();
  
  // Form state
  const [birdSpecies, setBirdSpecies] = useState("");
  const [count, setCount] = useState("");
  const [savedPairs, setSavedPairs] = useState([]);
  
  // Data state
  const [allSpecies, setAllSpecies] = useState([]);
  const [suggestedSpecies, setSuggestedSpecies] = useState([]);
  
  // Results state
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // Species modal state
  const [modalSpecies, setModalSpecies] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const inputRef = useRef(null);

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    const fetchSpecies = async () => {
      const idToken = localStorage.getItem("id_token");
      if (!idToken) {
        navigate("/");
        return;
      }
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
        // Species list fetch error handled silently
      }
    };
    fetchSpecies();
  }, [navigate]);

  // Autocomplete filtering
  useEffect(() => {
    const trimmed = birdSpecies.trim().toLowerCase();
    if (trimmed.length >= 2) {
      const matches = allSpecies.filter(
        (s) => s.toLowerCase().includes(trimmed) && 
             !savedPairs.some(pair => pair.species === s)
      );
      setSuggestedSpecies(matches.slice(0, 8));
    } else {
      setSuggestedSpecies([]);
    }
  }, [birdSpecies, allSpecies, savedPairs]);

  const handleAdd = (speciesName = null) => {
    const trimmedSpecies = (speciesName || birdSpecies).trim();
    const parsedCount = parseInt(count, 10);
    
    if (!trimmedSpecies) {
      alert("Please enter a species name");
      return;
    }
    if (!count) {
      alert("Please enter a minimum count");
      return;
    }
    if (isNaN(parsedCount)) {
      alert("Count must be a valid number");
      return;
    }
    if (parsedCount < 1) {
      alert("Count must be at least 1 (zero and negative numbers are not allowed)");
      return;
    }
    
    const existingIndex = savedPairs.findIndex(
      (pair) => pair.species.toLowerCase() === trimmedSpecies.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      const updated = [...savedPairs];
      updated[existingIndex] = { species: trimmedSpecies, count: parsedCount };
      setSavedPairs(updated);
    } else {
      setSavedPairs([...savedPairs, { species: trimmedSpecies, count: parsedCount }]);
    }
    
    setBirdSpecies("");
    setCount("");
    setSuggestedSpecies([]);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemovePair = (species) => {
    setSavedPairs(savedPairs.filter(p => p.species !== species));
  };

  const openSpeciesModal = (tags) => {
    setModalSpecies(tags);
    setShowModal(true);
  };

  const closeSpeciesModal = () => {
    setShowModal(false);
    setTimeout(() => setModalSpecies(null), 300);
  };

  const handleClear = () => {
    setSavedPairs([]);
    setBirdSpecies("");
    setCount("");
    setSearchResults([]);
    setSuggestedSpecies([]);
    setTotal(0);
    setHasMore(false);
    setSearchAttempted(false);
  };

  const handleSubmit = async (isLoadMore = false) => {
    if (savedPairs.length === 0) {
      alert("Please add at least one species with minimum count");
      return;
    }

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    isLoadMore ? setLoadingMore(true) : setLoading(true);
    
    // Clear previous results when starting a new search (not load more)
    if (!isLoadMore) {
      setSearchResults([]);
      setSearchAttempted(true);
      setTotal(0);
      setHasMore(false);
    }

    try {
      const tags = savedPairs.reduce((acc, pair) => {
        acc[pair.species] = pair.count;
        return acc;
      }, {});
      
      const offset = isLoadMore ? searchResults.length : 0;
      
      const response = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          queryType: "byTags",
          tags: tags,
          limit: ITEMS_PER_PAGE,
          offset: offset,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const items = data.items || [];
        
        if (isLoadMore) {
          setSearchResults((prev) => [...prev, ...items]);
        } else {
          setSearchResults(items);
        }
        
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
        
        // Auto-scroll to results on first search
        if (!isLoadMore) {
          setTimeout(() => {
            document.getElementById('search-results')?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100);
        }
      } else {
        throw new Error(data.message || "Search failed");
      }
    } catch (err) {
      alert(`Search failed: ${err.message}`);
      // Set empty results to show "No results found" message
      if (!isLoadMore) {
        setSearchResults([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    handleSubmit(true);
  };

  return (
    <div className="tag-search-container">
      {/* Header */}
      <div className="tag-search-header">
        <h1 className="tag-search-title">Search by Species & Minimum Count</h1>
        <p className="tag-search-subtitle">
          Find files that contain specific bird species with minimum counts. Example: "Robin: 2, Sparrow: 1" finds files with at least 2 Robins AND at least 1 Sparrow (may contain other species too)
        </p>
      </div>

      {/* Search Configuration Card */}
      <div className="search-config-card">
        {/* Species & Count Input Section */}
        <div className="search-section">
          <label className="search-label">Add Species with Minimum Count</label>
          <div className="species-count-input-row">
            <div className="species-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="species-input"
                placeholder="Type species name (e.g., Kingfisher)..."
                value={birdSpecies}
                onChange={(e) => setBirdSpecies(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && count) handleAdd();
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
                        setBirdSpecies(sp);
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
              className="count-input"
              placeholder="Min count"
              min="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && birdSpecies.trim()) handleAdd();
              }}
            />
            <button 
              className="btn-add-species" 
              onClick={() => handleAdd()}
              disabled={!birdSpecies.trim() || !count}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Selected Species Pairs */}
        <div className="search-section">
          <label className="search-label">
            Selected Requirements {savedPairs.length > 0 && `(${savedPairs.length})`}
          </label>
          <div className={`selected-species-container ${savedPairs.length > 0 ? 'has-species' : ''}`}>
            {savedPairs.length === 0 ? (
              <span className="empty-species-message">No species requirements added yet</span>
            ) : (
              savedPairs.map((pair, i) => (
                <div key={i} className="species-chip">
                  <span className="chip-species">{pair.species}</span>
                  <span className="chip-count">≥ {pair.count}</span>
                  <button 
                    className="chip-remove" 
                    onClick={() => handleRemovePair(pair.species)}
                    aria-label={`Remove ${pair.species}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="search-actions">
          <button 
            className="btn-search" 
            onClick={() => handleSubmit(false)}
            disabled={savedPairs.length === 0 || loading}
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
                Searching...
              </>
            ) : (
              'Search Media'
            )}
          </button>
          {savedPairs.length > 0 && !loading && (
            <button className="btn-clear" onClick={handleClear}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <div id="search-results" className="results-section">
          <div className="results-header">
            <h2 className="results-title">
              Search Results
              {total > 0 && (
                <span className="results-count"> ({total} file{total !== 1 ? 's' : ''})</span>
              )}
            </h2>
          </div>

          <div className="feed-grid">
            {searchResults.map((item, i) => (
              <MediaCard
                key={`${item.mediaId}-${i}`}
                item={{
                  thumbUrl: item.mediaUrl,
                  s3Url: item.fullSizeUrl,
                  mediaUrl: item.mediaUrl,
                  fullSizeUrl: item.fullSizeUrl,
                  fileType: item.fileType,
                  tags: item.tags,
                  uploadedBy: item.uploadedBy,
                  uploadedAt: item.uploadedAt
                }}
                renderMediaPreview={renderMediaPreview}
                formatDate={formatDate}
                onOpenSpeciesModal={() => openSpeciesModal(item.tags)}
                onOpenMediaInNewTab={() => openMediaInNewTab(item.fullSizeUrl)}
                hideUploadedBy={false}
              />
            ))}
          </div>

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
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      {searchResults.length === 0 && !loading && searchAttempted && (
        <div id="search-results" className="empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No Results Found</h3>
          <p className="empty-state-message">
            No files match your exact count requirements. Try reducing the minimum counts or removing some species requirements.
          </p>
        </div>
      )}
      {/* Species Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" onClick={closeSpeciesModal}></div>
          <div 
            className="modal fade show" 
            style={{ display: 'block' }}
            tabIndex={-1}
            aria-labelledby="speciesModalLabel" 
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="speciesModalLabel">
                    Species Detected: {modalSpecies ? Object.keys(modalSpecies).length : 0}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeSpeciesModal} aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  {modalSpecies && Object.entries(modalSpecies).map(([species, count]) => (
                    <div key={species} className="modal-species-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="species-name">{species}</span>
                        <span className="species-count">{count} detected</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeSpeciesModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}    </div>
  );
};

export default FindByTag;