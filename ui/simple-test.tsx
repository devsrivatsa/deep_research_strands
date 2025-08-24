import React from "react";
import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Deep Research
        </h1>
        <p className="text-gray-600">
          Application is working! 🎉
        </p>
      </div>
    </div>
  );
}

// Render the App component
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<SimpleApp />);