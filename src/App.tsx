import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PerformanceTracker from "./pages/PerformanceTracker";

// A simple “ProtectedRoute” that checks for a token in localStorage
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/login" element={<Login />} />

      {/* Protected “tracker” route */}
      <Route
        path="/tracker"
        element={
          <ProtectedRoute>
            <PerformanceTracker />
          </ProtectedRoute>
        }
      />

      {/* Catch‐all: redirect based on whether authToken exists */}
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
  );
}

export default App;
