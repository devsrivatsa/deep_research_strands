import React, { useState, useCallback } from "react";
import { ResearchPlan, Section } from "../types/index.ts";
import clsx from "clsx";

interface ResearchPlanViewerProps {
  plan: ResearchPlan;
  onApprove?: () => void;
  onRequestChanges?: (feedback: string) => void;
  onSectionToggle?: (sectionName: string, enabled: boolean) => void;
  isLoading?: boolean;
  className?: string;
}

export function ResearchPlanViewer({
  plan,
  onApprove,
  onRequestChanges,
  onSectionToggle,
  isLoading = false,
  className,
}: ResearchPlanViewerProps): React.ReactElement {
  const [feedback, setFeedback] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleSectionExpand = useCallback((sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  }, []);

  const handleApprove = useCallback(() => {
    onApprove?.();
  }, [onApprove]);

  const handleSubmitFeedback = useCallback(() => {
    if (feedback.trim()) {
      onRequestChanges?.(feedback.trim());
      setFeedback("");
      setShowFeedbackForm(false);
    }
  }, [feedback, onRequestChanges]);

  const handleRequestChanges = useCallback(() => {
    setShowFeedbackForm(true);
  }, []);

  if (!plan || !plan.sections || plan.sections.length === 0) {
    return (
      <div className={clsx("p-6 text-center text-gray-500 dark:text-gray-400", className)}>
        <div className="text-lg font-medium mb-2">No research plan available</div>
        <div className="text-sm">A research plan will appear here once generated.</div>
      </div>
    );
  }

  return (
    <div className={clsx("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Research Plan</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {plan.sections.length} section{plan.sections.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Draft
            </span>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {plan.sections.map((section, index) => {
          const isExpanded = expandedSections.has(section.name);
          return (
            <div key={section.name} className="p-3 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 break-words">{section.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">{section.description}</p>
                    </div>
                  </div>
                  
                  {/* Section Details */}
                  {isExpanded && (
                    <div className="mt-3 sm:mt-4 ml-8 sm:ml-11 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Research Required:</span>
                          <span className={clsx(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            section.research 
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          )}>
                            {section.research ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                      
                      {section.content && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 sm:p-3">
                          <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Initial Content:</h4>
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{section.content}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 ml-2 sm:ml-4">
                  {onSectionToggle && (
                    <button
                      onClick={() => onSectionToggle(section.name, !section.research)}
                      className={clsx(
                        "px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors touch-manipulation",
                        section.research
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                      )}
                    >
                      {section.research ? "Enabled" : "Disabled"}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleSectionExpand(section.name)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <svg
                      className={clsx("w-4 h-4 sm:w-5 sm:h-5 transition-transform", isExpanded && "rotate-180")}
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

      {/* Action Buttons */}
      {(onApprove || onRequestChanges) && (
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          {!showFeedbackForm ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              {onRequestChanges && (
                <button
                  onClick={handleRequestChanges}
                  disabled={isLoading}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  Request Changes
                </button>
              )}
              {onApprove && (
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="px-3 sm:px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  {isLoading ? "Processing..." : "Approve Plan"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="feedback" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What changes would you like to see?
                </label>
                <textarea
                  id="feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm touch-manipulation"
                  placeholder="Describe the changes you'd like to see in the research plan..."
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowFeedbackForm(false);
                    setFeedback("");
                  }}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim() || isLoading}
                  className="px-3 sm:px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResearchPlanViewer;