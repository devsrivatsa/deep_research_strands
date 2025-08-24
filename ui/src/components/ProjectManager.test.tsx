import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { Project, CreateProjectRequest } from "../types/index.ts";

// Test data for ProjectManager component
const mockProject: Project = {
  id: "1",
  name: "Test Project",
  description: "Test project description",
  created_at: "2024-01-01T10:00:00Z",
  updated_at: "2024-01-02T10:00:00Z",
  sessions: [],
  status: "active",
};

// Test form validation logic
Deno.test("ProjectManager - validates required project name", () => {
  const validateForm = (formData: CreateProjectRequest) => {
    if (!formData.name.trim()) {
      return "Project name is required";
    }
    return null;
  };

  assertEquals(validateForm({ name: "", description: "" }), "Project name is required");
  assertEquals(validateForm({ name: "   ", description: "" }), "Project name is required");
  assertEquals(validateForm({ name: "Valid Name", description: "" }), null);
});

// Test form data preparation
Deno.test("ProjectManager - prepares form data correctly", () => {
  const prepareFormData = (project?: Project): CreateProjectRequest => {
    return {
      name: project?.name || "",
      description: project?.description || "",
    };
  };

  const newProjectData = prepareFormData();
  assertEquals(newProjectData.name, "");
  assertEquals(newProjectData.description, "");

  const editProjectData = prepareFormData(mockProject);
  assertEquals(editProjectData.name, "Test Project");
  assertEquals(editProjectData.description, "Test project description");
});

// Test edit mode detection
Deno.test("ProjectManager - detects edit mode correctly", () => {
  const isEditMode = (project?: Project) => !!project;

  assertEquals(isEditMode(undefined), false);
  assertEquals(isEditMode(mockProject), true);
});

// Test archive button visibility logic
Deno.test("ProjectManager - shows archive button for active projects only", () => {
  const shouldShowArchiveButton = (project?: Project) => {
    return project?.status === "active";
  };

  assertEquals(shouldShowArchiveButton(undefined), false);
  assertEquals(shouldShowArchiveButton(mockProject), true);
  assertEquals(shouldShowArchiveButton({ ...mockProject, status: "archived" }), false);
});

// Test form submission data
Deno.test("ProjectManager - creates correct API request data", () => {
  const createAPIRequest = (formData: CreateProjectRequest) => {
    return {
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
    };
  };

  const request = createAPIRequest({
    name: "  New Project  ",
    description: "  Project description  ",
  });

  assertEquals(request.name, "New Project");
  assertEquals(request.description, "Project description");

  const requestWithoutDescription = createAPIRequest({
    name: "Project Name",
    description: "",
  });

  assertEquals(requestWithoutDescription.name, "Project Name");
  assertEquals(requestWithoutDescription.description, undefined);
});

// Test button state logic
Deno.test("ProjectManager - determines submit button state", () => {
  const isSubmitDisabled = (loading: boolean, name: string) => {
    return loading || !name.trim();
  };

  assertEquals(isSubmitDisabled(false, ""), true);
  assertEquals(isSubmitDisabled(false, "   "), true);
  assertEquals(isSubmitDisabled(true, "Valid Name"), true);
  assertEquals(isSubmitDisabled(false, "Valid Name"), false);
});

// Test error message formatting
Deno.test("ProjectManager - formats error messages correctly", () => {
  const formatErrorMessage = (error: any, operation: "create" | "update" | "delete" | "archive") => {
    if (error?.message) {
      return error.message;
    }
    return `Failed to ${operation} project`;
  };

  assertEquals(formatErrorMessage(null, "create"), "Failed to create project");
  assertEquals(formatErrorMessage({ message: "Custom error" }, "update"), "Custom error");
  assertEquals(formatErrorMessage({}, "delete"), "Failed to delete project");
});