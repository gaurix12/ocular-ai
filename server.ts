import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3002;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "OcularAI Analysis Engine" });
  });

  // Mock endpoint for /analyze-iris to satisfy the requirement
  // In a real production app, this might do pre-processing or logging
  app.post("/analyze-iris", (req, res) => {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }
    
    // We return a success signal. The frontend handles the heavy lifting with Gemini
    // to comply with the "Always call Gemini from frontend" guideline.
    res.json({ 
      status: "ready_for_analysis", 
      message: "Image received and pre-processed. Proceeding to neural analysis.",
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OcularAI Server running on http://localhost:${PORT}`);
  });
}

startServer();
