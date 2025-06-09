/**
 * App Component & Routing Configuration
 *
 * - Defines public vs. protected routes using React Router v6.
 * - Uses localStorage to guard access to the PerformanceTracker.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PerformanceTracker from "./pages/PerformanceTracker";

/**
 * ProtectedRoute Component
 * • Checks for the presence of an auth token in localStorage.
 * • If no token is found, redirects to the /login page.
 * • Otherwise, renders its child component.
 */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  // Retrieve the stored JWT or auth token
  const token = localStorage.getItem("authToken");
  // If missing, redirect to login (replace history entry to avoid back navigation to protected page)
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // If present, render the protected content
  return children;
}

/**
 * App Component
 * • Wraps route definitions in <Routes>.
 * • /login is always publicly accessible.
 * • /tracker is wrapped with ProtectedRoute to enforce authentication.
 * • A catch-all route redirects users:
 *    – If authenticated, to /tracker
 *    – Otherwise, to /login
 */
function App() {
  return (
    <Routes>
      {/* Public Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Protected Tracker Page */}
      <Route
        path="/tracker"
        element={
          <ProtectedRoute>
            <PerformanceTracker />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route: redirects based on authentication status */}
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
