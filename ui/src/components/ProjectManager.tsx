import React, { useState } from "react";
import { apiClient } from "../utils/APIClient.ts";
import { useAppStore } from "../store/index.ts";
import type { Project, CreateProjectRequest } from "../types/index.ts";

interface ProjectManagerProps {
  project?: Project;
  onProjectCreated?: (project: Project) => void;
  onProjectUpdated?: (project: Project) => void;
  onProjectDeleted?: (projectId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export default function ProjectManager({
  project,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  onCancel,
  className,
}: ProjectManagerProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: project?.name || "",
    description: project?.description || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { setLoadingState, setErrorState } = useAppStore();

  const isEditing = !!project;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setLoading(true);
    setLoadingState("project-save", true);
    setError(null);

    try {
      let response;
      
      if (isEditing) {
        response = await apiClient.updateProject(project.id, formData);
      } else {
        response = await apiClient.createProject(formData);
      }

      if (response.success && response.data) {
        if (isEditing) {
          onProjectUpdated?.(response.data);
        } else {
          onProjectCreated?.(response.data);
        }
      } else {
        setError(response.error?.message || `Failed to ${isEditing ? "update" : "create"} project`);
        setErrorState("project-save", response.error || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} project`;
      setError(errorMessage);
      setErrorState("project-save", {
        code: "SAVE_ERROR",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingState("project-save", false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setLoading(true);
    setLoadingState("project-delete", true);
    setError(null);

    try {
      const response = await apiClient.deleteProject(project.id);

      if (response.success) {
        onProjectDeleted?.(project.id);
      } else {
        setError(response.error?.message || "Failed to delete project");
        setErrorState("project-delete", response.error || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete project";
      setError(errorMessage);
      setErrorState("project-delete", {
        code: "DELETE_ERROR",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingState("project-delete", false);
      setShowDeleteConfirm(false);
    }
  };

  const handleArchive = async () => {
    if (!project) return;

    setLoading(true);
    setLoadingState("project-archive", true);
    setError(null);

    try {
      const response = await apiClient.archiveProject(project.id);

      if (response.success && response.data) {
        onProjectUpdated?.(response.data);
      } else {
        setError(response.error?.message || "Failed to archive project");
        setErrorState("project-archive", response.error || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to archive project";
      setError(errorMessage);
      setErrorState("project-archive", {
        code: "ARCHIVE_ERROR",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingState("project-archive", false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className || ""}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {isEditing ? "Edit Project" : "Create New Project"}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter project name"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional project description"
          />
        </div>

        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            {isEditing && project?.status === "active" && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Archive
              </button>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {isEditing ? "Update Project" : "Create Project"}
            </button>
          </div>
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Delete Project
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and will
              permanently remove the project and all its research sessions.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}