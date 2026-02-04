import PropTypes from "prop-types";

const Navbar = ({ onAuthClick }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-landing sticky-top">
      <div className="container-fluid px-3 px-lg-5">
        <div className="navbar-brand-wrapper">
          <a href="/" className="navbar-brand navbar-brand-custom">BirdTag</a>
          <a 
            href="https://github.com/iamtanuj18/BirdTag" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="navbar-developer-link"
          >
            Developed by Tanuj
          </a>
        </div>

        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
            <li className="nav-item">
              <a className="nav-link nav-link-custom" href="#features">Features</a>
            </li>
            <li className="nav-item">
              <a className="nav-link nav-link-custom" href="#ai-models">AI Models</a>
            </li>
            <li className="nav-item">
              <a className="nav-link nav-link-custom" href="#how-it-works">How It Works</a>
            </li>
            <li className="nav-item">
              <a className="nav-link nav-link-custom" href="#tech">Technology</a>
            </li>
            <li className="nav-item">
              <button className="btn btn-get-started" onClick={onAuthClick}>
                Login / Sign Up
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  onAuthClick: PropTypes.func.isRequired
};

export default Navbar;
