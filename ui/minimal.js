import React from "react";
import { createRoot } from "react-dom/client";

function MinimalApp() {
  return React.createElement(
    "div", 
    { className: "p-8 max-w-4xl mx-auto" },
    React.createElement("h1", { className: "text-3xl font-bold mb-4" }, "Minimal React App"),
    React.createElement("p", { className: "mb-4" }, "This is a minimal React application to test if React is working correctly."),
    React.createElement(
      "div", 
      { className: "bg-blue-100 p-4 rounded mb-4" },
      React.createElement("p", {}, "If you can see this styled box, both React and Tailwind CSS are working!")
    ),
    React.createElement(
      "button",
      { 
        className: "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded",
        onClick: () => alert("React events are working!")
      },
      "Click Me"
    )
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(MinimalApp));
} else {
  console.error("Root element not found!");
}