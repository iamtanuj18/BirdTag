import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import config from "../config.js";

const allowedExtensions = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"];

const UploadFile = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [logs, setLogs] = useState([]);
  const [pollingData, setPollingData] = useState(null);
  const [mediaId, setMediaId] = useState(null);
  const fileInputRef = useRef(null);
  const pollingInterval = useRef(null);

  const logMessage = (msg) => {
    setLogs((prev) => [...prev, msg]);
  };

  const isAllowedFile = (filename) => {
    const lower = filename.toLowerCase();
    return allowedExtensions.some(ext => lower.endsWith(ext));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !isAllowedFile(selectedFile.name)) {
      alert("Unsupported file type. Allowed types: image, video, audio only");
      fileInputRef.current.value = "";
      return;
    }
    setFile(selectedFile);
    setLogs([]);
    setUploadComplete(false);
    setPollingData(null);
    setMediaId(null);
  };

  const handleReset = () => {
    setFile(null);
    setLogs([]);
    setUploadComplete(false);
    setPollingData(null);
    setMediaId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a valid file to upload.");
      return;
    }

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }
    const GET_PRESIGNED_API_URL = config.apiGateway.url + "/presignedurl";
    const TAGGER_POLLING_API_URL = config.apiGateway.url + "/tagger_polling";

    setIsUploading(true);
    setLogs(["🚀 Starting upload process..."]);

    try {
      logMessage("📡 Requesting presigned S3 URL...");
      const folder = "uploads";
      const uniqueFileName = `${uuidv4()}-${file.name}`;

      const getUrlResponse = await fetch(GET_PRESIGNED_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          filename: uniqueFileName,
          contentType: file.type || "application/octet-stream",
          folder: folder
        }),
      });

      if (!getUrlResponse.ok) {
        const errorData = await getUrlResponse.json();
        throw new Error(errorData.message || `Failed to get presigned URL`);
      }

      const { s3Key, uploadUrl } = await getUrlResponse.json();
      print(s3Key,uploadUrl);
      setMediaId(s3Key);
      logMessage(`✅ Got upload URL. Uploading to S3...`);

      const s3UploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!s3UploadResponse.ok) {
        throw new Error(`❌ Upload to S3 failed: ${s3UploadResponse.statusText}`);
      }

      logMessage("📤 File uploaded to S3. Tagging lambda Triggered");
      startPolling(TAGGER_POLLING_API_URL, s3Key);
      logMessage("📤 Waiting lambda to process........");

    } catch (error) {
      console.error("Upload error:", error);
      logMessage(`❌ Upload failed: ${error.message}`);
      setIsUploading(false);
    }
  };

  const startPolling = (url, s3Key) => {
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${url}?mediaId=${encodeURIComponent(s3Key)}`);
        const data = await res.json();

        if (data.status && ["success", "no_bird", "unsupported_file", "error"].includes(data.status)) {
          clearInterval(pollingInterval.current);
          setPollingData(data);
          setLogs((prev) => [...prev, `✅ Status: ${data.status}`]);
          setIsUploading(false);
          setUploadComplete(true);
        } else {
          logMessage("⏳ Still processing...");
        }
      } catch (e) {
        clearInterval(pollingInterval.current);
        logMessage(`❌ Polling failed: ${e.message}`);
        setIsUploading(false);
      }
    }, 3000);
  };

  const renderPollingData = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    const linkRegex = /(https?:\/\/[^\s"']+)/g;
    return json.split("\n").map((line, i) => (
      <div key={i}>
        {line.split(linkRegex).map((part, j) =>
          linkRegex.test(part) ? (
            <a key={j} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "blue" }}>{part}</a>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </div>
    ));
  };

  return (
    <div style={{ padding: "30px", textAlign: "center", color: "black" }}>
    <h4>Please note that entire process may take upto 3 minutes...</h4>
    {!isUploading && !uploadComplete && (
        <>
          <h2 style={{ marginBottom: "20px" }}>Upload a File</h2>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <label>
              Select File:
              <input type="file" onChange={handleFileChange} ref={fileInputRef} />
            </label>
            <button
              onClick={handleUpload}
              disabled={!file}
              style={{ backgroundColor: "black", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: !file ? "not-allowed" : "pointer" }}
            >
              Upload File
            </button>
          </div>
          <NavLink to="/home" style={{ textDecoration: "underline", color: "black" }}>
            Back to Home
          </NavLink>
        </>
      )}

      {(isUploading || uploadComplete) && (
        <div style={{ marginTop: "30px", backgroundColor: "white", border: "1px solid #ccc", borderRadius: "8px", padding: "20px", width: "90%", maxWidth: "800px", marginLeft: "auto", marginRight: "auto", textAlign: "left", fontFamily: "monospace", overflowY: "auto", maxHeight: "500px" }}>
          <h4>📟 Upload and Tagging Console</h4>
          <hr />
          {logs.map((line, idx) => (<div key={idx}>{line}</div>))}
        </div>
      )}

      {pollingData && (
        <div style={{ marginTop: "20px", textAlign: "left", backgroundColor: "#f4f4f4", padding: "20px", borderRadius: "8px", fontFamily: "monospace", maxWidth: "800px", marginLeft: "auto", marginRight: "auto" }}>
          <h4>🎯 Polling Result</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{renderPollingData(pollingData)}</pre>
        </div>
      )}

      {uploadComplete && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleReset}
            style={{ backgroundColor: "black", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadFile;