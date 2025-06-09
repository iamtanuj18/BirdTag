import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";
import { useAuth } from "../AuthContext"; // Import useAuth

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth(); // Get auth status from context

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/home"); // If already logged in, redirect to home
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = () => {
    // Tanuj's congito
    // const cognitoDomain =
    //   "https://birdtag-7125.auth.us-east-1.amazoncognito.com";
    // const clientId = "4pocpg1mkmhbtqbq7k066k6ea3";
    // const redirectUri = "http://localhost:5173/home";

    // Redirect to Cognito Hosted UI for login
    // const cognitoDomain =
    //   "https://us-east-1gsefsc2zj.auth.us-east-1.amazoncognito.com";
    // const clientId = "26aug4lcsqfejb6bsdc2pn1174";
    // const redirectUri = "http://localhost:5173/home";

    //const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=token&scope=email+openid+phone+profile&redirect_uri=${redirectUri}`;
    const loginUrl = `${config.cognito.domain}/login?client_id=${
      config.cognito.clientId
    }&response_type=${
      config.cognito.responseType
    }&scope=email+openid+profile&redirect_uri=${encodeURIComponent(
      config.cognito.redirectUri
    )}`;
    window.location.href = loginUrl;
    // "https://birdtag-7125.auth.us-east-1.amazoncognito.com/login?response_type=token&client_id=4pocpg1mkmhbtqbq7k066k6ea3&redirect_uri=http://localhost:5173/home"; // Redirects to Cognito Hosted UI
  };

  return (
    <div>
      <h2 style={{ color: "black" }}>Welcome to Bird Tag</h2>
      <button onClick={handleLogin}>Login with Cognito</button>
    </div>
  );
};

export default LoginPage;
