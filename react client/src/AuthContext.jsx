import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import config from "./config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [idToken, setIdToken] = useState(
    localStorage.getItem("id_token") || null
  );
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setIdToken(null);
    setUserInfo(null);
    localStorage.removeItem("id_token");

    // Optionally redirect to Cognito logout endpoint
    // This clears the Cognito session, so if user immediately tries to log in again,
    // they'll be prompted for credentials.
    const logoutUrl =
      `${config.cognito.domain}/logout?` +
      `client_id=${config.cognito.clientId}&` +
      `logout_uri=${encodeURIComponent(window.location.origin)}`; // Redirect back to app root after Cognito logout

    window.location.href = logoutUrl; // Perform logout redirect
    // After this, the browser will be redirected back to window.location.origin, which
    // should ideally be handled by your LoginPage component.
  }, []);

  useEffect(() => {
    // Get ID token from URL returned by Cognito after initial login
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // Remove the '#' and parse
      const id_Token = params.get("id_token");
      if (id_Token) {
        localStorage.setItem("id_token", id_Token); // Store ID token in localStorage
        setIdToken(id_Token); // Update state with the new ID token
      }
    }

    // Use the ID token from the URL, or previously stored in localStorage
    if (idToken) {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      setUserInfo(payload.given_name || payload.email || "User");
      // Clean the URL hash after processing
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        const decodedToken = jwtDecode(idToken);
        // Basic expiration check (optional, but good practice)
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp < currentTime) {
          console.warn("ID Token is expired. Logging out.");
          logout(); // Token expired, force logout
        }
      } catch (error) {
        console.error("Error decoding or validating ID token:", error);
        logout(); // Decoding failed, probably invalid token
      }
    }
    setIsLoading(false); // Authentication check is complete
  }, [idToken, logout]); // Depend on idToken and logout

  // The value provided by the context
  const authContextValue = {
    idToken,
    userInfo,
    isLoading,
    logout,
    isAuthenticated: !!idToken && !!userInfo, // Simple check if user is authenticated
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
