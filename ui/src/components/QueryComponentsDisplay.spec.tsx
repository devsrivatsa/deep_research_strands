import React from "react";
import { Concept, Entity, QueryComponents, Relationship } from "../types/index.ts";
import { QueryComponentsDisplay } from "./QueryComponentsDisplay.tsx";

// Test data for comprehensive testing
const mockQueryComponents: QueryComponents = {
  queries: [
    { search_query: "artificial intelligence machine learning applications" },
    { search_query: "deep learning neural networks computer vision" },
    { search_query: "natural language processing transformers GPT" },
  ],
  concepts: [
    {
      id: "concept-1",
      name: "Machine Learning",
      description:
        "A subset of artificial intelligence that enables computers to learn without being explicitly programmed",
      importance: "high",
      status: "approved",
    },
    {
      id: "concept-2",
      name: "Neural Networks",
      description: "Computing systems inspired by biological neural networks",
      importance: "medium",
      status: "pending",
    },
    {
      id: "concept-3",
      name: "Deep Learning",
      description:
        "Machine learning methods based on artificial neural networks with representation learning",
      importance: "high",
      status: "rejected",
    },
  ],
  entities: [
    {
      id: "entity-1",
      name: "TensorFlow",
      type: "Framework",
      description: "Open-source machine learning framework developed by Google",
      properties: { language: "Python", license: "Apache 2.0" },
      status: "approved",
    },
    {
      id: "entity-2",
      name: "PyTorch",
      type: "Framework",
      description: "Open-source machine learning library developed by Facebook",
      properties: { language: "Python", license: "BSD" },
      status: "pending",
    },
    {
      id: "entity-3",
      name: "Scikit-learn",
      type: "Library",
      description: "Machine learning library for Python",
      properties: { language: "Python", license: "BSD" },
      status: "approved",
    },
  ],
  relationships: [
    {
      id: "rel-1",
      source_entity: "TensorFlow",
      target_entity: "Machine Learning",
      relationship_type: "implements",
      description: "TensorFlow is a framework that implements machine learning algorithms",
      strength: "strong",
      status: "approved",
    },
    {
      id: "rel-2",
      source_entity: "PyTorch",
      target_entity: "Neural Networks",
      relationship_type: "supports",
      description: "PyTorch provides extensive support for neural network development",
      strength: "strong",
      status: "pending",
    },
    {
      id: "rel-3",
      source_entity: "Deep Learning",
      target_entity: "Neural Networks",
      relationship_type: "uses",
      description: "Deep learning is based on neural network architectures",
      strength: "medium",
      status: "approved",
    },
  ],
};

const emptyQueryComponents: QueryComponents = {
  queries: [],
  concepts: [],
  entities: [],
  relationships: [],
};

// Test component to verify functionality
function QueryComponentsDisplayTest(): React.JSX.Element {
  const [currentComponents, setCurrentComponents] = React.useState<QueryComponents | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [testResults, setTestResults] = React.useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleLoadSample = () => {
    setIsLoading(true);
    addTestResult("Loading sample data with progressive animations...");
    setTimeout(() => {
      setCurrentComponents(mockQueryComponents);
      setIsLoading(false);
      addTestResult(
        `Loaded ${mockQueryComponents.queries.length} queries, ${mockQueryComponents.concepts.length} concepts, ${mockQueryComponents.entities.length} entities, ${mockQueryComponents.relationships.length} relationships`,
      );
    }, 2000);
  };

  const handleLoadEmpty = () => {
    setCurrentComponents(emptyQueryComponents);
    addTestResult("Loaded empty query components");
  };

  const handleClear = () => {
    setCurrentComponents(undefined);
    addTestResult("Cleared all components - showing empty state");
  };

  const handleApprove = (components: QueryComponents) => {
    const totalComponents = components.queries.length + components.concepts.length +
      components.entities.length + components.relationships.length;
    addTestResult(`Approved all components: ${totalComponents} total items`);
    console.log("Approved components:", components);
  };

  const handleEdit = (components: QueryComponents) => {
    setCurrentComponents(components);
    const totalComponents = components.queries.length + components.concepts.length +
      components.entities.length + components.relationships.length;
    addTestResult(`Saved edited components: ${totalComponents} total items`);
    console.log("Edited components:", components);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold mb-4">QueryComponentsDisplay Test Suite</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Test Controls</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleLoadSample}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Loading..." : "Load Sample Data"}
              </button>
              <button
                onClick={handleLoadEmpty}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Load Empty
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={clearTestResults}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Clear Results
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Test Results</h2>
            <div className="bg-gray-50 rounded p-3 h-32 overflow-y-auto text-sm">
              {testResults.length === 0
                ? <div className="text-gray-500 italic">Test results will appear here...</div>
                : (
                  testResults.map((result, index) => (
                    <div key={index} className="mb-1 text-gray-700">{result}</div>
                  ))
                )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Test Instructions:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            <li>
              <strong>Load Sample Data:</strong>{" "}
              Test loading states with progressive animations, then view all component types
            </li>
            <li>
              <strong>Load Empty:</strong>{" "}
              Test empty sections for each tab (queries, concepts, entities, relationships)
            </li>
            <li>
              <strong>Clear:</strong> Test the empty state when no components are provided
            </li>
            <li>
              <strong>Tab Navigation:</strong> Switch between tabs to see different component types
            </li>
            <li>
              <strong>Edit Mode:</strong>{" "}
              Click "Edit" to test editing interfaces and adding/removing items
            </li>
            <li>
              <strong>Approve:</strong>{" "}
              Test the approval functionality for individual items and all components
            </li>
            <li>
              <strong>Animations:</strong>{" "}
              Observe hover effects, transitions, and progressive revelation
            </li>
          </ul>
        </div>
      </div>

      {/* QueryComponentsDisplay Component */}
      <QueryComponentsDisplay
        queryComponents={currentComponents}
        isLoading={isLoading}
        onApprove={handleApprove}
        onEdit={handleEdit}
        className="shadow-lg"
      />

      {/* Component Status */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Component Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-800">Queries</div>
            <div className="text-blue-600">{currentComponents?.queries?.length || 0} items</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-green-800">Concepts</div>
            <div className="text-green-600">{currentComponents?.concepts?.length || 0} items</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-800">Entities</div>
            <div className="text-purple-600">{currentComponents?.entities?.length || 0} items</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="font-medium text-orange-800">Relationships</div>
            <div className="text-orange-600">
              {currentComponents?.relationships?.length || 0} items
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QueryComponentsDisplayTest;
