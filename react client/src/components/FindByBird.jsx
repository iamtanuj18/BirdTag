import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import config from "../config.js";
import "../styles/FindByBird.css";

const FindByBird = () => {
  const navigate = useNavigate();
  const [birdSpecies, setBirdSpecies] = useState("");
  const [savedBirds, setSavedBirds] = useState([]);
  const [message, setMessage] = useState("");
  const [suggestedSpecies, setSuggestedSpecies] = useState([]);
  const [allSpecies, setAllSpecies] = useState([]);
  const [mockResUrls, setMockResUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(null); // stores thumbnail URL being clicked

  const inputRef = useRef(null); // 🔧 FIX: for handling blur logic safely

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
        (s) => s.toLowerCase().includes(trimmed) && !savedBirds.includes(s)
      );
      setSuggestedSpecies(matches.slice(0, 5));
    } else {
      setSuggestedSpecies([]);
    }
  }, [birdSpecies, allSpecies, savedBirds]);

  const handleAdd = () => {
    const trimmed = birdSpecies.trim();
    if (!trimmed) return alert("Please enter bird species.");
    if (savedBirds.includes(trimmed)) return alert("This bird species is already in the list.");
    setSavedBirds([...savedBirds, trimmed]);
    setBirdSpecies("");
    setSuggestedSpecies([]);
  };

  const handleClear = () => {
    setSavedBirds([]);
    setBirdSpecies("");
    setMessage("");
    setSuggestedSpecies([]);
    setMockResUrls({});
  };

  const handleSubmit = async () => {
    if (savedBirds.length === 0) return;

    const payload = {
      queryType: "bySpecies",
      species: savedBirds.map((s) => s.trim()),
    };

    const requestUrl = `${config.apiGateway.url}/query_raw`;
    const idToken = localStorage.getItem("id_token");

    if (!idToken) {
      navigate("/");
      return;
    }

    setLoading(true);
    setMessage("");
    setMockResUrls({});
    setSuggestedSpecies([]);

    try {
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

        setBirdSpecies("");
        setSavedBirds([]);

        if (data.suggestedSpecies?.length > 0) {
          setSuggestedSpecies(data.suggestedSpecies);
        }
      } else {
        throw new Error(data.message || `${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setMessage(`Search failed. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "30px 10px",
      textAlign: "center",
      color: "#000"
    }}>
      <h2>Find Files by Bird Species Name(s)</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", position: "relative" }}>
        <label>
          Bird Species:&nbsp;
          <input
            ref={inputRef}
            type="text"
            value={birdSpecies}
            onChange={(e) => setBirdSpecies(e.target.value)}
            onBlur={() => setTimeout(() => setSuggestedSpecies([]), 150)} // 🔧 FIX
            style={{ color: "#fff", backgroundColor: "#333" }}
          />
          {suggestedSpecies.length > 0 && birdSpecies.trim().length >= 3 && (
            <ul style={{
              position: "absolute",
              top: "100%",
              left: 0,
              backgroundColor: "#fff",
              color: "#000",
              listStyle: "none",
              padding: "8px",
              margin: 0,
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "250px",
              zIndex: 1000
            }}>
              {suggestedSpecies.map((sp, idx) => (
                <li
                  key={idx}
                  onMouseDown={() => { // 🔧 FIX
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
        <button onClick={handleAdd}>Add Species</button>
        {savedBirds.length > 0 && <button onClick={handleClear}>Clear Species</button>}
      </div>

      {savedBirds.length > 0 && (
        <>
          <h3>Species:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {savedBirds.map((bird, i) => <li key={i}>{bird}</li>)}
          </ul>
        </>
      )}

      <div style={{ margin: "10px 0" }}>
        <button onClick={handleSubmit} disabled={savedBirds.length === 0}>
          Submit
        </button>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="loader" />
          <p>Searching bird database...</p>
        </div>
      )}

      {(message || Object.values(mockResUrls).some(arr => arr.length)) && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          borderRadius: "12px",
          background: "#fff",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          maxWidth: "850px",
          width: "100%"
        }}>
          {message && <div style={{ fontWeight: "bold", marginBottom: "10px" }}>{message}</div>}

          {suggestedSpecies.length > 0 && message.includes("couldn't find") && (
            <div style={{ marginBottom: "10px" }}>
              <p>
                Perhaps you meant: <strong style={{ color: "red" }}>{suggestedSpecies.join(", ")}</strong>
              </p>
            </div>
          )}
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
                      Thumbnail Download URL: <a href={video} target="_blank" rel="noopener noreferrer">{video}</a>
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
    transition: "background-color 0.3s ease"
  }}
>
  <NavLink
    to="/home"
    className="nav-link"
    style={{
      color: "#fff",                 
      textDecoration: "none"
    }}
  >
    Back to Home
  </NavLink>
</button>
      </div>
    </div>
  );
};

export default FindByBird;
