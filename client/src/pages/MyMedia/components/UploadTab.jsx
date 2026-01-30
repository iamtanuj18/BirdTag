import PropTypes from 'prop-types';
import { UI_TEXT } from '../constants';

/**
 * Tab component for file upload form
 */
const UploadTab = ({
  file,
  isUploading,
  fileInputRef,
  onFileChange,
  onUpload,
  onReset
}) => {
  return (
    <div className="tab-content">
      <div className="upload-form">
        {isUploading && (
          <div className="upload-overlay">
            <div className="upload-overlay-content">
              <div className="upload-spinner"></div>
              <p className="upload-overlay-text">Uploading, please wait...</p>
            </div>
          </div>
        )}
        
        <h3>Upload New File</h3>
        <p className="upload-subtitle" style={{ marginBottom: "1.5rem" }}>
          Upload images, videos, or audio files for species identification. Processing may take up to 3 minutes.
        </p>
        
        <div className="form-group">
          <label>Select File</label>
          <div className="file-input-wrapper">
            <input 
              type="file" 
              onChange={onFileChange} 
              ref={fileInputRef}
              disabled={isUploading}
            />
          </div>
          {file && (
            <div className="file-info">
              📎 Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <div className="upload-actions">
          <button
            className="btn-primary"
            onClick={onUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? UI_TEXT.UPLOADING : UI_TEXT.UPLOAD_FILE}
          </button>
          <button
            className="btn-secondary"
            onClick={onReset}
            disabled={isUploading}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

UploadTab.propTypes = {
  file: PropTypes.object,
  isUploading: PropTypes.bool.isRequired,
  fileInputRef: PropTypes.object.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};

UploadTab.defaultProps = {
  file: null
};

export default UploadTab;
