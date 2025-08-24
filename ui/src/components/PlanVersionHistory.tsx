import React, { useState } from "react";
import { ResearchPlan } from "../types/index.ts";
import clsx from "clsx";

interface PlanVersion {
  id: string;
  version: number;
  plan: ResearchPlan;
  timestamp: string;
  changes: string[];
  feedback?: string;
  status: "draft" | "approved" | "rejected";
}

interface PlanVersionHistoryProps {
  versions: PlanVersion[];
  currentVersionId: string;
  onVersionSelect?: (versionId: string) => void;
  onVersionRestore?: (versionId: string) => void;
  className?: string;
}

export function PlanVersionHistory({
  versions,
  currentVersionId,
  onVersionSelect,
  onVersionRestore,
  className,
}: PlanVersionHistoryProps): React.ReactElement {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const handleVersionExpand = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: PlanVersion["status"]) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "draft":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: PlanVersion["status"]) => {
    switch (status) {
      case "approved":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case "rejected":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case "draft":
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (versions.length === 0) {
    return (
      <div className={clsx("p-6 text-center text-gray-500", className)}>
        <div className="text-lg font-medium mb-2">No version history</div>
        <div className="text-sm">Plan versions will appear here as they are created.</div>
      </div>
    );
  }

  return (
    <div className={clsx("bg-white rounded-lg shadow-sm border", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Plan Version History</h2>
        <p className="text-sm text-gray-600 mt-1">
          {versions.length} version{versions.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Version List */}
      <div className="divide-y divide-gray-200">
        {versions.map((version) => {
          const isExpanded = expandedVersions.has(version.id);
          const isCurrent = version.id === currentVersionId;
          
          return (
            <div key={version.id} className={clsx("p-6", isCurrent && "bg-blue-50")}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className={clsx(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        isCurrent ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                      )}>
                        v{version.version}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={clsx(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          getStatusColor(version.status)
                        )}>
                          {getStatusIcon(version.status)}
                          <span className="ml-1 capitalize">{version.status}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(version.timestamp)}
                        </span>
                      </div>
                      
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          {version.plan.sections.length} section{version.plan.sections.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Version Details */}
                  {isExpanded && (
                    <div className="mt-4 ml-11 space-y-4">
                      {/* Changes */}
                      {version.changes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Changes:</h4>
                          <ul className="space-y-1">
                            {version.changes.map((change, index) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start">
                                <span className="text-gray-400 mr-2">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Feedback */}
                      {version.feedback && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Feedback:</h4>
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm text-gray-700">{version.feedback}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Sections Preview */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Sections:</h4>
                        <div className="space-y-2">
                          {version.plan.sections.map((section, index) => (
                            <div key={section.name} className="flex items-center space-x-2 text-sm">
                              <span className="text-gray-400">{index + 1}.</span>
                              <span className="text-gray-700">{section.name}</span>
                              {section.research && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Research
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {onVersionSelect && !isCurrent && (
                    <button
                      onClick={() => onVersionSelect(version.id)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View
                    </button>
                  )}
                  
                  {onVersionRestore && !isCurrent && version.status === "approved" && (
                    <button
                      onClick={() => onVersionRestore(version.id)}
                      className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
                    >
                      Restore
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleVersionExpand(version.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className={clsx("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlanVersionHistory;