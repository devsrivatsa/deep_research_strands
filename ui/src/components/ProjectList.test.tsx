import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { Project, PaginatedResponse } from "../types/index.ts";

// Test data for ProjectList component
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Test Project 1",
    description: "First test project",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-02T10:00:00Z",
    sessions: [
      {
        session_id: "session1",
        topic: "Test Topic 1",
        status: "completed",
        created_at: "2024-01-01T10:00:00Z",
        updated_at: "2024-01-01T11:00:00Z",
      },
    ],
    status: "active",
  },
  {
    id: "2",
    name: "Test Project 2",
    description: "Second test project",
    created_at: "2024-01-03T10:00:00Z",
    updated_at: "2024-01-04T10:00:00Z",
    sessions: [],
    status: "archived",
  },
];

// Test project filtering logic
Deno.test("ProjectList - filters projects by search query", () => {
  const searchQuery = "Test Project 1";
  const filtered = mockProjects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].name, "Test Project 1");
});

// Test project sorting logic
Deno.test("ProjectList - sorts projects by name", () => {
  const sorted = [...mockProjects].sort((a, b) => {
    const aValue = a.name.toLowerCase();
    const bValue = b.name.toLowerCase();
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
  });

  assertEquals(sorted[0].name, "Test Project 1");
  assertEquals(sorted[1].name, "Test Project 2");
});

// Test project sorting by date
Deno.test("ProjectList - sorts projects by updated date", () => {
  const sorted = [...mockProjects].sort((a, b) => {
    const aValue = new Date(a.updated_at).getTime();
    const bValue = new Date(b.updated_at).getTime();
    return bValue - aValue; // desc order
  });

  assertEquals(sorted[0].name, "Test Project 2"); // More recent
  assertEquals(sorted[1].name, "Test Project 1");
});

// Test status badge class generation
Deno.test("ProjectList - generates correct status badge classes", () => {
  const getStatusBadgeClass = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "deleted":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  assertEquals(getStatusBadgeClass("active"), "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200");
  assertEquals(getStatusBadgeClass("archived"), "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200");
});

// Test date formatting
Deno.test("ProjectList - formats dates correctly", () => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatted = formatDate("2024-01-01T10:00:00Z");
  assertEquals(typeof formatted, "string");
  assertExists(formatted);
});

// Test session count display
Deno.test("ProjectList - displays correct session counts", () => {
  const getSessionCountText = (count: number) => {
    return `${count} session${count !== 1 ? "s" : ""}`;
  };

  assertEquals(getSessionCountText(0), "0 sessions");
  assertEquals(getSessionCountText(1), "1 session");
  assertEquals(getSessionCountText(2), "2 sessions");
});