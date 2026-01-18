import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../config.js";
import { MediaCard } from "../../components/Cards";
import "./FindByTag.css";

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
            Authorization: idToken,
          },
          body: JSON.stringify({ queryType: "listSpecies" }),
        });
        const data = await res.json();
        if (res.ok && data.species) {
          setAllSpecies(data.species);
        } else {
          console.warn("Could not fetch species list:", data.message);
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
        (s) => s.toLowerCase().includes(trimmed) && 
             !savedPairs.some(pair => pair.species === s)
      );
      setSuggestedSpecies(matches.slice(0, 8));
    } else {
      setSuggestedSpecies([]);
    }
  }, [birdSpecies, allSpecies, savedPairs]);

  const handleAdd = () => {
    const trimmedSpecies = birdSpecies.trim();
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
    if (savedPairs.length === 0) return;

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
      const tags = savedPairs.reduce((acc, pair) => {
        acc[pair.species] = pair.count;
        return acc;
      }, {});
      
      const offset = isLoadMore ? searchResults.length : 0;
      
      const response = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
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
              onClick={handleAdd}
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
            onClick={handleSubmit}
            disabled={savedPairs.length === 0 || loading}
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
          {savedPairs.length > 0 && (
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
            No files match your exact count requirements. Try reducing the minimum counts or removing some species requirements.
          </p>
        </div>
      )}
    </div>
  );
};

export default FindByTag;