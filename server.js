const PORT = parseInt(process.env.PORT || "3000");
const BASE_URL = getBaseUrl();
const PUBLIC_DIR = process.env.PUBLIC_DIR;

const links = new Map();

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN)
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "http://localhost:3000";
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function generateCode() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function handleRequest(req) {
  const url = new URL(req.url, BASE_URL);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // POST /api/links - create a short link
  if (req.method === "POST" && pathname === "/api/links") {
    try {
      const body = await req.json();
      if (!body.url || typeof body.url !== "string") {
        return new Response(JSON.stringify({ error: "Invalid URL" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!isValidUrl(body.url)) {
        return new Response(JSON.stringify({ error: "Invalid URL format" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const code = generateCode();
      const link = {
        code,
        url: body.url,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, link);

      return new Response(JSON.stringify(link), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // GET /api/links - get all links
  if (req.method === "GET" && pathname === "/api/links") {
    const allLinks = Array.from(links.values());
    return new Response(JSON.stringify(allLinks), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // GET /:code - redirect to original URL
  const codeMatch = pathname.match(/^\/([a-zA-Z0-9_-]{6})$/);
  if (req.method === "GET" && codeMatch) {
    const code = codeMatch[1];
    if (links.has(code)) {
      const link = links.get(code);
      link.hits++;
      return new Response(null, {
        status: 302,
        headers: {
          Location: link.url,
          ...corsHeaders,
        },
      });
    } else {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // Serve static files if PUBLIC_DIR is set
  if (req.method === "GET" && PUBLIC_DIR) {
    const filePath = pathname === "/" ? "/index.html" : pathname;
    try {
      const file = Bun.file(`${PUBLIC_DIR}${filePath}`);
      if (await file.exists()) {
        return new Response(file, {
          headers: { ...corsHeaders },
        });
      }
    } catch {}
  }

  // Default 404
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`Snip backend running on ${BASE_URL}`);
