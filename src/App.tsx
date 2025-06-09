import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PerformanceTracker from "./pages/PerformanceTracker";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  return localStorage.getItem("authToken") ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public login page */}
        <Route path="/login" element={<Login />} />

        {/* Protected tracker page */}
        <Route
          path="/tracker"
          element={
            <ProtectedRoute>
              <PerformanceTracker />
            </ProtectedRoute>
          }
        />

        {/* Fallback: redirect based on auth status */}
        <Route
          path="*"
          element={
            localStorage.getItem("authToken") ? (
              <Navigate to="/tracker" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
