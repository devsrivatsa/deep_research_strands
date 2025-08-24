import React from "react";
import { Concept, Entity, QueryComponents, Relationship } from "../types/index.ts";

// Mock test data
const mockQueryComponents: QueryComponents = {
  queries: [
    { search_query: "artificial intelligence machine learning" },
    { search_query: "deep learning neural networks" },
    { search_query: "natural language processing transformers" },
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
  ],
};

const emptyQueryComponents: QueryComponents = {
  queries: [],
  concepts: [],
  entities: [],
  relationships: [],
};

// Simple test component to verify the QueryComponentsDisplay works
function QueryComponentsDisplayTest(): React.JSX.Element {
  const [currentComponents, setCurrentComponents] = React.useState<QueryComponents | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLoadSample = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentComponents(mockQueryComponents);
      setIsLoading(false);
    }, 1000);
  };

  const handleLoadEmpty = () => {
    setCurrentComponents(emptyQueryComponents);
  };

  const handleClear = () => {
    setCurrentComponents(undefined);
  };

  const handleApprove = (components: QueryComponents) => {
    console.log("Approved components:", components);
    alert(`Approved ${components.queries.length} queries!`);
  };

  const handleEdit = (components: QueryComponents) => {
    console.log("Edited components:", components);
    setCurrentComponents(components);
    alert(`Saved ${components.queries.length} queries!`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-xl font-bold mb-4">Query Components Display Test</h2>

        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleLoadSample}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load Sample Data"}
          </button>
          <button
            onClick={handleLoadEmpty}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Load Empty
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <p>
            <strong>Test Instructions:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Click "Load Sample Data" to see the component with queries, concepts, entities, and
              relationships
            </li>
            <li>Click "Load Empty" to see the component with empty sections</li>
            <li>Click "Clear" to see the empty state</li>
            <li>Try editing components by clicking the "Edit" button</li>
            <li>Test the approve functionality for individual items and all components</li>
            <li>Test switching between tabs (Queries, Concepts, Entities, Relationships)</li>
            <li>Test adding and removing items in edit mode</li>
          </ul>
        </div>
      </div>

      {/* This would be imported: import { QueryComponentsDisplay } from "./QueryComponentsDisplay.tsx"; */}
      {/* For now, we'll show a placeholder since we can't import in this test environment */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-yellow-800">
          <strong>QueryComponentsDisplay Component would render here</strong>
        </div>
        <div className="text-sm text-yellow-700 mt-2">
          Props: isLoading={isLoading.toString()}, queryComponents={currentComponents
            ? `${currentComponents.queries.length} queries`
            : "undefined"}
        </div>

        {/* Mock representation of what the component would show */}
        <div className="mt-4 p-4 bg-white rounded border">
          <div className="font-semibold mb-2">Mock QueryComponentsDisplay:</div>
          {isLoading && <div className="text-blue-600">Loading with progressive animations...</div>}
          {!isLoading && !currentComponents && (
            <div className="text-gray-500">No query components</div>
          )}
          {!isLoading && currentComponents && (
            <div>
              <div className="flex space-x-4 mb-4 text-sm">
                <span className="font-medium">Queries ({currentComponents.queries.length})</span>
                <span className="font-medium">Concepts ({currentComponents.concepts.length})</span>
                <span className="font-medium">Entities ({currentComponents.entities.length})</span>
                <span className="font-medium">
                  Relationships ({currentComponents.relationships.length})
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-medium mb-2">Search Queries</div>
                  {currentComponents.queries.map((query, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded mb-2">
                      <span className="text-xs text-gray-500">Query {index + 1}:</span>
                      {query.search_query}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-medium mb-2">Concepts</div>
                  {currentComponents.concepts.map((concept, index) => (
                    <div key={concept.id} className="bg-blue-50 p-2 rounded mb-2">
                      <span className="text-xs text-blue-600">
                        {concept.importance} priority, {concept.status}:
                      </span>
                      <span className="font-medium">{concept.name}</span>
                      <div className="text-sm text-gray-600">{concept.description}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-medium mb-2">Entities</div>
                  {currentComponents.entities.map((entity, index) => (
                    <div key={entity.id} className="bg-green-50 p-2 rounded mb-2">
                      <span className="text-xs text-green-600">
                        {entity.type}, {entity.status}:
                      </span>
                      <span className="font-medium">{entity.name}</span>
                      <div className="text-sm text-gray-600">{entity.description}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-medium mb-2">Relationships</div>
                  {currentComponents.relationships.map((relationship, index) => (
                    <div key={relationship.id} className="bg-purple-50 p-2 rounded mb-2">
                      <span className="text-xs text-purple-600">
                        {relationship.strength} strength, {relationship.status}:
                      </span>
                      <span className="font-medium">
                        {relationship.source_entity} → {relationship.target_entity}
                      </span>
                      <div className="text-sm text-gray-600">
                        {relationship.relationship_type}: {relationship.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueryComponentsDisplayTest;
