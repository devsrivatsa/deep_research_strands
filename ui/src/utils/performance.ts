// Performance monitoring utilities for Deep Research UI

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averageLoadTime: number;
    slowestOperations: PerformanceMetric[];
    recommendations: string[];
  };
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
    this.startPeriodicReporting();
  }

  private initializeObservers(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Observe navigation timing
      if ('PerformanceObserver' in window) {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: `navigation.${entry.name}`,
              value: entry.duration,
              timestamp: Date.now(),
              metadata: {
                entryType: entry.entryType,
                startTime: entry.startTime,
              },
            });
          }
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Observe resource loading
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('esm.sh') || entry.name.includes('.js') || entry.name.includes('.css')) {
              this.recordMetric({
                name: `resource.${this.getResourceType(entry.name)}`,
                value: entry.duration,
                timestamp: Date.now(),
                metadata: {
                  url: entry.name,
                  size: (entry as any).transferSize || 0,
                  cached: (entry as any).transferSize === 0,
                },
              });
            }
          }
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Observe largest contentful paint
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'lcp',
              value: entry.startTime,
              timestamp: Date.now(),
              metadata: {
                element: (entry as any).element?.tagName,
                url: (entry as any).url,
              },
            });
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // Observe first input delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'fid',
              value: (entry as any).processingStart - entry.startTime,
              timestamp: Date.now(),
              metadata: {
                eventType: (entry as any).name,
              },
            });
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }

      // Monitor memory usage if available
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.recordMetric({
            name: 'memory.used',
            value: memory.usedJSHeapSize,
            timestamp: Date.now(),
            metadata: {
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit,
            },
          });
        }, 30000); // Every 30 seconds
      }

    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('esm.sh')) return 'module';
    return 'other';
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations
    if (metric.value > 1000) { // More than 1 second
      console.warn(`Slow operation detected: ${metric.name} took ${metric.value.toFixed(2)}ms`);
    }
  }

  // Measure custom operations
  measureOperation<T>(name: string, operation: () => T): T;
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T>;
  measureOperation<T>(name: string, operation: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            this.recordMetric({
              name: `custom.${name}`,
              value: performance.now() - startTime,
              timestamp: Date.now(),
              metadata: { success: true },
            });
            return value;
          },
          (error) => {
            this.recordMetric({
              name: `custom.${name}`,
              value: performance.now() - startTime,
              timestamp: Date.now(),
              metadata: { success: false, error: error.message },
            });
            throw error;
          }
        );
      } else {
        this.recordMetric({
          name: `custom.${name}`,
          value: performance.now() - startTime,
          timestamp: Date.now(),
          metadata: { success: true },
        });
        return result;
      }
    } catch (error) {
      this.recordMetric({
        name: `custom.${name}`,
        value: performance.now() - startTime,
        timestamp: Date.now(),
        metadata: { success: false, error: (error as Error).message },
      });
      throw error;
    }
  }

  // Get performance report
  getReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes

    const loadTimeMetrics = recentMetrics.filter(m => 
      m.name.includes('navigation') || m.name.includes('resource') || m.name.includes('custom')
    );

    const averageLoadTime = loadTimeMetrics.length > 0
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length
      : 0;

    const slowestOperations = [...recentMetrics]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (averageLoadTime > 2000) {
      recommendations.push('Average load time is high - consider code splitting');
    }

    const largeResources = recentMetrics.filter(m => 
      m.name.includes('resource') && (m.metadata?.size || 0) > 100000
    );
    if (largeResources.length > 0) {
      recommendations.push('Large resources detected - consider compression or lazy loading');
    }

    const lcpMetrics = recentMetrics.filter(m => m.name === 'lcp');
    if (lcpMetrics.length > 0 && lcpMetrics[lcpMetrics.length - 1].value > 2500) {
      recommendations.push('Largest Contentful Paint is slow - optimize critical rendering path');
    }

    const fidMetrics = recentMetrics.filter(m => m.name === 'fid');
    if (fidMetrics.length > 0 && fidMetrics[fidMetrics.length - 1].value > 100) {
      recommendations.push('First Input Delay is high - reduce JavaScript execution time');
    }

    const memoryMetrics = recentMetrics.filter(m => m.name === 'memory.used');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memoryUsageMB = latestMemory.value / (1024 * 1024);
      if (memoryUsageMB > 100) {
        recommendations.push('High memory usage detected - check for memory leaks');
      }
    }

    return {
      metrics: recentMetrics,
      summary: {
        totalMetrics: recentMetrics.length,
        averageLoadTime,
        slowestOperations,
        recommendations,
      },
      timestamp: now,
    };
  }

  // Export metrics for analysis
  exportMetrics(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];
    } else if (this.observers.length === 0) {
      this.initializeObservers();
    }
  }

  private startPeriodicReporting(): void {
    // Report performance metrics every 5 minutes
    setInterval(() => {
      if (!this.isEnabled) return;

      const report = this.getReport();
      
      if (report.summary.recommendations.length > 0) {
        console.group('🚀 Performance Recommendations');
        report.summary.recommendations.forEach(rec => console.log(`💡 ${rec}`));
        console.groupEnd();
      }

      // Log slow operations
      if (report.summary.slowestOperations.length > 0) {
        console.group('🐌 Slowest Operations (last 5 minutes)');
        report.summary.slowestOperations.forEach(op => {
          console.log(`${op.name}: ${op.value.toFixed(2)}ms`);
        });
        console.groupEnd();
      }

    }, 300000); // Every 5 minutes
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.isEnabled = false;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for common measurements
export function measureRender<T>(componentName: string, renderFn: () => T): T {
  return performanceMonitor.measureOperation(`render.${componentName}`, renderFn);
}

export function measureApiCall<T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> {
  return performanceMonitor.measureOperation(`api.${endpoint}`, apiCall);
}

export function measureStateUpdate<T>(stateName: string, updateFn: () => T): T {
  return performanceMonitor.measureOperation(`state.${stateName}`, updateFn);
}

// Web Vitals measurement helpers
export function measureCLS(): void {
  if ('PerformanceObserver' in window) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          performanceMonitor.recordMetric({
            name: 'cls',
            value: (entry as any).value,
            timestamp: Date.now(),
            metadata: {
              hadRecentInput: (entry as any).hadRecentInput,
            },
          });
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS measurement failed:', error);
    }
  }
}

// Initialize CLS measurement
if (typeof window !== 'undefined') {
  measureCLS();
}

export default performanceMonitor;