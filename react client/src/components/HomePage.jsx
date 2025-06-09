import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext"; // Import useAuth

const HomePage = () => {
  const { userInfo, logout } = useAuth();

  return (
    <div>
      <h2 style={{ color: "black" }}>Welcome to Bird Tag, {userInfo}!</h2>
      <p style={{ color: "black" }}>Please select the feature you wish to use!!</p>
      <nav>
        <ul style={{ textAlign: "left" }}>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Upload a file - Species are auto detected and File is saved with its name and count
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/find-by-tag"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Find Files by Tags/Species name and count 
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/find-by-bird"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Find Files by Species Name
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/thumbnail-url"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Find Full-Size Image by Thumbnail URL
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/find-by-file"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
             Find Files Using Species detected from your uploaded File
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/modify-tags"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Add or Remove Tags and Count from Files
            </NavLink>
          </li>
          <li style={{ padding: "5px 0" }}>
            <NavLink
              to="/delete-file"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Delete File by Giving Full/Thumbnail URL
            </NavLink>
          </li>
        </ul>
      </nav>
      <br />
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default HomePage;
