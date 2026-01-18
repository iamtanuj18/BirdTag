import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import LandingPage from "./pages/LandingPage/LandingPage";
import HomePage from "./pages/HomePage/HomePage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import FindByTag from "./pages/FindByTag/FindByTag";
import FindByBird from "./pages/FindByBird/FindByBird";
import MyMedia from "./pages/MyMedia/MyMedia";
import FindByFile from "./pages/FindByFile/FindByFile";
import ModifyTags from "./pages/ModifyTags/ModifyTags";

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 8000,
          style: {
            background: '#fff',
            color: '#333',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
            maxWidth: '420px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-by-tag"
        element={
          <ProtectedRoute>
            <FindByTag />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-by-bird"
        element={
          <ProtectedRoute>
            <FindByBird />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-media"
        element={
          <ProtectedRoute>
            <MyMedia />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-by-file"
        element={
          <ProtectedRoute>
            <FindByFile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/modify-tags"
        element={
          <ProtectedRoute>
            <ModifyTags />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
