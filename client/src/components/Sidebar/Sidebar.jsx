import { NavLink } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import config from "../../config";
import "./Sidebar.css";

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <div className="sidebar">
      {/* Logo section */}
      <NavLink to="/home" className="sidebar-logo">
        <span className="sidebar-brand">BirdTag</span>
        <a 
          href="https://iamtanuj.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sidebar-developer-link"
          onClick={(e) => e.stopPropagation()}
        >
          Developed by Tanuj
        </a>
      </NavLink>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/my-media?tab=myMedia"
          className={({ isActive }) =>
            isActive && !window.location.search.includes("tab=upload") ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>My Uploaded Media</span>
        </NavLink>

        <NavLink
          to="/my-media?tab=upload"
          className={({ isActive }) =>
            isActive && window.location.search.includes("tab=upload") ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>Upload New Media File</span>
        </NavLink>

        <NavLink
          to="/modify-tags"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <span>Manage My Uploaded Files</span>
        </NavLink>

        <NavLink
          to="/find-by-bird"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span>Search Files by Bird Name</span>
        </NavLink>

        <NavLink
          to="/find-by-file"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8a3 3 0 1 0 0 6"/>
          </svg>
          <span>Find Files by Upload Detection</span>
        </NavLink>

        <NavLink
          to="/find-by-tag"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Advanced Search (Count Filter)</span>
        </NavLink>
      </nav>

      {/* Test Files Download */}
      <div className="sidebar-download-section">
        <a 
          href={config.testFiles.downloadUrl}
          download="birdtag-test-files.zip"
          className="sidebar-download-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          <div className="download-text">
            <span className="download-label">Download Test Files</span>
            <span className="download-size">14.6 MB ZIP</span>
          </div>
        </a>
      </div>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={logout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
