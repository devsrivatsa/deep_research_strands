// Working main application using React from CDN
console.log('Loading Deep Research application...');

// Wait for React to be available from CDN
function waitForReact() {
  return new Promise((resolve) => {
    if (window.React && window.ReactDOM) {
      resolve();
    } else {
      setTimeout(() => waitForReact().then(resolve), 100);
    }
  });
}

waitForReact().then(() => {
  const { useState, useEffect } = React;
  const { createRoot } = ReactDOM;

  // Initialize theme on page load
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  // Initialize theme immediately
  initializeTheme();

  // Simple working App component
  function App() {
    const [activeTab, setActiveTab] = useState("chat");
    const [messages, setMessages] = useState([
      {
        id: "1",
        type: "system",
        content: "Welcome to Deep Research! Ask a question to get started with AI-powered research.",
        timestamp: new Date().toISOString(),
      }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = (content) => {
      if (!content.trim()) return;
      
      const userMessage = {
        id: Date.now().toString(),
        type: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);
      
      // Simulate response
      setTimeout(() => {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `I received your message: "${content}". This is a demo response showing the integrated application working correctly.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      handleSendMessage(inputValue);
    };

    return React.createElement('div', {
      className: 'min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors'
    },
      // Header
      React.createElement('header', {
        className: 'bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50'
      },
        React.createElement('div', {
          className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        },
          React.createElement('div', {
            className: 'flex justify-between items-center py-3 md:py-4'
          },
            React.createElement('h1', {
              className: 'text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100'
            }, 'Deep Research'),
            
            // Desktop Navigation and Controls
            React.createElement('div', {
              className: 'flex items-center space-x-4'
            },
              // Navigation
              React.createElement('nav', {
                className: 'flex space-x-2 lg:space-x-4',
                role: 'tablist',
                'aria-label': 'Main navigation'
              },
                ['chat', 'plan', 'report', 'projects'].map(tab =>
                  React.createElement('button', {
                    key: tab,
                    onClick: () => setActiveTab(tab),
                    className: `px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      activeTab === tab
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`,
                    role: 'tab',
                    'aria-selected': activeTab === tab,
                    'aria-controls': `${tab}-panel`
                  }, tab.charAt(0).toUpperCase() + tab.slice(1))
                )
              ),
              
              // Theme Toggle
              React.createElement('button', {
                onClick: () => {
                  const html = document.documentElement;
                  if (html.classList.contains('dark')) {
                    html.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  } else {
                    html.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }
                },
                className: 'p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'aria-label': 'Toggle dark mode',
                title: 'Toggle dark mode'
              },
                React.createElement('svg', {
                  className: 'w-5 h-5',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 24 24',
                  'aria-hidden': 'true'
                },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: 2,
                    d: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
                  })
                )
              )
            )
          )
        )
      ),
      
      // Main Content
      React.createElement('main', {
        id: 'main-content',
        className: 'flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8 py-4 md:py-8'
      },
        // Chat Tab
        activeTab === 'chat' && React.createElement('div', {
          id: 'chat-panel',
          role: 'tabpanel',
          'aria-labelledby': 'chat-tab',
          className: 'h-full'
        },
          React.createElement('div', {
            className: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-12rem)]'
          },
            // Messages
            React.createElement('div', {
              className: 'flex-1 overflow-y-auto p-4 space-y-4',
              style: { height: 'calc(100% - 80px)' }
            },
              messages.map(message =>
                React.createElement('div', {
                  key: message.id,
                  className: `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`
                },
                  React.createElement('div', {
                    className: `max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl rounded-lg px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : message.type === 'system'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                    }`
                  },
                    React.createElement('div', {
                      className: 'whitespace-pre-wrap break-words'
                    }, message.content)
                  )
                )
              ),
              
              // Loading indicator
              isLoading && React.createElement('div', {
                className: 'flex justify-start'
              },
                React.createElement('div', {
                  className: 'bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2'
                },
                  React.createElement('div', {
                    className: 'flex items-center space-x-2 text-gray-500 dark:text-gray-400'
                  },
                    React.createElement('div', {
                      className: 'flex space-x-1'
                    },
                      [0, 1, 2].map(i =>
                        React.createElement('div', {
                          key: i,
                          className: 'w-2 h-2 bg-gray-400 rounded-full animate-bounce',
                          style: { animationDelay: `${i * 0.1}s` }
                        })
                      )
                    ),
                    React.createElement('span', {
                      className: 'text-sm'
                    }, 'Assistant is typing...')
                  )
                )
              )
            ),
            
            // Input area
            React.createElement('div', {
              className: 'border-t border-gray-200 dark:border-gray-700 p-4'
            },
              React.createElement('form', {
                onSubmit: handleSubmit,
                className: 'flex gap-2'
              },
                React.createElement('input', {
                  type: 'text',
                  value: inputValue,
                  onChange: (e) => setInputValue(e.target.value),
                  placeholder: 'Ask a question or describe what you\'d like to research...',
                  className: 'flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  disabled: isLoading
                }),
                React.createElement('button', {
                  type: 'submit',
                  disabled: !inputValue.trim() || isLoading,
                  className: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }, 'Send')
              )
            )
          )
        ),
        
        // Other tabs
        activeTab !== 'chat' && React.createElement('div', {
          className: 'h-full flex items-center justify-center'
        },
          React.createElement('div', {
            className: 'text-center text-gray-500 dark:text-gray-400'
          },
            React.createElement('h2', {
              className: 'text-xl font-medium mb-2'
            }, `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab`),
            React.createElement('p', {
              className: 'text-sm'
            }, `The ${activeTab} functionality will be implemented here.`)
          )
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
  root.render(React.createElement(App));

  console.log('Deep Research application loaded successfully!');
}).catch(error => {
  console.error('Failed to load React:', error);
  document.getElementById('root').innerHTML = `
    <div class="min-h-screen bg-red-50 flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-red-900 mb-4">Failed to Load Application</h1>
        <p class="text-red-600">Error: ${error.message}</p>
      </div>
    </div>
  `;
});