import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import config from "../config.js";

const FindByTag = () => {
  const navigate = useNavigate();

  const [birdSpecies, setBirdSpecies] = useState("");
  const [count, setCount] = useState("");
  const [savedPairs, setSavedPairs] = useState([]);
  const [message, setMessage] = useState("");
  const [allSpecies, setAllSpecies] = useState([]);
  const [suggestedSpecies, setSuggestedSpecies] = useState([]);
  const [mockResUrls, setMockResUrls] = useState({});
  const inputRef = useRef(null);
  const [loadingImage, setLoadingImage] = useState(null); // stores thumbnail URL being clicked

  useEffect(() => {
    const fetchSpecies = async () => {
      const idToken = localStorage.getItem("id_token");
      if (!idToken) {
        navigate("/");
        return;
      }
      try {
        const res = await fetch(`${config.apiGateway.url}/query_raw`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: idToken,
          },
          body: JSON.stringify({ queryType: "listSpecies" }),
        });
        const data = await res.json();
        if (res.ok && data.species) {
          setAllSpecies(data.species);
        } else {
          console.warn("Could not fetch species list:", data.message);
        }
      } catch (err) {
        console.error("Error fetching species list:", err);
      }
    };
    fetchSpecies();
  }, [navigate]);

  useEffect(() => {
    const trimmed = birdSpecies.trim().toLowerCase();
    if (trimmed.length >= 3) {
      const matches = allSpecies.filter(
        (s) => s.toLowerCase().includes(trimmed)
      );
      setSuggestedSpecies(matches.slice(0, 5));
    } else {
      setSuggestedSpecies([]);
    }
  }, [birdSpecies, allSpecies]);

  const handleAdd = () => {
    if (!birdSpecies || !count) {
      alert("Please enter bird species and count.");
      return;
    }
    const trimmedSpecies = birdSpecies.trim();
    const parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      alert("Please enter a valid count.");
      return;
    }
    const existingIndex = savedPairs.findIndex(
      (pair) => pair.species.toLowerCase() === trimmedSpecies.toLowerCase()
    );
    if (existingIndex !== -1) {
      const updated = [...savedPairs];
      updated[existingIndex] = { species: trimmedSpecies, count: parsedCount };
      setSavedPairs(updated);
    } else {
      setSavedPairs([...savedPairs, { species: trimmedSpecies, count: parsedCount }]);
    }
    setBirdSpecies("");
    setCount("");
    setSuggestedSpecies([]);
  };

  const handleClear = () => {
    setSavedPairs([]);
    setBirdSpecies("");
    setCount("");
    setMessage("");
    setSuggestedSpecies([]);
    setMockResUrls({});
  };

  const handleSubmit = async () => {
    if (savedPairs.length === 0) return;
    const tags = savedPairs.reduce((acc, pair) => {
      acc[pair.species] = pair.count;
      return acc;
    }, {});
    const payload = {
      queryType: "byTags",
      tags: tags,
    };
    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }
    try {
      setMessage("Searching ...");
      setMockResUrls({});
      const response = await fetch(`${config.apiGateway.url}/query_raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        const links = data.links || [];
        const images = links.filter((l) => /\.(jpg|jpeg|png)$/i.test(l));
        const videos = links.filter((l) => /\.(mp4|webm|ogg)$/i.test(l));
        const audios = links.filter((l) => /\.(mp3|wav|m4a)$/i.test(l));
        setMockResUrls({ images, videos, audios });
        setMessage(
          links.length === 0
            ? "Sorry, couldn't find exact matches."
            : `Found ${links.length} file(s).`
        );
        setSavedPairs([]);
      } else {
        throw new Error(data.message || `${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setMessage(`Search failed. ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "30px 10px", color: "#000" }}>
      <h2>Find Files by Tags/Species name and Count</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative", marginBottom: "10px" }}>
        <label>
          Bird Species:&nbsp;
          <input
            ref={inputRef}
            type="text"
            value={birdSpecies}
            onChange={(e) => setBirdSpecies(e.target.value)}
            onBlur={() => setTimeout(() => setSuggestedSpecies([]), 150)}
            style={{ color: "#fff", backgroundColor: "#333" }}
          />
          {suggestedSpecies.length > 0 && birdSpecies.trim().length >= 3 && (
            <ul style={{ position: "absolute", top: "100%", left: 0, backgroundColor: "#fff", color: "#000", listStyle: "none", padding: "8px", margin: 0, border: "1px solid #ccc", borderRadius: "4px", width: "250px", zIndex: 1000 }}>
              {suggestedSpecies.map((sp, idx) => (
                <li
                  key={idx}
                  onMouseDown={() => {
                    setBirdSpecies(sp);
                    setSuggestedSpecies([]);
                  }}
                  style={{ padding: "4px", cursor: "pointer" }}
                >
                  {sp}
                </li>
              ))}
            </ul>
          )}
        </label>
        <label>
          Count:&nbsp;
          <input type="number" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <button onClick={handleAdd}>Add Tag</button>
        {savedPairs.length > 0 && <button onClick={handleClear}>Clear Tags</button>}
      </div>

      {savedPairs.length > 0 && (
        <>
          <h3>Tags:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {savedPairs.map((pair, i) => (
              <li key={i}>{pair.species}: {pair.count}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ margin: "10px 0" }}>
        <button onClick={handleSubmit} disabled={savedPairs.length === 0}>Submit</button>
      </div>

      {message && <div style={{ fontWeight: "bold", marginTop: "20px" }}>{message}</div>}

      {(message || Object.values(mockResUrls).some(arr => arr.length)) && (
        <div style={{ marginTop: "20px", padding: "20px", borderRadius: "12px", background: "#fff", boxShadow: "0 0 10px rgba(0,0,0,0.1)", maxWidth: "850px", width: "100%" }}>
{mockResUrls.images?.length > 0 && (
  <>
    <h4>Images: <span style={{color:"red"}}>Please click on image to open full sized image.</span></h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
      {mockResUrls.images.map((img, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={async () => {
            setLoadingImage(img); // Start spinner
            try {
              const idToken = localStorage.getItem("id_token");
              const res = await fetch(`${config.apiGateway.url}/query_raw`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: idToken,
                },
                body: JSON.stringify({
                  queryType: "byThumbnailUrl",
                  thumbnailUrl: img,
                }),
              });
              const data = await res.json();
              if (res.ok && data.fullSizeUrl) {
                window.open(data.fullSizeUrl, "_blank");
              } else {
                alert("Could not fetch full-size image.");
              }
            } catch (err) {
              console.error("Failed to fetch full-size image", err);
              alert("Error loading full-size image.");
            } finally {
              setLoadingImage(null); // Stop spinner
            }
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={img}
              alt={`Image ${i + 1}`}
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
                boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                opacity: loadingImage === img ? 0.5 : 1,
                transition: "opacity 0.3s ease",
              }}
            />
            {loadingImage === img && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                ⏳
              </div>
            )}
          </div>
          <div style={{ marginTop: "5px", fontSize: "0.9em", textAlign: "center" }}>
            Download URL:{" "}
            <a
              href={img}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // 🛑 prevent triggering full-size fetch
              style={{ color: "#0645AD", wordBreak: "break-all" }}
            >
              {img}
            </a>
          </div>
        </div>
      ))}
    </div>
  </>
)}

          {mockResUrls.videos?.length > 0 && (
            <>
              <h4 style={{ marginTop: "20px" }}>Videos:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                {mockResUrls.videos.map((video, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <video controls width="300" style={{ borderRadius: "8px" }}>
                      <source src={video} />
                      Your browser does not support the video tag.
                    </video>
                    <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
                      Download URL: <a href={video} target="_blank" rel="noopener noreferrer">{video}</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {mockResUrls.audios?.length > 0 && (
            <>
              <h4 style={{ marginTop: "20px" }}>Audio:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
                {mockResUrls.audios.map((audio, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <audio controls>
                      <source src={audio} />
                      Your browser does not support the audio element.
                    </audio>
                    <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
                      Download URL: <a href={audio} target="_blank" rel="noopener noreferrer">{audio}</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
            fontWeight: "bold"
          }}
        >
          Back to Home
        </NavLink>
      </div>
    </div>
  );
};

export default FindByTag;