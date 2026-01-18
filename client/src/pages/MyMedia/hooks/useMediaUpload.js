import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import config from "../../../config";
import { ALLOWED_EXTENSIONS, ERROR_MESSAGES, UPLOAD_DELAY } from "../constants";

/**
 * Custom hook to manage file uploads
 * @param {string} userInfo - User email/identifier
 * @param {Function} onUploadComplete - Callback when upload completes
 * @returns {Object} Upload state and control functions
 */
export const useMediaUpload = (userInfo, onUploadComplete) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Check if file extension is allowed
   */
  const isAllowedFile = (filename) => {
    const lower = filename.toLowerCase();
    return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  };

  /**
   * Handle file selection
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !isAllowedFile(selectedFile.name)) {
      alert(ERROR_MESSAGES.UNSUPPORTED_FILE);
      fileInputRef.current.value = "";
      return;
    }
    setFile(selectedFile);
  };

  /**
   * Reset upload form
   */
  const handleReset = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Upload file to S3
   */
  const handleUpload = async () => {
    if (!file) {
      alert(ERROR_MESSAGES.NO_FILE_SELECTED);
      return;
    }

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    const GET_PRESIGNED_API_URL = config.apiGateway.url + "/presignedurl";

    setIsUploading(true);

    try {
      const folder = "uploads";
      const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
      const uniqueFileName = `${uuidv4()}${fileExtension}`;

      // Get presigned URL
      const getUrlResponse = await fetch(GET_PRESIGNED_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          filename: uniqueFileName,
          originalFilename: file.name,
          contentType: file.type || "application/octet-stream",
          folder: folder,
          userEmail: userInfo
        }),
      });

      if (!getUrlResponse.ok) {
        const errorData = await getUrlResponse.json();
        throw new Error(errorData.message || ERROR_MESSAGES.PRESIGNED_URL_FAILED);
      }

      const { uploadUrl } = await getUrlResponse.json();

      // Upload to S3
      const s3UploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!s3UploadResponse.ok) {
        throw new Error(`${ERROR_MESSAGES.S3_UPLOAD_FAILED}: ${s3UploadResponse.statusText}`);
      }

      // Extract UUID for tracking
      const uploadUuid = uniqueFileName.split('.')[0];

      // Keep loader visible and notify parent to start tracking
      // Loader will be hidden by parent once file appears in processing
      if (onUploadComplete) {
        onUploadComplete(uploadUuid);
      }

    } catch (error) {
      console.error("Upload error:", error);
      alert(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${error.message}`);
      setIsUploading(false);
    }
  };

  return {
    file,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleReset,
    handleUpload,
    setIsUploading // Export so parent can control loader
  };
};
