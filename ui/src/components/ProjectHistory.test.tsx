import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { Project, ResearchSessionResponse } from "../types/index.ts";

// Test data for ProjectHistory component
const mockSessions: ResearchSessionResponse[] = [
  {
    session_id: "session1",
    topic: "AI Research Topic",
    status: "completed",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
  },
  {
    session_id: "session2",
    topic: "Machine Learning Study",
    status: "researching",
    created_at: "2024-01-02T10:00:00Z",
    updated_at: "2024-01-02T11:30:00Z",
  },
  {
    session_id: "session3",
    topic: "Data Science Analysis",
    status: "failed",
    created_at: "2024-01-03T10:00:00Z",
    updated_at: "2024-01-03T10:30:00Z",
  },
];

const mockProject: Project = {
  id: "1",
  name: "Test Project",
  description: "Test project description",
  created_at: "2024-01-01T10:00:00Z",
  updated_at: "2024-01-05T10:45:00Z",
  sessions: mockSessions,
  status: "active",
};

// Test session filtering logic
Deno.test("ProjectHistory - filters sessions by status", () => {
  const filterSessionsByStatus = (sessions: ResearchSessionResponse[], status: string) => {
    if (status === "all") return sessions;
    return sessions.filter((session) => session.status === status);
  };

  const completedSessions = filterSessionsByStatus(mockSessions, "completed");
  assertEquals(completedSessions.length, 1);
  assertEquals(completedSessions[0].topic, "AI Research Topic");

  const allSessions = filterSessionsByStatus(mockSessions, "all");
  assertEquals(allSessions.length, 3);
});

// Test session sorting logic
Deno.test("ProjectHistory - sorts sessions by different criteria", () => {
  const sortSessions = (sessions: ResearchSessionResponse[], sortBy: string, sortOrder: string) => {
    return [...sessions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "updated_at":
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedByDate = sortSessions(mockSessions, "created_at", "desc");
  assertEquals(sortedByDate[0].topic, "Data Science Analysis"); // Most recent

  const sortedByStatus = sortSessions(mockSessions, "status", "asc");
  assertEquals(sortedByStatus[0].status, "completed"); // Alphabetically first
});

// Test status badge class generation
Deno.test("ProjectHistory - generates correct status badge classes", () => {
  const getStatusBadgeClass = (status: ResearchSessionResponse["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "researching":
      case "writing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "planning":
      case "awaiting_feedback":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "failed":
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "created":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  assertEquals(getStatusBadgeClass("completed"), "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200");
  assertEquals(getStatusBadgeClass("researching"), "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200");
  assertEquals(getStatusBadgeClass("failed"), "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200");
});

// Test duration calculation
Deno.test("ProjectHistory - calculates duration correctly", () => {
  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  // 2 hour difference
  const duration1 = formatDuration("2024-01-01T10:00:00Z", "2024-01-01T12:00:00Z");
  assertEquals(duration1, "2h 0m");

  // 90 minute difference
  const duration2 = formatDuration("2024-01-01T10:00:00Z", "2024-01-01T11:30:00Z");
  assertEquals(duration2, "1h 30m");

  // 30 minute difference
  const duration3 = formatDuration("2024-01-01T10:00:00Z", "2024-01-01T10:30:00Z");
  assertEquals(duration3, "30m");

  // Same time
  const duration4 = formatDuration("2024-01-01T10:00:00Z", "2024-01-01T10:00:00Z");
  assertEquals(duration4, "0m");
});

// Test date formatting
Deno.test("ProjectHistory - formats dates correctly", () => {
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

// Test empty state logic
Deno.test("ProjectHistory - determines empty state messages", () => {
  const getEmptyStateMessage = (totalSessions: number, statusFilter: string) => {
    if (totalSessions === 0) {
      return "This project doesn't have any research sessions yet.";
    }
    if (statusFilter !== "all") {
      return `No sessions with status "${statusFilter}".`;
    }
    return "No sessions found.";
  };

  assertEquals(getEmptyStateMessage(0, "all"), "This project doesn't have any research sessions yet.");
  assertEquals(getEmptyStateMessage(5, "completed"), 'No sessions with status "completed".');
  assertEquals(getEmptyStateMessage(5, "all"), "No sessions found.");
});

// Test status icon determination
Deno.test("ProjectHistory - determines correct status icons", () => {
  const getStatusIconType = (status: ResearchSessionResponse["status"]) => {
    switch (status) {
      case "completed":
        return "check";
      case "researching":
      case "writing":
        return "spinner";
      case "planning":
      case "awaiting_feedback":
        return "clock";
      case "failed":
        return "exclamation";
      case "cancelled":
        return "x";
      default:
        return "circle";
    }
  };

  assertEquals(getStatusIconType("completed"), "check");
  assertEquals(getStatusIconType("researching"), "spinner");
  assertEquals(getStatusIconType("planning"), "clock");
  assertEquals(getStatusIconType("failed"), "exclamation");
  assertEquals(getStatusIconType("cancelled"), "x");
});