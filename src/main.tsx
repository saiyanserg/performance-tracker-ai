/**
 * Entry point for the React application.
 * - Imports core libraries and global styles.
 * - Creates the root React node and mounts the component tree.
 * - Wraps the app in <React.StrictMode> for highlighting potential issues.
 * - Wraps the app in <BrowserRouter> to enable client‐side routing.
 */

import React from "react";                             // React core library
import ReactDOM from "react-dom/client";               // ReactDOM for rendering to the DOM
import { BrowserRouter } from "react-router-dom";      // BrowserRouter enables HTML5 history API routing
import App from "./App";                               // Root application component
import "./index.css";                                  // Global Tailwind / custom CSS

// Find the <div id="root"> in index.html and create a React root there
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>                                  // StrictMode activates additional checks & warnings
    <BrowserRouter>                                   // Enables routing context for <App>
      <App />                                         // Your main application component
    </BrowserRouter>
  </React.StrictMode>
);
