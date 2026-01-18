import toast from "react-hot-toast";
import { SUCCESS_MESSAGES, TOAST_DURATION } from "../constants";

/**
 * Displays a success toast notification when file processing completes
 * @param {Object} params - Toast parameters
 * @param {string} params.filename - Name of the processed file
 * @param {number} params.speciesCount - Number of species detected
 * @param {number} params.birdCount - Total number of birds detected
 */
export const showProcessingCompleteToast = ({ filename, speciesCount, birdCount }) => {
  toast.success(
    (t) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#059669' }}>
            {SUCCESS_MESSAGES.PROCESSING_COMPLETE}
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: '6px', wordBreak: 'break-word' }}>
            <strong>{filename || 'File'}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {speciesCount} species found • Total of {birdCount} bird{birdCount !== 1 ? 's' : ''} detected
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '6px' }}>
            → Check My Media tab
          </div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    ),
    { duration: TOAST_DURATION }
  );
};

/**
 * Displays an error toast notification when file processing fails
 * @param {Object} params - Toast parameters
 * @param {string} params.filename - Name of the failed file
 * @param {string} params.errorMessage - Error message describing the failure
 */
export const showProcessingFailedToast = ({ filename, errorMessage }) => {
  toast.error(
    (t) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#dc2626' }}>
            {SUCCESS_MESSAGES.PROCESSING_FAILED}
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: '6px', wordBreak: 'break-word' }}>
            <strong>{filename || 'File'}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {errorMessage || 'Processing failed'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '6px' }}>
            → Check Failed Files tab
          </div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    ),
    { duration: TOAST_DURATION }
  );
};
