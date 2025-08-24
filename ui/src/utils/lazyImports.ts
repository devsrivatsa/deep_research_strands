// Lazy import utilities for heavy dependencies
// This helps reduce initial bundle size by loading dependencies only when needed

type LazyImportCache = Map<string, Promise<any>>;

class LazyImportManager {
  private cache: LazyImportCache = new Map();

  async loadHtml2Canvas() {
    if (!this.cache.has('html2canvas')) {
      this.cache.set('html2canvas', import('html2canvas'));
    }
    return this.cache.get('html2canvas')!;
  }

  async loadJsPDF() {
    if (!this.cache.has('jspdf')) {
      this.cache.set('jspdf', import('jspdf'));
    }
    return this.cache.get('jspdf')!;
  }

  // Clear cache if needed (for memory management)
  clearCache() {
    this.cache.clear();
  }
}

export const lazyImports = new LazyImportManager();

// Utility functions for common lazy loading scenarios
export async function generatePDF(element: HTMLElement, filename: string = 'report.pdf'): Promise<void> {
  try {
    const [html2canvas, jsPDF] = await Promise.all([
      lazyImports.loadHtml2Canvas(),
      lazyImports.loadJsPDF()
    ]);

    const canvas = await html2canvas.default(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('PDF generation failed');
  }
}

export async function captureScreenshot(element: HTMLElement): Promise<string> {
  try {
    const html2canvas = await lazyImports.loadHtml2Canvas();
    
    const canvas = await html2canvas.default(element, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw new Error('Screenshot capture failed');
  }
}