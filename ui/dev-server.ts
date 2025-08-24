const port = 9876;

console.log(`Starting simple development server on http://localhost:${port}`);

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  console.log(`Request: ${pathname}`);
  
  try {
    // Handle root path - serve index.html
    if (pathname === "/") {
      const html = await Deno.readTextFile("./index.html");
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    
    // Handle test.html specifically
    if (pathname === "/test.html") {
      const html = await Deno.readTextFile("./test.html");
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    
    // Handle static files
    const filePath = `.${pathname}`;
    
    try {
      const fileInfo = await Deno.stat(filePath);
      if (fileInfo.isFile) {
        const content = await Deno.readFile(filePath);
        
        // Determine content type
        let contentType = "text/plain";
        if (pathname.endsWith(".html")) contentType = "text/html";
        else if (pathname.endsWith(".css")) contentType = "text/css";
        else if (pathname.endsWith(".js")) contentType = "application/javascript";
        else if (pathname.endsWith(".jsx")) contentType = "application/javascript";
        else if (pathname.endsWith(".ts")) contentType = "application/javascript";
        else if (pathname.endsWith(".tsx")) contentType = "application/javascript";
        else if (pathname.endsWith(".json")) contentType = "application/json";
        else if (pathname.endsWith(".png")) contentType = "image/png";
        else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (pathname.endsWith(".svg")) contentType = "image/svg+xml";
        
        return new Response(content, {
          headers: { "content-type": contentType },
        });
      }
    } catch {
      // File doesn't exist, continue to 404
    }
    
    return new Response("Not Found", { status: 404 });
    
  } catch (error) {
    console.error("Server error:", error);
    return new Response(`Server Error: ${error.message}`, { 
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
});