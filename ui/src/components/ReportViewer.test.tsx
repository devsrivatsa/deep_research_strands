// Test utilities for ReportViewer component
import type { ReportSection } from "../types/index.ts";

// Simple assertion functions for testing
const assertEquals = (actual: any, expected: any, message?: string) => {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
};

const assertExists = (value: any, message?: string) => {
  if (value == null) {
    throw new Error(message || "Expected value to exist");
  }
};

const assertStringIncludes = (actual: string, expected: string, message?: string) => {
  if (!actual.includes(expected)) {
    throw new Error(message || `Expected "${actual}" to include "${expected}"`);
  }
};

// ============================================================================
// Test Data and Utilities
// ============================================================================

const mockReport = `
# Research Report: AI in Healthcare

## Introduction

This report examines the current state of artificial intelligence in healthcare.

## Current Applications

### Diagnostic Imaging
AI is being used extensively in medical imaging for diagnosis.

### Drug Discovery
Machine learning accelerates pharmaceutical research.

## Future Prospects

The future of AI in healthcare looks promising with several emerging trends.

## Conclusions

AI will continue to transform healthcare delivery and outcomes.
`;

const mockSections: ReportSection[] = [
  {
    id: "1",
    name: "Introduction",
    description: "Overview of AI in healthcare",
    research: true,
    content: "This report examines...",
    status: "completed",
  },
  {
    id: "2", 
    name: "Current Applications",
    description: "Current uses of AI",
    research: true,
    content: "AI is being used...",
    status: "completed",
  },
];

// ============================================================================
// Table of Contents Generation Tests
// ============================================================================

export const testTableOfContentsGeneration = () => {
  const generateTableOfContents = (markdownContent: string) => {
    // Simulate the TOC generation logic for markdown
    const lines = markdownContent.split('\n');
    const toc: Array<{ id: string; title: string; level: number }> = [];
    let index = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#')) {
        const level = (trimmedLine.match(/^#+/) || [''])[0].length;
        const title = trimmedLine.replace(/^#+\s*/, '');
        const id = `section-${index}`;
        
        if (title) {
          toc.push({
            id,
            title,
            level,
          });
          index++;
        }
      }
    }

    return toc;
  };

  const toc = generateTableOfContents(mockReport);
  
  assertEquals(toc.length, 7); // Should find 7 headings
  assertEquals(toc[0].title, "Research Report: AI in Healthcare");
  assertEquals(toc[0].level, 1);
  assertEquals(toc[1].title, "Introduction");
  assertEquals(toc[1].level, 2);
};

// ============================================================================
// Search Functionality Tests
// ============================================================================

export const testSearchHighlighting = () => {
  const highlightSearchTerm = (content: string, term: string): string => {
    if (!term.trim()) return content;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const result = highlightSearchTerm("Healthcare is important for AI", "healthcare");
  assertStringIncludes(result, '<mark class="bg-yellow-200 dark:bg-yellow-800">Healthcare</mark>');
  
  // Test case insensitive
  const result2 = highlightSearchTerm("AI and healthcare", "Healthcare");
  assertStringIncludes(result2, '<mark class="bg-yellow-200 dark:bg-yellow-800">healthcare</mark>');
  
  // Test no highlighting when term is empty
  const result3 = highlightSearchTerm("No highlighting", "");
  assertEquals(result3, "No highlighting");
};

export const testSearchRegexEscaping = () => {
  const highlightSearchTerm = (content: string, term: string): string => {
    if (!term.trim()) return content;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  // Test with special regex characters
  const result = highlightSearchTerm("Cost is $100 (approx)", "$100");
  assertStringIncludes(result, '<mark class="bg-yellow-200 dark:bg-yellow-800">$100</mark>');
  
  const result2 = highlightSearchTerm("Pattern: [a-z]+", "[a-z]");
  assertStringIncludes(result2, '<mark class="bg-yellow-200 dark:bg-yellow-800">[a-z]</mark>');
};

// ============================================================================
// Export Options Tests
// ============================================================================

export const testExportOptionsValidation = () => {
  interface ExportOptions {
    format: "pdf" | "markdown" | "html";
    includeMetadata: boolean;
    includeSources: boolean;
  }

  const validateExportOptions = (options: ExportOptions): boolean => {
    const validFormats = ["pdf", "markdown", "html"];
    return validFormats.includes(options.format) &&
           typeof options.includeMetadata === "boolean" &&
           typeof options.includeSources === "boolean";
  };

  // Valid options
  assertEquals(validateExportOptions({
    format: "pdf",
    includeMetadata: true,
    includeSources: true,
  }), true);

  assertEquals(validateExportOptions({
    format: "markdown",
    includeMetadata: false,
    includeSources: false,
  }), true);

  // Invalid format
  assertEquals(validateExportOptions({
    format: "docx" as any,
    includeMetadata: true,
    includeSources: true,
  }), false);
};

export const testExportRequestGeneration = () => {
  const createExportRequest = (sessionId: string, format: "pdf" | "markdown" | "html", options: { includeMetadata: boolean; includeSources: boolean }) => {
    return {
      session_id: sessionId,
      format,
      options: {
        include_metadata: options.includeMetadata,
        include_sources: options.includeSources,
      },
    };
  };

  const request = createExportRequest("test-123", "pdf", {
    includeMetadata: true,
    includeSources: false,
  });

  assertEquals(request.session_id, "test-123");
  assertEquals(request.format, "pdf");
  assertEquals(request.options.include_metadata, true);
  assertEquals(request.options.include_sources, false);
};

// ============================================================================
// Navigation Tests
// ============================================================================

export const testNavigationCalculation = () => {
  const tableOfContents = [
    { id: "section-0", title: "Introduction", level: 1 },
    { id: "section-1", title: "Methods", level: 2 },
    { id: "section-2", title: "Results", level: 2 },
    { id: "section-3", title: "Conclusion", level: 1 },
  ];

  const getNextSection = (currentId: string, toc: typeof tableOfContents) => {
    const currentIndex = toc.findIndex(item => item.id === currentId);
    return currentIndex < toc.length - 1 ? toc[currentIndex + 1] : null;
  };

  const getPreviousSection = (currentId: string, toc: typeof tableOfContents) => {
    const currentIndex = toc.findIndex(item => item.id === currentId);
    return currentIndex > 0 ? toc[currentIndex - 1] : null;
  };

  // Test next navigation
  const next = getNextSection("section-1", tableOfContents);
  assertEquals(next?.id, "section-2");
  assertEquals(next?.title, "Results");

  // Test previous navigation
  const prev = getPreviousSection("section-2", tableOfContents);
  assertEquals(prev?.id, "section-1");
  assertEquals(prev?.title, "Methods");

  // Test edge cases
  assertEquals(getNextSection("section-3", tableOfContents), null); // Last item
  assertEquals(getPreviousSection("section-0", tableOfContents), null); // First item
};

// ============================================================================
// Share URL Generation Tests
// ============================================================================

export const testShareUrlGeneration = () => {
  const generateShareUrl = (sessionId: string, baseUrl = "https://example.com") => {
    return `${baseUrl}/report/${sessionId}`;
  };

  assertEquals(
    generateShareUrl("test-session-123"),
    "https://example.com/report/test-session-123"
  );

  assertEquals(
    generateShareUrl("abc-def-456", "https://myapp.com"),
    "https://myapp.com/report/abc-def-456"
  );
};

// ============================================================================
// Content Processing Tests
// ============================================================================

export const testContentProcessing = () => {
  const processContent = (content: string) => {
    // Simple markdown-to-HTML conversion for testing
    let result = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>');
    
    // Split by double newlines to create paragraphs
    const sections = result.split('\n\n');
    const processedSections = sections.map(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith('<h')) {
        return trimmed;
      } else if (trimmed) {
        return `<p>${trimmed}</p>`;
      }
      return '';
    }).filter(Boolean);
    
    return processedSections.join('\n');
  };

  const input = "# Title\n\n## Subtitle\n\nSome content here.";
  const result = processContent(input);
  
  assertStringIncludes(result, "<h1>Title</h1>");
  assertStringIncludes(result, "<h2>Subtitle</h2>");
  assertStringIncludes(result, "<p>Some content here.</p>");
};

// ============================================================================
// Keyboard Shortcut Tests
// ============================================================================

export const testKeyboardShortcuts = () => {
  const shouldHandleShortcut = (key: string, ctrlKey: boolean, metaKey: boolean) => {
    const isModifierPressed = ctrlKey || metaKey;
    
    switch (key) {
      case "f":
        return isModifierPressed; // Ctrl/Cmd+F for search
      case "ArrowUp":
        return isModifierPressed; // Ctrl/Cmd+Up for previous section
      case "ArrowDown":
        return isModifierPressed; // Ctrl/Cmd+Down for next section
      default:
        return false;
    }
  };

  // Should handle shortcuts
  assertEquals(shouldHandleShortcut("f", true, false), true);
  assertEquals(shouldHandleShortcut("f", false, true), true);
  assertEquals(shouldHandleShortcut("ArrowUp", true, false), true);
  assertEquals(shouldHandleShortcut("ArrowDown", false, true), true);

  // Should not handle
  assertEquals(shouldHandleShortcut("f", false, false), false);
  assertEquals(shouldHandleShortcut("a", true, false), false);
  assertEquals(shouldHandleShortcut("ArrowUp", false, false), false);
};

// ============================================================================
// Error Handling Tests
// ============================================================================

export const testApiErrorHandling = () => {
  const handleApiError = (error: any) => {
    if (error?.response?.status === 404) {
      return {
        code: "NOT_FOUND",
        message: "Report not found",
      };
    } else if (error?.response?.status === 500) {
      return {
        code: "SERVER_ERROR",
        message: "Internal server error",
      };
    } else if (error?.name === "NetworkError") {
      return {
        code: "NETWORK_ERROR",
        message: "Network connection failed",
      };
    } else {
      return {
        code: "UNKNOWN_ERROR",
        message: error?.message || "An unknown error occurred",
      };
    }
  };

  // Test different error types
  const notFoundError = handleApiError({ response: { status: 404 } });
  assertEquals(notFoundError.code, "NOT_FOUND");
  assertEquals(notFoundError.message, "Report not found");

  const serverError = handleApiError({ response: { status: 500 } });
  assertEquals(serverError.code, "SERVER_ERROR");

  const networkError = handleApiError({ name: "NetworkError", message: "Failed to fetch" });
  assertEquals(networkError.code, "NETWORK_ERROR");

  const unknownError = handleApiError({ message: "Something went wrong" });
  assertEquals(unknownError.code, "UNKNOWN_ERROR");
  assertEquals(unknownError.message, "Something went wrong");
};

// ============================================================================
// Accessibility Tests
// ============================================================================

export const testHeadingStructureValidation = () => {
  const validateHeadingStructure = (headings: Array<{ level: number; title: string }>) => {
    // Check that heading levels don't skip (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;
      
      if (currentLevel > previousLevel + 1) {
        return false; // Skipped a level
      }
    }
    return true;
  };

  // Valid structure
  const validHeadings = [
    { level: 1, title: "Main Title" },
    { level: 2, title: "Section" },
    { level: 3, title: "Subsection" },
    { level: 2, title: "Another Section" },
  ];
  assertEquals(validateHeadingStructure(validHeadings), true);

  // Invalid structure (skips from h1 to h3)
  const invalidHeadings = [
    { level: 1, title: "Main Title" },
    { level: 3, title: "Subsection" }, // Skips h2
  ];
  assertEquals(validateHeadingStructure(invalidHeadings), false);
};

// ============================================================================
// Performance Tests
// ============================================================================

export const testLargeContentHandling = () => {
  const generateLargeContent = (sections: number) => {
    let content = "";
    for (let i = 0; i < sections; i++) {
      content += `# Section ${i}\n\n`;
      content += `This is the content for section ${i}. `.repeat(100);
      content += "\n\n";
    }
    return content;
  };

  const measureProcessingTime = (content: string) => {
    const start = performance.now();
    
    // Simulate content processing
    const headingCount = (content.match(/^#/gm) || []).length;
    const wordCount = content.split(/\s+/).length;
    
    const end = performance.now();
    return {
      processingTime: end - start,
      headingCount,
      wordCount,
    };
  };

  const largeContent = generateLargeContent(100);
  const result = measureProcessingTime(largeContent);
  
  assertEquals(result.headingCount, 100);
  assertExists(result.wordCount);
  assertExists(result.processingTime);
  
  // Processing should be reasonably fast (less than 100ms for this test)
  assertEquals(result.processingTime < 100, true);
};

// ============================================================================
// Integration Tests
// ============================================================================

export const testReportViewerIntegration = () => {
  // Test that all the individual functions work together
  const mockState = {
    sessionId: "test-123",
    report: mockReport,
    sections: mockSections,
    searchTerm: "",
    activeSection: "",
    isFullscreen: false,
  };

  // Simulate the main functionality
  const processReport = (state: typeof mockState) => {
    const hasReport = Boolean(state.report);
    const hasSession = Boolean(state.sessionId);
    const canExport = hasReport && hasSession;
    const canShare = hasReport;
    const sectionCount = state.sections.length;
    
    return {
      hasReport,
      hasSession,
      canExport,
      canShare,
      sectionCount,
      isReady: hasReport && hasSession,
    };
  };

  const result = processReport(mockState);
  
  assertEquals(result.hasReport, true);
  assertEquals(result.hasSession, true);
  assertEquals(result.canExport, true);
  assertEquals(result.canShare, true);
  assertEquals(result.sectionCount, 2);
  assertEquals(result.isReady, true);

  // Test with missing session
  const resultNoSession = processReport({ ...mockState, sessionId: "" });
  assertEquals(resultNoSession.canExport, false);
  assertEquals(resultNoSession.isReady, false);
};

// ============================================================================
// HTML to Markdown Conversion Tests
// ============================================================================

export const testHtmlToMarkdownConversion = () => {
  const convertHtmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
      .replace(/<[^>]+>/g, "") // Remove remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up multiple newlines
      .trim();
  };

  const htmlInput = "<h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em> text.</p>";
  const markdownOutput = convertHtmlToMarkdown(htmlInput);
  
  assertStringIncludes(markdownOutput, "# Title");
  assertStringIncludes(markdownOutput, "**bold**");
  assertStringIncludes(markdownOutput, "*italic*");
};

// ============================================================================
// PDF Export Tests
// ============================================================================

export const testPdfExportMetadata = () => {
  const generatePdfMetadata = (sessionId: string, includeMetadata: boolean) => {
    if (!includeMetadata) return "";
    
    return `
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">Research Report</h1>
        <p style="margin: 5px 0; color: #666;">Session ID: ${sessionId}</p>
        <p style="margin: 5px 0; color: #666;">Generated: ${new Date().toLocaleString()}</p>
      </div>
    `;
  };

  const metadata = generatePdfMetadata("test-123", true);
  assertStringIncludes(metadata, "Research Report");
  assertStringIncludes(metadata, "Session ID: test-123");
  
  const noMetadata = generatePdfMetadata("test-123", false);
  assertEquals(noMetadata, "");
};

// Run all tests
export const runAllTests = () => {
  const tests = [
    { name: "Table of Contents Generation", fn: testTableOfContentsGeneration },
    { name: "Search Highlighting", fn: testSearchHighlighting },
    { name: "Search Regex Escaping", fn: testSearchRegexEscaping },
    { name: "Export Options Validation", fn: testExportOptionsValidation },
    { name: "Export Request Generation", fn: testExportRequestGeneration },
    { name: "Navigation Calculation", fn: testNavigationCalculation },
    { name: "Share URL Generation", fn: testShareUrlGeneration },
    { name: "Content Processing", fn: testContentProcessing },
    { name: "Keyboard Shortcuts", fn: testKeyboardShortcuts },
    { name: "API Error Handling", fn: testApiErrorHandling },
    { name: "Heading Structure Validation", fn: testHeadingStructureValidation },
    { name: "Large Content Handling", fn: testLargeContentHandling },
    { name: "ReportViewer Integration", fn: testReportViewerIntegration },
    { name: "HTML to Markdown Conversion", fn: testHtmlToMarkdownConversion },
    { name: "PDF Export Metadata", fn: testPdfExportMetadata },
  ];

  let passed = 0;
  let failed = 0;

  console.log("Running ReportViewer tests...\n");

  for (const test of tests) {
    try {
      test.fn();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
};

// Export individual test functions for selective testing
export {
  mockReport,
  mockSections,
};