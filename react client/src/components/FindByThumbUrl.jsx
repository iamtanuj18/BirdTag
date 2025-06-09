import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import config from "../config.js";

const FindByThumbUrl = () => {
  const navigate = useNavigate();
  const [thumbUrl, setThumbUrl] = useState("");
  const [mockResUrl, setMockResUrl] = useState("");
  const [message, setMessage] = useState("");
  const urlInputRef = useRef(null);

  const handleSubmit = async () => {
    if (!thumbUrl) {
      alert("Please enter a URL to a thumbnail.");
      return;
    }

    const thumbnailUrl = thumbUrl.trim();
    if (!thumbnailUrl.startsWith("http")) {
      alert("Invalid URL. Please enter a valid thumbnail URL.");
      setThumbUrl("");
      return;
    }

    const payload = {
      queryType: "byThumbnailUrl",
      thumbnailUrl: thumbnailUrl,
    };

    const requestUrl = `${config.apiGateway.url}/query_raw`;
    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    try {
      setMessage("Searching...");
      setMockResUrl("");

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
        setMockResUrl(data.fullSizeUrl || "");
        setMessage("File found.");
      } else {
        throw new Error(data.message || `${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage(`Search failed. ${error.message}`);
    }
  };

  useEffect(() => {
    console.log("Mock URL in response:", mockResUrl);
  }, [mockResUrl]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "30px 10px",
        textAlign: "center",
        color: "#000",
      }}
    >
      <h2>Find Full-Size Image by Thumbnail URL</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
          position: "relative",
        }}
      >
        <label>
          Thumbnail URL:&nbsp;
          <input
            ref={urlInputRef}
            type="text"
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            style={{ color: "#fff", backgroundColor: "#333" }}
          />
        </label>
        <button onClick={handleSubmit}>Submit</button>
      </div>

      {message && <div style={{ fontWeight: "bold", marginTop: "20px" }}>{message}</div>}

      {mockResUrl && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            borderRadius: "12px",
            background: "#fff",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            maxWidth: "850px",
            width: "100%",
          }}
        >
          <h4>Preview:</h4>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img
              src={mockResUrl}
              alt="Full Size Preview"
              style={{ maxWidth: "500px", maxHeight: "500px" }}
            />
            <div style={{ marginTop: "10px", fontSize: "0.9em" }}>
              Download URL:&nbsp;
              <a href={mockResUrl} target="_blank" rel="noopener noreferrer">
                {mockResUrl}
              </a>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "30px" }}>
        <NavLink
          to="/home"
          className="nav-link"
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Back to Home
        </NavLink>
      </div>
    </div>
  );
};

export default FindByThumbUrl;