import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a more sophisticated spinner
  }

  if (!isAuthenticated) {
    // User is not authenticated, redirect to the login page
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the child components (the protected page)
  return children;
};

export default ProtectedRoute;
