import { useEffect, useState } from "react";
import { AccessibilityManager, ScreenReaderAnnouncer, type AccessibilityState } from "../utils/accessibility.ts";

// Hook for managing accessibility state
export function useAccessibility() {
  const [state, setState] = useState<AccessibilityState>(() => 
    AccessibilityManager.getInstance().getState()
  );

  useEffect(() => {
    const manager = AccessibilityManager.getInstance();
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, []);

  const toggleHighContrast = () => {
    AccessibilityManager.getInstance().toggleHighContrast();
  };

  const toggleScreenReaderMode = () => {
    AccessibilityManager.getInstance().toggleScreenReaderMode();
  };

  return {
    ...state,
    toggleHighContrast,
    toggleScreenReaderMode,
  };
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderAnnouncer.getInstance().announce(message, priority);
  };

  return { announce };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    trapFocus?: boolean;
    rovingTabIndex?: string; // selector for roving tabindex items
  } = {}
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanupFunctions: Array<() => void> = [];

    if (options.trapFocus) {
      // Dynamic import for KeyboardNavigationManager
      import("../utils/accessibility.ts").then(({ KeyboardNavigationManager }) => {
        const cleanup = KeyboardNavigationManager.trapFocus(container);
        cleanupFunctions.push(cleanup);
      });
    }

    if (options.rovingTabIndex) {
      // Dynamic import for KeyboardNavigationManager
      import("../utils/accessibility.ts").then(({ KeyboardNavigationManager }) => {
        const cleanup = KeyboardNavigationManager.createRovingTabIndex(container, options.rovingTabIndex);
        cleanupFunctions.push(cleanup);
      });
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [containerRef, options.trapFocus, options.rovingTabIndex]);
}

// Hook for focus management
export function useFocusManagement() {
  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  };

  const focusFirstError = () => {
    const errorElement = document.querySelector('[aria-invalid="true"], .error') as HTMLElement;
    if (errorElement) {
      errorElement.focus();
    }
  };

  const restoreFocus = (previousElement: HTMLElement | null) => {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  };

  const saveFocus = (): HTMLElement | null => {
    return document.activeElement as HTMLElement;
  };

  return {
    focusElement,
    focusFirstError,
    restoreFocus,
    saveFocus,
  };
}