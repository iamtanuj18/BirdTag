import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../../AuthContext";
import Sidebar from "../Sidebar/Sidebar";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>; 
  }

  if (!isAuthenticated) {
    // User is not authenticated, redirect to the landing page
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render with sidebar
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};

export default ProtectedRoute;
