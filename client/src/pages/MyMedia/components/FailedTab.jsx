import PropTypes from 'prop-types';
import { UI_TEXT } from '../constants';

/**
 * Tab component for displaying failed file uploads
 */
const FailedTab = ({
  files,
  renderMediaPreview,
  formatDate
}) => {
  if (files.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>{UI_TEXT.NO_FAILED_TITLE}</h3>
          <p>{UI_TEXT.NO_FAILED_DESCRIPTION}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="my-media-grid">
        {files.map(file => (
          <div key={file.mediaId} className="card feed-card">
            <div className="feed-card-media">
              {renderMediaPreview(file)}
              <div className="failed-overlay">
                <div className="failed-status-text">FAILED</div>
                <button 
                  className="preview-media-button failed-preview-button"
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
                  <span className="feed-meta-label">Filename:</span>
                  <span className="feed-meta-value" style={{fontSize: '0.85rem', wordBreak: 'break-all'}}>
                    {file.filename}
                  </span>
                </div>
                <div className="feed-meta-row">
                  <span className="feed-meta-label">Uploaded:</span>
                  <span className="feed-meta-value">{formatDate(file.uploadedAt)}</span>
                </div>
                <div className="feed-meta-row" style={{
                  marginTop: '0.5rem', 
                  padding: '0.75rem', 
                  background: 'var(--color-error-light)', 
                  borderRadius: 'var(--radius-sm)', 
                  borderLeft: '3px solid var(--color-error)'
                }}>
                  <span style={{color: 'var(--color-error)', fontSize: '0.9rem'}}>
                    {(file.errorMessage || file.status).replace(/media$/i, 'media file')}
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

FailedTab.propTypes = {
  files: PropTypes.array.isRequired,
  renderMediaPreview: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired
};

export default FailedTab;
