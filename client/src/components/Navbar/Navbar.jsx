const Navbar = ({ onAuthClick }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-landing sticky-top">
      <div className="container-fluid px-3 px-lg-5">
        <a href="/" className="navbar-brand navbar-brand-custom">BirdTag</a>

        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
            <li className="nav-item">
              <a className="nav-link nav-link-custom" href="#features">Features</a>
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

export default Navbar;
