import { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import config from "../../config";
import { MediaCard } from "../../components/Cards";
import "./HomePage.css";

const HomePage = () => {
  const { idToken, userInfo } = useAuth();
  const [homeItems, setHomeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [modalSpecies, setModalSpecies] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const ITEMS_PER_PAGE = 9;

  // Fetch initial home data
  useEffect(() => {
    fetchHomeData(0);
  }, []);

  const fetchHomeData = async (offset) => {
    const isLoadingMore = offset > 0;
    isLoadingMore ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${config.apiGateway.url}/feed?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch home data: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        if (isLoadingMore) {
          setHomeItems((prev) => [...prev, ...data.items]);
        } else {
          setHomeItems(data.items);
        }
        setHasMore(data.hasMore);
        setTotal(data.total);
      } else {
        throw new Error(data.message || "Failed to load home data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchHomeData(homeItems.length);
  };

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

  const openSpeciesModal = (tags) => {
    setModalSpecies(tags);
    setShowModal(true);
  };

  const closeSpeciesModal = () => {
    setShowModal(false);
    setTimeout(() => setModalSpecies(null), 300);
  };

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
            e.target.parentElement.innerHTML = '<div style="color:#666;padding:2rem;text-align:center;">Image failed to load</div>';
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
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="mb-4">
          <h2 className="feed-page-title">Welcome back, {userInfo}!</h2>
          <p className="text-muted mb-0">Loading community file uploads...</p>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="mb-4">
          <h2 className="feed-page-title">Welcome back, {userInfo}!</h2>
          <p className="text-muted mb-0">Community file uploads</p>
        </div>
        <div className="alert alert-danger" role="alert">
          <strong>Unable to load content</strong>
          <p className="mb-0 mt-2">We couldn't fetch content at the moment. Please try refreshing the page or logging out and back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="mb-4">
        <h2 className="feed-page-title mb-3">Welcome back, {userInfo}!</h2>
        <div className="d-flex justify-content-between align-items-center">
          <p className="text-muted mb-0">Community file uploads • Most recent first</p>
          <span className="text-muted">
            Showing {homeItems.length} of {total} items
          </span>
        </div>
      </div>

      {homeItems.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">No media files uploaded by any user yet. Upload some media to get started!</p>
        </div>
      ) : (
        <>
          <div className="feed-grid">
            {homeItems.map((item, index) => (
              <MediaCard
                key={`${item.mediaId}-${index}`}
                item={item}
                renderMediaPreview={renderMediaPreview}
                formatDate={formatDate}
                onOpenSpeciesModal={openSpeciesModal}
                onOpenMediaInNewTab={openMediaInNewTab}
              />
            ))}
          </div>

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
          )}

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
    </div>
  );
};

export default HomePage;
