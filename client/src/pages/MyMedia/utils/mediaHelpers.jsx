import { ERROR_MESSAGES } from '../constants';

/**
 * Utility function to format timestamp as relative time
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Opens URL in new tab with security headers
 * @param {string} url - URL to open
 */
export const openMediaInNewTab = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Renders media preview based on file type
 * @param {Object} item - Media item object
 * @returns {JSX.Element} Rendered media element
 */
export const renderMediaPreview = (item) => {
  if (item.fileType === "image") {
    return (
      <img
        src={item.mediaUrl}
        alt="Bird media"
        className="feed-media-preview"
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<div style="color:#666;padding:2rem;text-align:center;">${ERROR_MESSAGES.IMAGE_LOAD_FAILED}</div>`;
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
