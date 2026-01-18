import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import config from "../../config.js";

const DeleteFileByUrl = () => {
  const navigate = useNavigate();
  const [fileUrl, setFileUrl] = useState("");
  const [savedUrls, setSavedUrls] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = () => {
    const trimmedUrl = fileUrl.trim();
    if (!trimmedUrl) return alert("Please enter a URL.");
    if (savedUrls.includes(trimmedUrl)) return alert("This URL is already in the list.");
    setSavedUrls([...savedUrls, trimmedUrl]);
    setFileUrl("");
  };

  const handleClear = () => {
    setSavedUrls([]);
    setMessage("");
  };

  const handleSubmit = async () => {
    if (savedUrls.length === 0) return alert("Please enter at least one URL.");

    const requestUrl = `${config.apiGateway.url}/query_raw`;
    const idToken = localStorage.getItem("id_token");
    if (!idToken) return navigate("/");

    const payload = {
      queryType: "deleteFiles",
      urls: savedUrls.map((url) => url.trim()),
    };

    try {
      setLoading(true);
      setMessage("Deleting files...");
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.deleted && data.deleted.length > 0) {
          setMessage(`✅ Successfully deleted ${data.deleted.length} file(s).`);
        } else {
          setMessage("⚠️ No files were deleted. Please check the URLs.");
        }
      } else {
        throw new Error(data.message || `${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Deletion failed:", error);
      setMessage(`❌ Deletion failed. ${error.message}`);
    } finally {
      setLoading(false);
      setSavedUrls([]);
    }
  };

  return (
    <div className="page-content">
      <h2>Delete Files by URL</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <label>
          File URL:&nbsp;
          <input
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            style={{ color: "#fff", backgroundColor: "#333" }}
          />
        </label>
        <button onClick={handleAdd}>Add File URL</button>
        {savedUrls.length > 0 && <button onClick={handleClear}>Clear File URLs</button>}
      </div>

      {savedUrls.length > 0 && (
        <>
          <h3>File URLs:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {savedUrls.map((url, i) => (
              <li key={i}>{url}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ margin: "10px 0" }}>
        <button onClick={handleSubmit} disabled={savedUrls.length === 0}>
          Submit
        </button>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="loader" />
          <p>Processing deletion...</p>
        </div>
      )}

      {message && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          borderRadius: "12px",
          background: "#fff",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          maxWidth: "850px",
          width: "100%",
        }}>
          <p><strong>{message}</strong></p>
        </div>
      )}

      <div style={{ marginTop: "30px" }}>
        <button
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            transition: "background-color 0.3s ease",
          }}
        >
          <NavLink
            to="/home"
            className="nav-link"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            Back to Home
          </NavLink>
        </button>
      </div>
    </div>
  );
};

export default DeleteFileByUrl;
