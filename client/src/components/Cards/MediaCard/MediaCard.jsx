import PropTypes from 'prop-types';
import './MediaCard.css';

const MediaCard = ({ 
  item, 
  renderMediaPreview, 
  formatDate, 
  onOpenSpeciesModal, 
  onOpenMediaInNewTab,
  hideUploadedBy 
}) => {
  // Convert tags object to array: { "Species Name": count } => [{ name: "Species Name", count: count }]
  const tagsArray = item.tags ? Object.entries(item.tags).map(([name, count]) => ({ name, count })) : [];
  const displayedTags = tagsArray.slice(0, 2);
  const hasMoreTags = tagsArray.length > 2;

  return (
    <div className="media-card">
      {/* Media Preview */}
      <div className="media-preview-container">
        {renderMediaPreview(item)}
      </div>

      {/* Card Content */}
      <div className="media-card-content">
        {/* Species Section */}
        {tagsArray.length > 0 && (
          <div className="media-species-section">
            <div className="species-header-row">
              <span className="species-label">SPECIES DETECTED:</span>
              <span className="species-total">{tagsArray.length}</span>
            </div>
            
            <div className="species-list">
              {displayedTags.map((tag, index) => (
                <div key={index} className="species-item">
                  <span className="species-name">{tag.name}</span>
                  <span className="species-count">{tag.count} detected</span>
                </div>
              ))}
            </div>

            {hasMoreTags && (
              <button 
                className="view-all-species"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSpeciesModal(item.tags);
                }}
              >
                View All ({tagsArray.length} species)
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="media-card-divider"></div>

        {/* Uploader Info */}
        {!hideUploadedBy && item.uploadedBy && (
          <div className="media-info-row">
            <span className="media-info-label">Uploaded by:</span>
            <span className="media-info-value media-info-link">{item.uploadedBy}</span>
          </div>
        )}

        {/* Timestamp */}
        {item.uploadedAt && (
          <div className="media-info-row">
            <span className="media-info-label">Uploaded:</span>
            <span className="media-info-value">{formatDate(item.uploadedAt)}</span>
          </div>
        )}

        {/* Open Button */}
        <button 
          className="media-open-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMediaInNewTab(item.fullSizeUrl || item.mediaUrl);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
          Open in New Tab
        </button>
      </div>
    </div>
  );
};

MediaCard.propTypes = {
  item: PropTypes.shape({
    mediaId: PropTypes.string,
    mediaUrl: PropTypes.string,
    fullSizeUrl: PropTypes.string,
    fileType: PropTypes.string,
    uploadedBy: PropTypes.string,
    uploadedAt: PropTypes.number,
    tags: PropTypes.objectOf(PropTypes.number), // Object with species names as keys and counts as values
    birdCount: PropTypes.number,
  }).isRequired,
  renderMediaPreview: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  onOpenSpeciesModal: PropTypes.func.isRequired,
  onOpenMediaInNewTab: PropTypes.func.isRequired,
  hideUploadedBy: PropTypes.bool,
};

MediaCard.defaultProps = {
  hideUploadedBy: false,
};

export default MediaCard;
