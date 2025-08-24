// Accessibility utilities for high contrast mode and screen reader support

export interface AccessibilityState {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
}

// High contrast theme management
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private state: AccessibilityState;
  private listeners: Array<(state: AccessibilityState) => void> = [];

  private constructor() {
    this.state = {
      highContrast: this.detectHighContrast(),
      reducedMotion: this.detectReducedMotion(),
      screenReaderMode: this.detectScreenReader(),
    };

    // Listen for system preference changes
    this.setupMediaQueryListeners();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private detectHighContrast(): boolean {
    // Check for Windows high contrast mode
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return true;
    }
    
    // Check for forced-colors (Windows high contrast)
    if (window.matchMedia('(forced-colors: active)').matches) {
      return true;
    }

    // Check localStorage for user preference
    return localStorage.getItem('accessibility-high-contrast') === 'true';
  }

  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectScreenReader(): boolean {
    // Basic screen reader detection (not foolproof)
    return (
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      // Check if user has enabled screen reader mode manually
      localStorage.getItem('accessibility-screen-reader') === 'true'
    );
  }

  private setupMediaQueryListeners(): void {
    // Listen for high contrast changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', () => {
      this.updateState({ highContrast: this.detectHighContrast() });
    });

    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    forcedColorsQuery.addEventListener('change', () => {
      this.updateState({ highContrast: this.detectHighContrast() });
    });

    // Listen for reduced motion changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', () => {
      this.updateState({ reducedMotion: this.detectReducedMotion() });
    });
  }

  private updateState(updates: Partial<AccessibilityState>): void {
    this.state = { ...this.state, ...updates };
    this.applyAccessibilityStyles();
    this.notifyListeners();
  }

  private applyAccessibilityStyles(): void {
    const root = document.documentElement;
    
    if (this.state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (this.state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    if (this.state.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Public methods
  getState(): AccessibilityState {
    return { ...this.state };
  }

  toggleHighContrast(): void {
    const newValue = !this.state.highContrast;
    localStorage.setItem('accessibility-high-contrast', newValue.toString());
    this.updateState({ highContrast: newValue });
  }

  toggleScreenReaderMode(): void {
    const newValue = !this.state.screenReaderMode;
    localStorage.setItem('accessibility-screen-reader', newValue.toString());
    this.updateState({ screenReaderMode: newValue });
  }

  subscribe(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Initialize accessibility features
  initialize(): void {
    this.applyAccessibilityStyles();
    
    // Add CSS custom properties for high contrast
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --focus-ring-color: #005fcc;
        --focus-ring-width: 2px;
        --focus-ring-offset: 2px;
      }

      .high-contrast {
        --focus-ring-color: #ffff00;
        --focus-ring-width: 3px;
        --focus-ring-offset: 3px;
      }

      .high-contrast * {
        border-color: ButtonText !important;
      }

      .high-contrast button,
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        background: ButtonFace !important;
        color: ButtonText !important;
        border: 2px solid ButtonText !important;
      }

      .high-contrast button:hover,
      .high-contrast button:focus {
        background: Highlight !important;
        color: HighlightText !important;
      }

      .high-contrast a {
        color: LinkText !important;
      }

      .high-contrast a:visited {
        color: VisitedText !important;
      }

      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      .screen-reader-mode .sr-only {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: 0.25rem !important;
        margin: 0.25rem !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        background: #f0f0f0 !important;
        border: 1px solid #ccc !important;
      }

      /* Focus styles */
      *:focus {
        outline: var(--focus-ring-width) solid var(--focus-ring-color) !important;
        outline-offset: var(--focus-ring-offset) !important;
      }

      /* Skip link styles */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
        border-radius: 4px;
      }

      .skip-link:focus {
        top: 6px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Screen reader announcement utility
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  private createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear the message after a short delay to allow for re-announcements
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

// Keyboard navigation utilities
export class KeyboardNavigationManager {
  private static focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors));
  }

  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus the first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  static createRovingTabIndex(container: HTMLElement, itemSelector: string): () => void {
    const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
    let currentIndex = 0;

    // Set initial tabindex values
    items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = (currentIndex + 1) % items.length;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      // Update tabindex values
      items[currentIndex].tabIndex = -1;
      items[newIndex].tabIndex = 0;
      items[newIndex].focus();
      currentIndex = newIndex;
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// Initialize accessibility features
export function initializeAccessibility(): void {
  const accessibilityManager = AccessibilityManager.getInstance();
  accessibilityManager.initialize();

  // Create screen reader announcer
  ScreenReaderAnnouncer.getInstance();

  // Add skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  document.body.insertBefore(skipLink, document.body.firstChild);
}