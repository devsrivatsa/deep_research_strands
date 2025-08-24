import React, { useEffect, useState } from "react";
import { Concept, Entity, QueryComponents, Relationship, SearchQuery } from "../types/index.ts";

interface QueryComponentsDisplayProps {
  queryComponents?: QueryComponents;
  isLoading?: boolean;
  onApprove?: (components: QueryComponents) => void;
  onEdit?: (components: QueryComponents) => void;
  className?: string;
}

export function QueryComponentsDisplay({
  queryComponents,
  isLoading = false,
  onApprove,
  onEdit,
  className = "",
}: QueryComponentsDisplayProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"queries" | "concepts" | "entities" | "relationships">(
    "queries",
  );
  const [editMode, setEditMode] = useState(false);
  const [editedComponents, setEditedComponents] = useState<QueryComponents | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    queries: true,
    concepts: true,
    entities: true,
    relationships: true,
  });

  useEffect(() => {
    if (queryComponents) {
      setEditedComponents(queryComponents);
    }
  }, [queryComponents]);

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = () => {
    if (editedComponents && onEdit) {
      onEdit(editedComponents);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedComponents(queryComponents || null);
    setEditMode(false);
  };

  const handleApprove = () => {
    if (queryComponents && onApprove) {
      onApprove(queryComponents);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return <LoadingState className={className} />;
  }

  if (!queryComponents) {
    return <EmptyState className={className} />;
  }

  const displayComponents = editMode ? editedComponents : queryComponents;
  const totalComponents = (displayComponents?.queries.length || 0) +
    (displayComponents?.concepts.length || 0) +
    (displayComponents?.entities.length || 0) +
    (displayComponents?.relationships.length || 0);

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Query Components ({totalComponents})
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {editMode
            ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                >
                  Save
                </button>
              </>
            )
            : (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleApprove}
                  className="px-3 py-1 text-sm text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
                >
                  Approve All
                </button>
              </>
            )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {[
            { key: "queries", label: "Queries", count: displayComponents?.queries.length || 0 },
            { key: "concepts", label: "Concepts", count: displayComponents?.concepts.length || 0 },
            { key: "entities", label: "Entities", count: displayComponents?.entities.length || 0 },
            {
              key: "relationships",
              label: "Relationships",
              count: displayComponents?.relationships.length || 0,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "queries" && (
          <QueriesSection
            queries={displayComponents?.queries || []}
            editMode={editMode}
            onUpdate={(queries) =>
              setEditedComponents((prev) => prev ? { ...prev, queries } : null)}
          />
        )}
        {activeTab === "concepts" && (
          <ConceptsSection
            concepts={displayComponents?.concepts || []}
            editMode={editMode}
            onUpdate={(concepts) =>
              setEditedComponents((prev) => prev ? { ...prev, concepts } : null)}
          />
        )}
        {activeTab === "entities" && (
          <EntitiesSection
            entities={displayComponents?.entities || []}
            editMode={editMode}
            onUpdate={(entities) =>
              setEditedComponents((prev) => prev ? { ...prev, entities } : null)}
          />
        )}
        {activeTab === "relationships" && (
          <RelationshipsSection
            relationships={displayComponents?.relationships || []}
            editMode={editMode}
            onUpdate={(relationships) =>
              setEditedComponents((prev) => prev ? { ...prev, relationships } : null)}
          />
        )}
      </div>
    </div>
  );
}

// Loading State Component
function LoadingState({ className }: { className: string }) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex space-x-8 mb-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-gray-200 rounded w-20"></div>)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ className }: { className: string }) {
  return (
    <div
      className={`bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center ${className}`}
    >
      <div className="text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
        <div className="text-lg font-medium mb-2">No Query Components</div>
        <div className="text-sm">Query components will appear here once generated</div>
      </div>
    </div>
  );
}

// Queries Section Component
interface QueriesSectionProps {
  queries: SearchQuery[];
  editMode: boolean;
  onUpdate: (queries: SearchQuery[]) => void;
}

function QueriesSection({ queries, editMode, onUpdate }: QueriesSectionProps) {
  const handleQueryChange = (index: number, newQuery: string) => {
    const updatedQueries = [...queries];
    updatedQueries[index] = { search_query: newQuery };
    onUpdate(updatedQueries);
  };

  const handleAddQuery = () => {
    onUpdate([...queries, { search_query: "" }]);
  };

  const handleRemoveQuery = (index: number) => {
    const updatedQueries = queries.filter((_, i) => i !== index);
    onUpdate(updatedQueries);
  };

  if (queries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No search queries defined</div>
        {editMode && (
          <button
            onClick={handleAddQuery}
            className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Add Query
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {queries.map((query, index) => (
        <QueryCard
          key={index}
          query={query}
          index={index}
          editMode={editMode}
          onChange={handleQueryChange}
          onRemove={handleRemoveQuery}
        />
      ))}

      {editMode && (
        <button
          onClick={handleAddQuery}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add Query
        </button>
      )}
    </div>
  );
}

// Concepts Section Component
interface ConceptsSectionProps {
  concepts: Concept[];
  editMode: boolean;
  onUpdate: (concepts: Concept[]) => void;
}

function ConceptsSection({ concepts, editMode, onUpdate }: ConceptsSectionProps) {
  const handleConceptChange = (index: number, field: keyof Concept, value: any) => {
    const updatedConcepts = [...concepts];
    updatedConcepts[index] = { ...updatedConcepts[index], [field]: value };
    onUpdate(updatedConcepts);
  };

  const handleAddConcept = () => {
    const newConcept: Concept = {
      id: `concept-${Date.now()}`,
      name: "",
      description: "",
      importance: "medium",
      status: "pending",
    };
    onUpdate([...concepts, newConcept]);
  };

  const handleRemoveConcept = (index: number) => {
    const updatedConcepts = concepts.filter((_, i) => i !== index);
    onUpdate(updatedConcepts);
  };

  if (concepts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No concepts defined</div>
        {editMode && (
          <button
            onClick={handleAddConcept}
            className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Add Concept
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {concepts.map((concept, index) => (
        <ConceptCard
          key={concept.id}
          concept={concept}
          index={index}
          editMode={editMode}
          onChange={handleConceptChange}
          onRemove={handleRemoveConcept}
        />
      ))}

      {editMode && (
        <button
          onClick={handleAddConcept}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add Concept
        </button>
      )}
    </div>
  );
}

// Entities Section Component
interface EntitiesSectionProps {
  entities: Entity[];
  editMode: boolean;
  onUpdate: (entities: Entity[]) => void;
}

function EntitiesSection({ entities, editMode, onUpdate }: EntitiesSectionProps) {
  const handleEntityChange = (index: number, field: keyof Entity, value: any) => {
    const updatedEntities = [...entities];
    updatedEntities[index] = { ...updatedEntities[index], [field]: value };
    onUpdate(updatedEntities);
  };

  const handleAddEntity = () => {
    const newEntity: Entity = {
      id: `entity-${Date.now()}`,
      name: "",
      type: "",
      description: "",
      properties: {},
      status: "pending",
    };
    onUpdate([...entities, newEntity]);
  };

  const handleRemoveEntity = (index: number) => {
    const updatedEntities = entities.filter((_, i) => i !== index);
    onUpdate(updatedEntities);
  };

  if (entities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No entities defined</div>
        {editMode && (
          <button
            onClick={handleAddEntity}
            className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Add Entity
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entities.map((entity, index) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          index={index}
          editMode={editMode}
          onChange={handleEntityChange}
          onRemove={handleRemoveEntity}
        />
      ))}

      {editMode && (
        <button
          onClick={handleAddEntity}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add Entity
        </button>
      )}
    </div>
  );
}

// Relationships Section Component
interface RelationshipsSectionProps {
  relationships: Relationship[];
  editMode: boolean;
  onUpdate: (relationships: Relationship[]) => void;
}

function RelationshipsSection({ relationships, editMode, onUpdate }: RelationshipsSectionProps) {
  const handleRelationshipChange = (index: number, field: keyof Relationship, value: any) => {
    const updatedRelationships = [...relationships];
    updatedRelationships[index] = { ...updatedRelationships[index], [field]: value };
    onUpdate(updatedRelationships);
  };

  const handleAddRelationship = () => {
    const newRelationship: Relationship = {
      id: `relationship-${Date.now()}`,
      source_entity: "",
      target_entity: "",
      relationship_type: "",
      description: "",
      strength: "medium",
      status: "pending",
    };
    onUpdate([...relationships, newRelationship]);
  };

  const handleRemoveRelationship = (index: number) => {
    const updatedRelationships = relationships.filter((_, i) => i !== index);
    onUpdate(updatedRelationships);
  };

  if (relationships.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No relationships defined</div>
        {editMode && (
          <button
            onClick={handleAddRelationship}
            className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Add Relationship
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relationships.map((relationship, index) => (
        <RelationshipCard
          key={relationship.id}
          relationship={relationship}
          index={index}
          editMode={editMode}
          onChange={handleRelationshipChange}
          onRemove={handleRemoveRelationship}
        />
      ))}

      {editMode && (
        <button
          onClick={handleAddRelationship}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add Relationship
        </button>
      )}
    </div>
  );
}

// Individual Card Components

interface QueryCardProps {
  query: SearchQuery;
  index: number;
  editMode: boolean;
  onChange: (index: number, newQuery: string) => void;
  onRemove: (index: number) => void;
}

function QueryCard(
  { query, index, editMode, onChange, onRemove }: QueryCardProps,
): React.JSX.Element {
  const [localValue, setLocalValue] = useState(query.search_query);

  useEffect(() => {
    setLocalValue(query.search_query);
  }, [query.search_query]);

  const handleChange = (value: string) => {
    setLocalValue(value);
    onChange(index, value);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
              Query {index + 1}
            </span>
          </div>

          {editMode
            ? (
              <textarea
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="Enter search query..."
              />
            )
            : (
              <div className="text-gray-900 whitespace-pre-wrap">
                {query.search_query || <span className="text-gray-400 italic">Empty query</span>}
              </div>
            )}
        </div>

        {editMode && (
          <button
            onClick={() => onRemove(index)}
            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Remove query"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface ConceptCardProps {
  concept: Concept;
  index: number;
  editMode: boolean;
  onChange: (index: number, field: keyof Concept, value: any) => void;
  onRemove: (index: number) => void;
}

function ConceptCard(
  { concept, index, editMode, onChange, onRemove }: ConceptCardProps,
): React.JSX.Element {
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded border ${
              getImportanceColor(concept.importance)
            }`}
          >
            {concept.importance} priority
          </span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded border ${
              getStatusColor(concept.status)
            }`}
          >
            {concept.status}
          </span>
        </div>

        {editMode && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Remove concept"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          {editMode
            ? (
              <input
                type="text"
                value={concept.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Concept name..."
              />
            )
            : (
              <div className="text-gray-900 font-medium">
                {concept.name || <span className="text-gray-400 italic">Unnamed concept</span>}
              </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          {editMode
            ? (
              <textarea
                value={concept.description}
                onChange={(e) => onChange(index, "description", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="Concept description..."
              />
            )
            : (
              <div className="text-gray-700 text-sm">
                {concept.description || (
                  <span className="text-gray-400 italic">
                    No description
                  </span>
                )}
              </div>
            )}
        </div>

        {editMode && (
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Importance</label>
              <select
                value={concept.importance}
                onChange={(e) => onChange(index, "importance", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={concept.status}
                onChange={(e) => onChange(index, "status", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EntityCardProps {
  entity: Entity;
  index: number;
  editMode: boolean;
  onChange: (index: number, field: keyof Entity, value: any) => void;
  onRemove: (index: number) => void;
}

function EntityCard(
  { entity, index, editMode, onChange, onRemove }: EntityCardProps,
): React.JSX.Element {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
            {entity.type || "Entity"}
          </span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded border ${
              getStatusColor(entity.status)
            }`}
          >
            {entity.status}
          </span>
        </div>

        {editMode && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Remove entity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          {editMode
            ? (
              <input
                type="text"
                value={entity.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Entity name..."
              />
            )
            : (
              <div className="text-gray-900 font-medium">
                {entity.name || <span className="text-gray-400 italic">Unnamed entity</span>}
              </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          {editMode
            ? (
              <input
                type="text"
                value={entity.type}
                onChange={(e) => onChange(index, "type", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Entity type..."
              />
            )
            : (
              <div className="text-gray-700 text-sm">
                {entity.type || <span className="text-gray-400 italic">No type specified</span>}
              </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          {editMode
            ? (
              <textarea
                value={entity.description}
                onChange={(e) => onChange(index, "description", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="Entity description..."
              />
            )
            : (
              <div className="text-gray-700 text-sm">
                {entity.description || <span className="text-gray-400 italic">No description</span>}
              </div>
            )}
        </div>

        {editMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={entity.status}
              onChange={(e) => onChange(index, "status", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

interface RelationshipCardProps {
  relationship: Relationship;
  index: number;
  editMode: boolean;
  onChange: (index: number, field: keyof Relationship, value: any) => void;
  onRemove: (index: number) => void;
}

function RelationshipCard(
  { relationship, index, editMode, onChange, onRemove }: RelationshipCardProps,
): React.JSX.Element {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "weak":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded border ${
              getStrengthColor(relationship.strength)
            }`}
          >
            {relationship.strength} strength
          </span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded border ${
              getStatusColor(relationship.status)
            }`}
          >
            {relationship.status}
          </span>
        </div>

        {editMode && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Remove relationship"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Source Entity</label>
            {editMode
              ? (
                <input
                  type="text"
                  value={relationship.source_entity}
                  onChange={(e) => onChange(index, "source_entity", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Source entity..."
                />
              )
              : (
                <div className="text-gray-900 font-medium">
                  {relationship.source_entity || (
                    <span className="text-gray-400 italic">No source</span>
                  )}
                </div>
              )}
          </div>

          <div className="flex-shrink-0 pt-6">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Target Entity</label>
            {editMode
              ? (
                <input
                  type="text"
                  value={relationship.target_entity}
                  onChange={(e) => onChange(index, "target_entity", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Target entity..."
                />
              )
              : (
                <div className="text-gray-900 font-medium">
                  {relationship.target_entity || (
                    <span className="text-gray-400 italic">No target</span>
                  )}
                </div>
              )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
          {editMode
            ? (
              <input
                type="text"
                value={relationship.relationship_type}
                onChange={(e) => onChange(index, "relationship_type", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Relationship type..."
              />
            )
            : (
              <div className="text-gray-700 text-sm">
                {relationship.relationship_type || (
                  <span className="text-gray-400 italic">No type specified</span>
                )}
              </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          {editMode
            ? (
              <textarea
                value={relationship.description}
                onChange={(e) => onChange(index, "description", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="Relationship description..."
              />
            )
            : (
              <div className="text-gray-700 text-sm">
                {relationship.description || (
                  <span className="text-gray-400 italic">No description</span>
                )}
              </div>
            )}
        </div>

        {editMode && (
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
              <select
                value={relationship.strength}
                onChange={(e) => onChange(index, "strength", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="strong">Strong</option>
                <option value="medium">Medium</option>
                <option value="weak">Weak</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={relationship.status}
                onChange={(e) => onChange(index, "status", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryComponentsDisplay;
