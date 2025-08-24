import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store/index.ts";
import { apiClient } from "../utils/index.ts";
import type { ReportSection } from "../types/index.ts";
import clsx from "clsx";
import { generatePDF, captureScreenshot } from "../utils/lazyImports.ts";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface ReportViewerProps {
  report?: string;
  sections?: ReportSection[];
  sessionId?: string;
  className?: string;
  onExport?: (format: "pdf" | "markdown" | "html") => void;
  onShare?: (content: string) => void;
  isLoading?: boolean;
}

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  element?: HTMLElement;
}

interface ExportOptions {
  format: "pdf" | "markdown" | "html";
  includeMetadata: boolean;
  includeSources: boolean;
}

// ============================================================================
// ReportViewer Component
// ============================================================================

const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  sessionId,
  className,
  onExport,
  onShare,
}) => {
  const { session, ui, setLoadingState, setErrorState } = useAppStore();
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "pdf",
    includeMetadata: true,
    includeSources: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use current report from store if not provided as prop
  const currentReport = report || session.current_report;
  const currentSessionId = sessionId || session.current_session_id;

  // ============================================================================
  // Table of Contents Generation
  // ============================================================================

  useEffect(() => {
    if (!reportContentRef.current || !currentReport) return;

    const generateTableOfContents = () => {
      const headings = reportContentRef.current!.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const toc: TableOfContentsItem[] = [];

      headings.forEach((heading: Element, index: number) => {
        const level = parseInt(heading.tagName.charAt(1));
        const title = heading.textContent || `Section ${index + 1}`;
        const id = heading.id || `section-${index}`;
        
        // Ensure heading has an ID for navigation
        if (!heading.id) {
          heading.id = id;
        }

        toc.push({
          id,
          title,
          level,
          element: heading as HTMLElement,
        });
      });

      setTableOfContents(toc);
    };

    // Generate TOC after content is rendered
    const timer = setTimeout(generateTableOfContents, 100);
    return () => clearTimeout(timer);
  }, [currentReport]);

  // ============================================================================
  // Intersection Observer for Active Section Tracking
  // ============================================================================

  useEffect(() => {
    if (!reportContentRef.current || tableOfContents.length === 0) return;

    const observerOptions = {
      root: reportContentRef.current,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    tableOfContents.forEach((item: TableOfContentsItem) => {
      if (item.element) {
        observerRef.current!.observe(item.element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [tableOfContents]);

  // ============================================================================
  // Navigation Functions
  // ============================================================================

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && reportContentRef.current) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const navigateToNextSection = () => {
    const currentIndex = tableOfContents.findIndex((item: TableOfContentsItem) => item.id === activeSection);
    if (currentIndex < tableOfContents.length - 1) {
      scrollToSection(tableOfContents[currentIndex + 1].id);
    }
  };

  const navigateToPreviousSection = () => {
    const currentIndex = tableOfContents.findIndex((item: TableOfContentsItem) => item.id === activeSection);
    if (currentIndex > 0) {
      scrollToSection(tableOfContents[currentIndex - 1].id);
    }
  };

  // ============================================================================
  // Export Functions
  // ============================================================================

  const exportToPDF = async () => {
    if (!reportContentRef.current || !currentReport) return;

    try {
      setLoadingState("export", true);

      // Create a temporary container for PDF export
      const exportContainer = document.createElement("div");
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.width = "210mm"; // A4 width
      exportContainer.style.backgroundColor = "white";
      exportContainer.style.padding = "20mm";
      exportContainer.style.fontFamily = "Arial, sans-serif";
      exportContainer.style.fontSize = "12px";
      exportContainer.style.lineHeight = "1.6";
      exportContainer.style.color = "black";

      // Add metadata if requested
      let content = currentReport;
      if (exportOptions.includeMetadata && currentSessionId) {
        const metadata = `
          <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">Research Report</h1>
            <p style="margin: 5px 0; color: #666;">Session ID: ${currentSessionId}</p>
            <p style="margin: 5px 0; color: #666;">Generated: ${new Date().toLocaleString()}</p>
          </div>
        `;
        content = metadata + content;
      }

      exportContainer.innerHTML = content;
      document.body.appendChild(exportContainer);

      // Generate PDF using lazy-loaded dependencies
      await generatePDF(exportContainer, `report-${currentSessionId || "export"}.pdf`);

      // Clean up
      document.body.removeChild(exportContainer);

      if (onExport) {
        onExport("pdf");
      }
    } catch (error) {
      setErrorState("export", {
        code: "PDF_EXPORT_FAILED",
        message: error instanceof Error ? error.message : "PDF export failed",
      });
    } finally {
      setLoadingState("export", false);
    }
  };

  const exportToMarkdown = () => {
    if (!currentReport) return;

    try {
      setLoadingState("export", true);

      // Convert HTML to Markdown (basic conversion)
      let markdownContent = currentReport
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")
        .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
        .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
          return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n";
        })
        .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
          let counter = 1;
          return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + "\n";
        })
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
        .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
        .replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "") // Remove remaining HTML tags
        .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up multiple newlines
        .trim();

      // Add metadata if requested
      if (exportOptions.includeMetadata && currentSessionId) {
        const metadata = `# Research Report

**Session ID:** ${currentSessionId}  
**Generated:** ${new Date().toLocaleString()}

---

`;
        markdownContent = metadata + markdownContent;
      }

      // Create and download the file
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${currentSessionId || "export"}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport("markdown");
      }
    } catch (error) {
      setErrorState("export", {
        code: "MARKDOWN_EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Markdown export failed",
      });
    } finally {
      setLoadingState("export", false);
    }
  };

  const exportToHTML = () => {
    if (!currentReport) return;

    try {
      setLoadingState("export", true);

      // Create a complete HTML document
      let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 2em;
            margin-bottom: 0.5em;
        }
        h1 { font-size: 2.5em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
        h2 { font-size: 2em; border-bottom: 1px solid #bdc3c7; padding-bottom: 0.2em; }
        h3 { font-size: 1.5em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.5em; }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }
        .metadata {
            background-color: #f8f9fa;
            padding: 1em;
            border-radius: 5px;
            margin-bottom: 2em;
            border-left: 4px solid #3498db;
        }
        .metadata h1 {
            margin-top: 0;
            border-bottom: none;
            font-size: 1.5em;
        }
        .metadata p {
            margin: 0.5em 0;
            color: #666;
        }
        @media print {
            body { margin: 0; padding: 1cm; }
            .metadata { break-inside: avoid; }
        }
    </style>
</head>
<body>`;

      // Add metadata if requested
      if (exportOptions.includeMetadata && currentSessionId) {
        htmlContent += `
    <div class="metadata">
        <h1>Research Report</h1>
        <p><strong>Session ID:</strong> ${currentSessionId}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>`;
      }

      htmlContent += `
    <div class="content">
        ${currentReport}
    </div>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${currentSessionId || "export"}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport("html");
      }
    } catch (error) {
      setErrorState("export", {
        code: "HTML_EXPORT_FAILED",
        message: error instanceof Error ? error.message : "HTML export failed",
      });
    } finally {
      setLoadingState("export", false);
    }
  };

  const handleExport = async () => {
    if (!currentReport) {
      setErrorState("export", {
        code: "NO_REPORT",
        message: "No report available to export",
      });
      return;
    }

    setShowExportModal(false);

    switch (exportOptions.format) {
      case "pdf":
        await exportToPDF();
        break;
      case "markdown":
        exportToMarkdown();
        break;
      case "html":
        exportToHTML();
        break;
      default:
        setErrorState("export", {
          code: "INVALID_FORMAT",
          message: "Invalid export format selected",
        });
    }
  };

  // ============================================================================
  // Share Functions
  // ============================================================================

  const handleCopyToClipboard = async () => {
    if (!currentReport) return;

    try {
      await navigator.clipboard.writeText(currentReport);
      // You could add a toast notification here
      if (onShare) {
        onShare(currentReport);
      }
    } catch (error) {
      setErrorState("share", {
        code: "CLIPBOARD_FAILED",
        message: "Failed to copy to clipboard",
      });
    }
  };

  const handleShareLink = async () => {
    if (!currentSessionId) return;

    const shareUrl = `${window.location.origin}/report/${currentSessionId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      if (onShare) {
        onShare(shareUrl);
      }
    } catch (error) {
      setErrorState("share", {
        code: "SHARE_FAILED",
        message: "Failed to copy share link",
      });
    }
  };

  // ============================================================================
  // Search Functions
  // ============================================================================

  const highlightSearchTerm = (content: string, term: string): string => {
    if (!term.trim()) return content;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "f":
            event.preventDefault();
            // Focus search input
            const searchInput = document.getElementById("report-search");
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case "ArrowUp":
            event.preventDefault();
            navigateToPreviousSection();
            break;
          case "ArrowDown":
            event.preventDefault();
            navigateToNextSection();
            break;
        }
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isFullscreen, activeSection, tableOfContents]);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderTableOfContents = () => (
    <nav className="bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-2 sm:p-4 overflow-y-auto" aria-label="Table of contents">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
          Contents
        </h3>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="space-y-1">
        {tableOfContents.map((item: TableOfContentsItem) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className={clsx(
              "block w-full text-left px-2 py-1 text-sm rounded transition-colors",
              `pl-${Math.max(2, item.level * 2)}`,
              activeSection === item.id
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
    </nav>
  );

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-3 sm:gap-4">
      <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <label htmlFor="report-search" className="sr-only">
            Search report content
          </label>
          <input
            id="report-search"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 pl-8 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            aria-describedby="search-help"
          />
          <svg
            className="absolute left-2 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div id="search-help" className="sr-only">
            Use Ctrl+F to focus this search field. Search terms will be highlighted in the report.
          </div>
        </div>
        
        <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
          {tableOfContents.length} sections
        </div>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-end">
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!currentReport || ui.loading_states.export}
          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Export report in different formats"
        >
          {ui.loading_states.export ? "..." : "Export"}
        </button>
        
        <button
          onClick={handleCopyToClipboard}
          disabled={!currentReport}
          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Copy report content to clipboard"
        >
          Copy
        </button>
        
        <button
          onClick={handleShareLink}
          disabled={!currentSessionId}
          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Share report link"
        >
          Share
        </button>
      </div>
    </div>
  );

  const renderExportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Export Report
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <select
              value={exportOptions.format}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportOptions(prev => ({ ...prev, format: e.target.value as "pdf" | "markdown" | "html" }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include metadata</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeSources}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExportOptions(prev => ({ ...prev, includeSources: e.target.checked }))}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include sources</span>
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowExportModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!currentReport) {
    return (
      <div className={clsx("flex items-center justify-center h-full", className)}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-lg font-medium mb-2">No report available</div>
          <div className="text-sm">
            Complete a research session to view the report
          </div>
        </div>
      </div>
    );
  }

  const processedContent = searchTerm 
    ? highlightSearchTerm(currentReport, searchTerm)
    : currentReport;

  return (
    <div className={clsx(
      "flex flex-col h-full bg-white dark:bg-gray-900",
      isFullscreen && "fixed inset-0 z-40",
      className
    )}>
      {renderToolbar()}
      
      <div className="flex flex-1 overflow-hidden">
        {tableOfContents.length > 0 && (
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0 hidden lg:block">
            {renderTableOfContents()}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div
            ref={reportContentRef}
            className="prose prose-gray dark:prose-invert prose-sm sm:prose-base max-w-none p-3 sm:p-4 md:p-6"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      </div>
      
      {showExportModal && renderExportModal()}
    </div>
  );
};

export default ReportViewer;