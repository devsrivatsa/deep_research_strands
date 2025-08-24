import React from "react";
import { createRoot } from "react-dom/client";

function MinimalApp() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Minimal React App</h1>
      <p className="mb-4">This is a minimal React application to test if React is working correctly.</p>
      <div className="bg-blue-100 p-4 rounded mb-4">
        <p>If you can see this styled box, both React and Tailwind CSS are working!</p>
      </div>
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => alert("React events are working!")}
      >
        Click Me
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<MinimalApp />);
} else {
  console.error("Root element not found!");
}