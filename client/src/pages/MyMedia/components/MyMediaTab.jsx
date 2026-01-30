import PropTypes from 'prop-types';
import MediaCard from '../../../components/Cards/MediaCard/MediaCard.jsx';
import { UI_TEXT } from '../constants';

/**
 * Tab component for displaying user's media files
 */
const MyMediaTab = ({ 
  loading, 
  error, 
  items, 
  total, 
  hasMore, 
  loadingMore,
  renderMediaPreview,
  formatDate,
  onOpenSpeciesModal,
  onOpenMediaInNewTab,
  onLoadMore,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="tab-content">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{UI_TEXT.LOADING}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>{UI_TEXT.ERROR_LOADING_TITLE}</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={onRetry}>
            {UI_TEXT.RETRY}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>{UI_TEXT.NO_MEDIA_TITLE}</h3>
          <p>{UI_TEXT.NO_MEDIA_DESCRIPTION}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-muted mb-0">Your uploaded files with birds detected • Most recent first</p>
        <span className="text-muted">
          Showing {items.length} of {total} items
        </span>
      </div>

      <div className="my-media-grid">
        {items.map((item, index) => (
          <MediaCard
            key={`${item.mediaId}-${index}`}
            item={item}
            renderMediaPreview={renderMediaPreview}
            formatDate={formatDate}
            onOpenSpeciesModal={onOpenSpeciesModal}
            onOpenMediaInNewTab={onOpenMediaInNewTab}
            hideUploadedBy={true}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="btn btn-primary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {UI_TEXT.LOADING}
              </>
            ) : (
              UI_TEXT.LOAD_MORE
            )}
          </button>
        </div>
      )}
    </div>
  );
};

MyMediaTab.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  items: PropTypes.array.isRequired,
  total: PropTypes.number.isRequired,
  hasMore: PropTypes.bool.isRequired,
  loadingMore: PropTypes.bool.isRequired,
  renderMediaPreview: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  onOpenSpeciesModal: PropTypes.func.isRequired,
  onOpenMediaInNewTab: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired
};

MyMediaTab.defaultProps = {
  error: null
};

export default MyMediaTab;
