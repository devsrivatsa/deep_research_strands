// Simple working version for testing
import React from "https://esm.sh/react@18.2.0?dev&target=deno";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client?target=deno";

function SimpleApp() {
  return React.createElement('div', {
    className: 'min-h-screen bg-gray-50 flex items-center justify-center'
  }, 
    React.createElement('div', {
      className: 'text-center'
    },
      React.createElement('h1', {
        className: 'text-3xl font-bold text-gray-900 mb-4'
      }, 'Deep Research'),
      React.createElement('p', {
        className: 'text-gray-600'
      }, 'Application is working! 🎉'),
      React.createElement('div', {
        className: 'mt-4'
      },
        React.createElement('button', {
          className: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
          onClick: () => alert('Button clicked!')
        }, 'Test Button')
      )
    )
  );
}

// Render the App component
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(React.createElement(SimpleApp));