// Tiny read-only file server used ONCE during setup so the Supabase SQL editor
// page (driven by Claude) can fetch local migration files. CORS + Private
// Network Access headers included. Stop it after setup (Ctrl+C).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "supabase");
const PORT = 8799;

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) throw new Error("forbidden");
    const content = await readFile(filePath, "utf8");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serving ./supabase on http://127.0.0.1:${PORT}`);
});
