import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../config.js";
import { MediaCard } from "../../components/Cards";
import "./FindByBird.css";

const FindByBird = () => {
  const navigate = useNavigate();
  
  // Form state
  const [birdSpecies, setBirdSpecies] = useState("");
  const [savedBirds, setSavedBirds] = useState([]);
  const [matchMode, setMatchMode] = useState("OR"); // OR or AND
  
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
  
  const inputRef = useRef(null);

  const ITEMS_PER_PAGE = 9;

  // Fetch all species on mount
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
            Authorization: idToken,
          },
          body: JSON.stringify({ queryType: "listSpecies" }),
        });
        const data = await res.json();
        if (res.ok && data.species) {
          setAllSpecies(data.species);
        }
      } catch (err) {
        console.error("Error fetching species list:", err);
      }
    };
    fetchSpecies();
  }, [navigate]);

  // Autocomplete filtering
  useEffect(() => {
    const trimmed = birdSpecies.trim().toLowerCase();
    if (trimmed.length >= 2) {
      const matches = allSpecies.filter(
        (s) => s.toLowerCase().includes(trimmed) && !savedBirds.includes(s)
      );
      setSuggestedSpecies(matches.slice(0, 8));
    } else {
      setSuggestedSpecies([]);
    }
  }, [birdSpecies, allSpecies, savedBirds]);

  // Handlers
  const handleAdd = () => {
    const trimmed = birdSpecies.trim();
    if (!trimmed) {
      alert("Please enter a species name");
      return;
    }
    if (savedBirds.includes(trimmed)) {
      alert("This species is already added");
      return;
    }
    setSavedBirds([...savedBirds, trimmed]);
    setBirdSpecies("");
    setSuggestedSpecies([]);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemoveSpecies = (species) => {
    setSavedBirds(savedBirds.filter(s => s !== species));
  };

  const handleClear = () => {
    setSavedBirds([]);
    setBirdSpecies("");
    setSearchResults([]);
    setSuggestedSpecies([]);
    setMatchMode("OR");
    setTotal(0);
    setHasMore(false);
    setSearchAttempted(false);
  };

  const handleSubmit = async (isLoadMore = false) => {
    if (savedBirds.length === 0) return;

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    isLoadMore ? setLoadingMore(true) : setLoading(true);
    if (!isLoadMore) {
      setSearchResults([]);
      setSearchAttempted(true);
    }

    try {
      const offset = isLoadMore ? searchResults.length : 0;
      
      const response = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          queryType: "bySpecies",
          species: savedBirds,
          matchMode: matchMode,
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
      console.error("Search failed:", err);
      alert(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    handleSubmit(true);
  };

  return (
    <div className="species-browser-container">
      {/* Header */}
      <div className="species-browser-header">
        <h1 className="species-browser-title">Search All Community Files by Bird Name</h1>
        <p className="species-browser-subtitle">
          Find all photos, videos, and audio files uploaded by any user that contain your selected bird species
        </p>
      </div>

      {/* Search Configuration Card */}
      <div className="search-config-card">
        {/* Species Input Section */}
        <div className="search-section">
          <label className="search-label">Select Species</label>
          <div className="species-input-row">
            <div className="species-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="species-input"
                placeholder="Type species name (e.g., Kingfisher)..."
                value={birdSpecies}
                onChange={(e) => setBirdSpecies(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
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
                        setTimeout(() => handleAdd(), 0);
                      }}
                    >
                      {sp}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              className="btn-add-species" 
              onClick={handleAdd}
              disabled={!birdSpecies.trim()}
            >
              + Add Species
            </button>
          </div>
        </div>

        {/* Selected Species */}
        <div className="search-section">
          <label className="search-label">
            Selected Species {savedBirds.length > 0 && `(${savedBirds.length})`}
          </label>
          <div className={`selected-species-container ${savedBirds.length > 0 ? 'has-species' : ''}`}>
            {savedBirds.length === 0 ? (
              <span className="empty-species-message">No species selected yet</span>
            ) : (
              savedBirds.map((bird, i) => (
                <div key={i} className="species-chip">
                  <span>{bird}</span>
                  <button 
                    className="chip-remove" 
                    onClick={() => handleRemoveSpecies(bird)}
                    aria-label={`Remove ${bird}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Match Mode Section */}
        <div className="search-section match-mode-section">
          <label className="search-label">Match Mode</label>
          <div className="match-mode-options">
            <label 
              className={`match-mode-option ${matchMode === "OR" ? "active" : ""}`}
              htmlFor="mode-or"
            >
              <input
                id="mode-or"
                type="radio"
                className="match-mode-radio"
                name="matchMode"
                value="OR"
                checked={matchMode === "OR"}
                onChange={(e) => setMatchMode(e.target.value)}
              />
              <div className="match-mode-content">
                <span className="match-mode-label">Any Species (OR)</span>
                <span className="match-mode-description">
                  Shows files with at least one selected species. Example: "Parrot OR Peacock" returns files with Parrot, Peacock, or both (plus any other species)
                </span>
              </div>
            </label>
            
            <label 
              className={`match-mode-option ${matchMode === "AND" ? "active" : ""}`}
              htmlFor="mode-and"
            >
              <input
                id="mode-and"
                type="radio"
                className="match-mode-radio"
                name="matchMode"
                value="AND"
                checked={matchMode === "AND"}
                onChange={(e) => setMatchMode(e.target.value)}
              />
              <div className="match-mode-content">
                <span className="match-mode-label">All Species (AND)</span>
                <span className="match-mode-description">
                  Shows only files with ALL selected species together. Example: "Parrot AND Peacock" returns only files containing both (plus any other species)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="search-actions">
          <button 
            className="btn-search" 
            onClick={handleSubmit}
            disabled={savedBirds.length === 0 || loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                Searching...
              </>
            ) : (
              'Search Media'
            )}
          </button>
          {savedBirds.length > 0 && (
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
                  fileType: item.fileType,
                  tags: item.tags,
                  uploadedBy: item.uploadedBy,
                  uploadedAt: item.uploadedAt
                }}
                onViewSpecies={() => {}}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-search"
                style={{ maxWidth: '300px', margin: '0 auto' }}
              >
                {loadingMore ? 'Loading...' : `Load More (${total - searchResults.length} remaining)`}
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
            No community files match your search. Try different species or switch to OR mode for broader results across all user uploads.
          </p>
        </div>
      )}
    </div>
  );
};

export default FindByBird;
