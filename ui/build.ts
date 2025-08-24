#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";

console.log("Building Deep Research UI...");

const isDev = Deno.args.includes("--dev");
const shouldMinify = !isDev;

try {
  // Bundle the main application with optimizations
  const result = await bundle("./main.tsx", {
    compilerOptions: {
      jsx: "react-jsx",
      jsxImportSource: "react",
      lib: ["dom", "dom.iterable", "es2022"],
      strict: false,
      allowImportingTsExtensions: true,
      // Enable tree shaking optimizations
      module: "esnext",
      target: "es2022",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    },
    importMap: {
      imports: {
        // Use production builds for smaller bundle size
        "react": isDev 
          ? "https://esm.sh/react@18.2.0?dev&target=deno&deps=@types/react@18.2.0"
          : "https://esm.sh/react@18.2.0?target=deno&deps=@types/react@18.2.0",
        "react/": "https://esm.sh/react@18.2.0/",
        "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime?target=deno",
        "react-dom": isDev
          ? "https://esm.sh/react-dom@18.2.0?dev&target=deno"
          : "https://esm.sh/react-dom@18.2.0?target=deno",
        "react-dom/": "https://esm.sh/react-dom@18.2.0/",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client?target=deno",
        "@types/react": "https://esm.sh/@types/react@18.2.0?target=deno",
        "@types/react-dom": "https://esm.sh/@types/react-dom@18.2.0?target=deno",
        // Optimize third-party libraries
        "zustand": "https://esm.sh/zustand@4.4.1?target=deno",
        "zustand/middleware": "https://esm.sh/zustand@4.4.1/middleware?target=deno",
        "zustand/middleware/immer": "https://esm.sh/zustand@4.4.1/middleware/immer?target=deno",
        "immer": "https://esm.sh/immer@10.0.3?target=deno",
        "clsx": "https://esm.sh/clsx@2.0.0?target=deno"
      }
    },
    // Enable minification for production
    minify: shouldMinify,
  });

  let code = result.code;

  // Additional optimizations for production builds
  if (!isDev) {
    console.log("🔧 Applying production optimizations...");
    
    // Remove console.log statements in production
    code = code.replace(/console\.log\([^)]*\);?/g, '');
    
    // Remove development-only code blocks
    code = code.replace(/\/\*\s*DEV_ONLY_START\s*\*\/[\s\S]*?\/\*\s*DEV_ONLY_END\s*\*\//g, '');
    
    // Basic dead code elimination patterns
    code = code.replace(/if\s*\(\s*false\s*\)\s*\{[^}]*\}/g, '');
    code = code.replace(/if\s*\(\s*0\s*\)\s*\{[^}]*\}/g, '');
  }

  // Write the bundled code to main.js
  await Deno.writeTextFile("./main.js", code);
  
  // Generate bundle analysis
  const stats = {
    size: new TextEncoder().encode(code).length,
    sizeKB: Math.round(new TextEncoder().encode(code).length / 1024),
    lines: code.split('\n').length,
    minified: shouldMinify,
    timestamp: new Date().toISOString(),
  };
  
  await Deno.writeTextFile("./bundle-stats.json", JSON.stringify(stats, null, 2));
  
  console.log("✅ Build completed successfully!");
  console.log(`📦 Output: main.js (${stats.sizeKB} KB)`);
  console.log(`📊 Bundle stats saved to bundle-stats.json`);
  
  if (!isDev) {
    console.log("🚀 Production build optimized for performance");
  } else {
    console.log("🚀 Development build with debugging enabled");
  }

} catch (error) {
  console.error("❌ Build failed:", error);
  Deno.exit(1);
}