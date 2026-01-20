import PropTypes from 'prop-types';
import { UI_TEXT } from '../constants';

/**
 * Tab component for displaying files currently being processed
 */
const ProcessingTab = ({
  files,
  renderMediaPreview,
  formatDate
}) => {
  if (files.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>{UI_TEXT.NO_PROCESSING_TITLE}</h3>
          <p>{UI_TEXT.NO_PROCESSING_DESCRIPTION}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="processing-info-banner">
        <span className="processing-info-icon">ℹ️</span>
        <span className="processing-info-text">
          It may take up to 3-5 minutes for the system to process the files, detect bird species, and save metadata.
        </span>
      </div>
      <div className="my-media-grid">
        {files.map(file => (
          <div key={file.mediaId} className="card feed-card">
            <div className="feed-card-media">
              {renderMediaPreview(file)}
              <div className="processing-overlay">
                <div className="processing-spinner"></div>
                <span className="processing-text">Detecting Birds...</span>
                <button 
                  className="preview-media-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.fullSizeUrl, '_blank');
                  }}
                >
                  Preview File
                </button>
              </div>
            </div>
            <div className="card-body feed-card-body">
              <div className="feed-meta-section">
                <div className="feed-meta-row">
                  <span className="feed-meta-label">File:</span>
                  <span className="feed-meta-value" style={{fontSize: '0.85rem', wordBreak: 'break-all'}}>
                    {file.filename}
                  </span>
                </div>
                <div className="feed-meta-row">
                  <span className="feed-meta-label">Uploaded:</span>
                  <span className="feed-meta-value">{formatDate(file.uploadedAt)}</span>
                </div>
                <div className="feed-meta-row" style={{marginTop: '0.5rem'}}>
                  <span style={{color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: '500'}}>
                    Analyzing for species identification...
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

ProcessingTab.propTypes = {
  files: PropTypes.array.isRequired,
  renderMediaPreview: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired
};

export default ProcessingTab;
