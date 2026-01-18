import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import config from "./config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [idToken, setIdToken] = useState(localStorage.getItem("id_token") || null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setIdToken(null);
    setUserInfo(null);
    localStorage.removeItem("id_token");

    const logoutUrl =
      `${config.cognito.domain}/logout?` +
      `client_id=${config.cognito.clientId}&` +
      `logout_uri=${encodeURIComponent(window.location.origin)}`;

    window.location.href = logoutUrl;
  }, []);

  useEffect(() => {
    // Extract Token from URL Hash
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const id_Token = params.get("id_token");
      if (id_Token) {
        localStorage.setItem("id_token", id_Token);
        setIdToken(id_Token);
      }
    }

    // Validate Token
    if (idToken) {
      try {
        const decodedToken = jwtDecode(idToken);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decodedToken.exp < currentTime) {
          console.warn("Token expired");
          logout();
        } else {
          setUserInfo(decodedToken.given_name || decodedToken.email || "User");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        logout();
      }
    }
    
    setIsLoading(false);
  }, [idToken, logout]);

  return (
    <AuthContext.Provider value={{
      idToken,
      userInfo,
      isLoading,
      logout,
      isAuthenticated: !!idToken && !!userInfo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
