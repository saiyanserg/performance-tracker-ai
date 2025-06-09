import { Routes, Route } from "react-router-dom";
import PerformanceTracker from "./pages/PerformanceTracker";

export default function App() {
  return (
    <Routes>
      {/* Single catch-all route */}
      <Route path="*" element={<PerformanceTracker />} />
    </Routes>
  );
}
