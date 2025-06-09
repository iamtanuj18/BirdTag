import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LoginPage from "./components/LoginPage";
import HomePage from "./components/HomePage";
import ProtectedRoute from "./components/ProtectedRoute";
import FindByTag from "./components/FindByTag";
import FindByBird from "./components/FindByBird";
import UploadFile from "./components/UploadFile";
import FindByThumbUrl from "./components/FindByThumbUrl";
import FindByFile from "./components/FindByFile";
import DeleteFileByUrl from "./components/DeleteFileByUrl";
import ModifyTags from "./components/ModifyTags";

function App() {
  return (
    <div>
      {/* Banner Section */}
      <header>
        <h1>Bird Tag</h1>
      </header>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<LoginPage />} />
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
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadFile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/thumbnail-url"
          element={
            <ProtectedRoute>
              <FindByThumbUrl />
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
          path="/delete-file"
          element={
            <ProtectedRoute>
              <DeleteFileByUrl />
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
    </div>
  );
}

export default App;
