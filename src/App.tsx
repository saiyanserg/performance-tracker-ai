import { useState } from "react";
import Login from "./pages/Login";
import PerformanceTracker from "./pages/PerformanceTracker";

export default function App() {
  // Keep track of whether we're "logged in"
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("authToken")
  );

  // If there's no token, show the Login page
  if (!token) {
    return <Login onSuccess={() => setToken(localStorage.getItem("authToken"))} />;
  }

  // Otherwise, show the tracker
  return <PerformanceTracker />;
}
