#!/usr/bin/env -S deno run --allow-read

interface BundleStats {
  size: number;
  sizeKB: number;
  lines: number;
  minified: boolean;
  timestamp: string;
}

interface AnalysisResult {
  bundleStats: BundleStats;
  recommendations: string[];
  performance: {
    score: number;
    issues: string[];
    optimizations: string[];
  };
}

async function analyzeBundleSize(): Promise<AnalysisResult> {
  console.log("🔍 Analyzing bundle...");

  let bundleStats: BundleStats;
  
  try {
    const statsContent = await Deno.readTextFile("./bundle-stats.json");
    bundleStats = JSON.parse(statsContent);
  } catch {
    console.error("❌ Bundle stats not found. Run 'deno task build' first.");
    Deno.exit(1);
  }

  const recommendations: string[] = [];
  const issues: string[] = [];
  const optimizations: string[] = [];

  // Analyze bundle size
  if (bundleStats.sizeKB > 1000) {
    issues.push("Bundle size is very large (>1MB)");
    recommendations.push("Consider code splitting and lazy loading");
    optimizations.push("Implement dynamic imports for heavy components");
  } else if (bundleStats.sizeKB > 500) {
    issues.push("Bundle size is large (>500KB)");
    recommendations.push("Review dependencies and remove unused code");
    optimizations.push("Enable tree shaking for better dead code elimination");
  } else if (bundleStats.sizeKB > 250) {
    recommendations.push("Bundle size is moderate - consider optimizations");
    optimizations.push("Compress images and optimize assets");
  } else {
    optimizations.push("Bundle size is good - maintain current optimizations");
  }

  // Check if minification is enabled
  if (!bundleStats.minified) {
    issues.push("Bundle is not minified");
    recommendations.push("Enable minification for production builds");
    optimizations.push("Use 'deno task build:prod' for production builds");
  }

  // Analyze code complexity
  const linesPerKB = bundleStats.lines / bundleStats.sizeKB;
  if (linesPerKB < 10) {
    issues.push("Code appears to have low compression ratio");
    recommendations.push("Check for repeated code patterns or large inline data");
  }

  // Calculate performance score
  let score = 100;
  if (bundleStats.sizeKB > 1000) score -= 40;
  else if (bundleStats.sizeKB > 500) score -= 25;
  else if (bundleStats.sizeKB > 250) score -= 10;
  
  if (!bundleStats.minified) score -= 20;
  if (linesPerKB < 10) score -= 10;

  score = Math.max(0, score);

  return {
    bundleStats,
    recommendations,
    performance: {
      score,
      issues,
      optimizations,
    },
  };
}

async function analyzeCodeStructure(): Promise<void> {
  console.log("📊 Analyzing code structure...");

  try {
    const mainContent = await Deno.readTextFile("./main.js");
    
    // Count imports
    const importMatches = mainContent.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
    const dynamicImportMatches = mainContent.match(/import\(['"][^'"]+['"]\)/g) || [];
    
    console.log(`📦 Static imports: ${importMatches.length}`);
    console.log(`🔄 Dynamic imports: ${dynamicImportMatches.length}`);
    
    // Analyze component usage
    const componentMatches = mainContent.match(/React\.createElement\([^,]+/g) || [];
    const uniqueComponents = new Set(
      componentMatches.map(match => match.replace('React.createElement(', '').trim())
    );
    
    console.log(`🧩 Unique components: ${uniqueComponents.size}`);
    
    // Check for potential optimizations
    const consoleLogMatches = mainContent.match(/console\.log/g) || [];
    if (consoleLogMatches.length > 0) {
      console.log(`⚠️  Found ${consoleLogMatches.length} console.log statements (should be removed in production)`);
    }
    
  } catch (error) {
    console.error("❌ Failed to analyze code structure:", error.message);
  }
}

async function generateReport(analysis: AnalysisResult): Promise<void> {
  const report = `
# Bundle Analysis Report

Generated: ${new Date().toISOString()}

## Bundle Statistics
- **Size**: ${analysis.bundleStats.sizeKB} KB (${analysis.bundleStats.size} bytes)
- **Lines**: ${analysis.bundleStats.lines.toLocaleString()}
- **Minified**: ${analysis.bundleStats.minified ? '✅ Yes' : '❌ No'}
- **Build Time**: ${analysis.bundleStats.timestamp}

## Performance Score: ${analysis.performance.score}/100

${analysis.performance.score >= 80 ? '🟢 Excellent' : 
  analysis.performance.score >= 60 ? '🟡 Good' : 
  analysis.performance.score >= 40 ? '🟠 Needs Improvement' : '🔴 Poor'}

## Issues Found
${analysis.performance.issues.length > 0 
  ? analysis.performance.issues.map(issue => `- ❌ ${issue}`).join('\n')
  : '- ✅ No critical issues found'
}

## Recommendations
${analysis.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}

## Optimization Suggestions
${analysis.performance.optimizations.map(opt => `- 🚀 ${opt}`).join('\n')}

## Size Breakdown
- **Per Line**: ${(analysis.bundleStats.size / analysis.bundleStats.lines).toFixed(2)} bytes/line
- **Compression Ratio**: ${(analysis.bundleStats.lines / analysis.bundleStats.sizeKB).toFixed(1)} lines/KB

## Recommendations by Size
${analysis.bundleStats.sizeKB <= 100 ? '🟢 Excellent size - maintain current optimizations' :
  analysis.bundleStats.sizeKB <= 250 ? '🟡 Good size - consider minor optimizations' :
  analysis.bundleStats.sizeKB <= 500 ? '🟠 Large size - implement code splitting' :
  '🔴 Very large size - urgent optimization needed'}
`;

  await Deno.writeTextFile("./bundle-analysis.md", report);
  console.log("📄 Report saved to bundle-analysis.md");
}

// Main execution
if (import.meta.main) {
  try {
    const analysis = await analyzeBundleSize();
    await analyzeCodeStructure();
    await generateReport(analysis);
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 BUNDLE ANALYSIS SUMMARY");
    console.log("=".repeat(50));
    console.log(`Bundle Size: ${analysis.bundleStats.sizeKB} KB`);
    console.log(`Performance Score: ${analysis.performance.score}/100`);
    console.log(`Issues: ${analysis.performance.issues.length}`);
    console.log(`Recommendations: ${analysis.recommendations.length}`);
    console.log("=".repeat(50));
    
    if (analysis.performance.score < 60) {
      console.log("⚠️  Bundle needs optimization!");
      Deno.exit(1);
    } else {
      console.log("✅ Bundle analysis complete!");
    }
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    Deno.exit(1);
  }
}