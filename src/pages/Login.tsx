/**
 * Login Component
 *
 * Renders a login form that:
 *  - Captures username & password inputs
 *  - Sends credentials to the API endpoint
 *  - Stores the returned auth token on success
 *  - Navigates to the tracker page on successful login
 *  - Displays error messages on failure
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  // Controlled form state for user credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Holds any login error message (e.g., incorrect credentials, server errors)
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * handleSubmit
   * • Prevents default form submission
   * • Sends POST /api/login with username & password
   * • On success: saves token to localStorage, redirects to /tracker
   * • On failure: sets an error message for display
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();           // Prevent full page reload
    setError(null);               // Clear any existing error

    try {
      // Instrumentation: log which endpoint we're calling
      const endpoint = "/api/login";
      console.log("[LOGIN] calling:", endpoint);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Handle non-2xx responses
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg || "Login failed.");
        return;
      }

      // Parse and store authentication token
      const { token } = await res.json();
      localStorage.setItem("authToken", token);

      // Redirect to the main tracker page
      navigate("/tracker");
    } catch (err) {
      // Network or other unexpected errors
      setError("Unable to connect to server.");
      console.error(err);
    }
  };

  // Render the login form
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm"
      >
        {/* Form heading */}
        <h2 className="text-2xl font-semibold mb-4 text-center">Log In</h2>
        
        {/* Error alert (shown when `error` is non-null) */}
        {error && (
          <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Username input */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        {/* Password input */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
