import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import config from "../../config.js";

const ModifyTags = () => {
  const navigate = useNavigate();
  const [operationAdd, setOperationAdd] = useState(true);
  const [entryUrl, setEntryUrl] = useState("");
  const [entrySpecies, setEntrySpecies] = useState("");
  const [entryCount, setEntryCount] = useState("");
  const [urlList, setUrlList] = useState([]);
  const [tags, setTags] = useState({});
  const [message, setMessage] = useState("");

  const handleAddUrl = () => {
    const trimmedUrl = entryUrl.trim();
    if (!trimmedUrl || !trimmedUrl.startsWith("https://")) {
      alert("Enter a valid S3 HTTPS URL.");
      return;
    }
    if (urlList.includes(trimmedUrl)) {
      alert("URL already added.");
      return;
    }
    setUrlList([...urlList, trimmedUrl]);
    setEntryUrl("");
    setMessage("");
  };

  const handleAddTag = () => {
    if (urlList.length === 0) {
      alert("Please add at least one URL before adding tags.");
      return;
    }

    const trimmedSpecies = entrySpecies.trim().toLowerCase();
    const parsedCount = parseInt(entryCount, 10);

    if (!trimmedSpecies || isNaN(parsedCount) || parsedCount < 0) {
      alert("Enter valid species and non-negative count.");
      return;
    }

    if (tags.hasOwnProperty(trimmedSpecies)) {
      alert(`Tag for "${trimmedSpecies}" already added.`);
      return;
    }

    setTags({ ...tags, [trimmedSpecies]: parsedCount });
    setEntrySpecies("");
    setEntryCount("");
    setMessage("");
  };

  const handleRemoveUrl = (index) => {
    const newList = [...urlList];
    newList.splice(index, 1);
    setUrlList(newList);
  };

  const handleRemoveTag = (species) => {
    const newTags = { ...tags };
    delete newTags[species];
    setTags(newTags);
  };

  const handleClearAll = () => {
    setUrlList([]);
    setTags({});
    setMessage("");
  };

  const handleSubmit = async () => {
    if (urlList.length === 0 || Object.keys(tags).length === 0) {
      alert("Add at least one URL and one tag.");
      return;
    }

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

 const payload = {
  queryType: "modifyTags",
  operation: operationAdd ? 1 : 0,
  modifications: urlList.map((url) => ({
    url,
    tags: Object.entries(tags).map(([species, count]) => `${species},${count}`)
  })),
};


    setMessage("Submitting tag update request...");

    try {
      const response = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unexpected error.");

      const success = data.updated || [];
      const errors = data.errors || [];
      let resultMsg = "";
      if (success.length > 0) resultMsg += `✅ Updated: Only these files were impacted, please check email for more details ${success.join(", ")}\n`;
      if (errors.length > 0)
        resultMsg += errors.map((e) => `❌ ${e.url}: ${e.error}`).join("\n");

      setMessage(resultMsg || "No files were modified.");
    } catch (error) {
      console.error("Tag modification failed:", error);
      setMessage(`Modification failed. ${error.message}`);
    } finally {
      setUrlList([]);
      setTags({});
    }
  };

  return (
    <div className="page-content">
      <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}>Modify Tags and Count  by Providing the below details </h2>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", gap: "30px" }}>
        <label style={{ display: "flex", alignItems: "center", fontSize: "1.1rem", cursor: "pointer" }}>
          <input
            type="radio"
            name="operationMode"
            value="add"
            checked={operationAdd === true}
            onChange={() => setOperationAdd(true)}
            style={{
              appearance: "none",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "2px solid black",
              backgroundColor: operationAdd ? "#003366" : "#fff",
              marginRight: "10px",
              outline: "none",
              cursor: "pointer",
            }}
          />
          Add Mode
        </label>

        <label style={{ display: "flex", alignItems: "center", fontSize: "1.1rem", cursor: "pointer" }}>
          <input
            type="radio"
            name="operationMode"
            value="remove"
            checked={operationAdd === false}
            onChange={() => setOperationAdd(false)}
            style={{
              appearance: "none",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "2px solid black",
              backgroundColor: operationAdd ? "#fff" : "#003366",
              marginRight: "10px",
              outline: "none",
              cursor: "pointer",
            }}
          />
          Remove Mode
        </label>
      </div>

      {/* URL Input */}
      <input
        type="text"
        placeholder="Enter thumbnail or full-size S3 URL"
        value={entryUrl}
        onChange={(e) => setEntryUrl(e.target.value)}
        style={{
          color: "#fff",
          backgroundColor: "#444",
          padding: "10px",
          width: "100%",
          maxWidth: "500px",
          border: "1px solid #666",
          borderRadius: "6px",
          marginBottom: "10px",
        }}
      />
      <button onClick={handleAddUrl} style={{ marginLeft: "10px", padding: "10px 16px", backgroundColor: "#ff6f61", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
        Add URL
      </button>

      {/* Tag Inputs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Bird species"
          value={entrySpecies}
          onChange={(e) => setEntrySpecies(e.target.value)}
          style={{ color: "#fff", backgroundColor: "#444", padding: "10px", width: "180px", border: "1px solid #666", borderRadius: "6px" }}
        />
        <input
          type="number"
          placeholder="Count"
          value={entryCount}
          onChange={(e) => setEntryCount(e.target.value)}
          style={{ color: "#fff", backgroundColor: "#444", padding: "10px", width: "100px", border: "1px solid #666", borderRadius: "6px" }}
        />
        <button
          onClick={handleAddTag}
          style={{ padding: "10px 16px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          Add Tag
        </button>
        <button
          onClick={handleClearAll}
          style={{ padding: "10px 16px", backgroundColor: "#888", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          Clear All
        </button>
      </div>

      {/* Preview Section */}
      {(urlList.length > 0 || Object.keys(tags).length > 0) && (
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "15px 20px", boxShadow: "0 0 8px rgba(0,0,0,0.1)", color: "#000", maxWidth: "700px", margin: "0 auto 20px" }}>
          {urlList.length > 0 && (
            <>
              <h3>URLs:</h3>
              <pre
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(urlList, null, 2)}
              </pre>
              <ul>
                {urlList.map((url, idx) => (
                  <li key={idx}>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#0645AD" }}>{url}</a>
                    <button onClick={() => handleRemoveUrl(idx)} style={{ marginLeft: "10px", padding: "4px 8px", backgroundColor: "#cc0000", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {Object.keys(tags).length > 0 && (
            <>
              <h3>Tags (shared for all URLs):</h3>
              <pre
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(tags, null, 2)}
              </pre>
              <ul style={{ marginTop: "10px" }}>
                {Object.entries(tags).map(([species, count]) => (
                  <li key={species}>
                    <strong>{species}</strong>, {count}
                    <button
                      onClick={() => handleRemoveTag(species)}
                      style={{
                        marginLeft: "10px",
                        padding: "4px 8px",
                        backgroundColor: "#cc0000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div style={{ margin: "10px" }}>
        <button
          onClick={handleSubmit}
          disabled={urlList.length === 0 || Object.keys(tags).length === 0}
          style={{
            backgroundColor: urlList.length === 0 || Object.keys(tags).length === 0 ? "#777" : "#28a745",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: urlList.length === 0 || Object.keys(tags).length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Submit
        </button>
      </div>

      {/* Message Area */}
      {message && (
        <div style={{ marginTop: "30px", backgroundColor: "#fff", padding: "15px 20px", borderRadius: "10px", color: "#000", maxWidth: "700px", textAlign: "left", whiteSpace: "pre-wrap", lineHeight: "1.5", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}>
          {message.split("\n").map((line, index) => {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const parts = line.split(urlRegex);
            return (
              <div key={index}>
                {parts.map((part, i) =>
                  urlRegex.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#0645AD" }}>
                      {part}
                    </a>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Back Link */}
      <div style={{ marginTop: "40px" }}>
        <NavLink
          to="/home"
          className="nav-link"
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
          }}
        >
          Back to Home
        </NavLink>
      </div>
    </div>
  );
};

export default ModifyTags;
