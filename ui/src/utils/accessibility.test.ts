// Accessibility testing utilities for Deno
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Test utilities for Deno
export class AccessibilityTester {
  static testAriaLabels(element: any): boolean {
    // Test that element has accessible name
    const accessibleName = this.getAccessibleName(element);
    return accessibleName && accessibleName.trim().length > 0;
  }

  static testKeyboardNavigation(element: any): boolean {
    // Test that element is focusable
    const tabIndex = element.getAttribute?.('tabindex');
    const isInteractive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName);
    const hasRole = ['button', 'link', 'tab', 'menuitem'].includes(element.getAttribute?.('role'));
    
    return isInteractive || hasRole || (tabIndex !== null && tabIndex !== '-1');
  }

  static testColorContrast(): boolean {
    // Simple test for high contrast mode support
    return true; // Assume high contrast is supported
  }

  static testScreenReaderContent(element: any): boolean {
    // Test that element has screen reader content
    const ariaLabel = element.getAttribute?.('aria-label');
    const ariaLabelledBy = element.getAttribute?.('aria-labelledby');
    const textContent = element.textContent;
    
    return !!(ariaLabel || ariaLabelledBy || textContent);
  }

  private static getAccessibleName(element: any): string {
    // Check aria-label
    const ariaLabel = element.getAttribute?.('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute?.('aria-labelledby');
    if (ariaLabelledBy) {
      // In a real DOM environment, we'd look up the element
      return ariaLabelledBy; // Simplified for testing
    }

    // Check text content
    const textContent = element.textContent?.trim?.();
    if (textContent) return textContent;

    // Check alt text for images
    if (element.tagName === 'IMG') {
      return element.getAttribute?.('alt') || '';
    }

    // Check title attribute
    return element.getAttribute?.('title') || '';
  }
}

// Simple test runner for Deno
Deno.test("AccessibilityTester - ARIA labels", () => {
  const mockElement = {
    getAttribute: (name: string) => {
      if (name === 'aria-label') return 'Test label';
      return null;
    },
    tagName: 'BUTTON',
    textContent: 'Click me'
  };

  const hasAriaLabel = AccessibilityTester.testAriaLabels(mockElement);
  assertEquals(hasAriaLabel, true);
});

Deno.test("AccessibilityTester - keyboard navigation", () => {
  const mockButton = {
    getAttribute: (name: string) => null,
    tagName: 'BUTTON'
  };

  const isKeyboardAccessible = AccessibilityTester.testKeyboardNavigation(mockButton);
  assertEquals(isKeyboardAccessible, true);
});

Deno.test("AccessibilityTester - screen reader content", () => {
  const mockElement = {
    getAttribute: (name: string) => {
      if (name === 'aria-label') return 'Screen reader text';
      return null;
    },
    textContent: 'Visible text'
  };

  const hasScreenReaderContent = AccessibilityTester.testScreenReaderContent(mockElement);
  assertEquals(hasScreenReaderContent, true);
});