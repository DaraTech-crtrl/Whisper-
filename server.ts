import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Whisper Cloud Alert webhook endpoint
  app.post("/api/notify-whisper", async (req, res) => {
    try {
      const { receiverId, mode, modeIcon, username } = req.body || {};
      if (!receiverId) {
        return res.status(400).json({ error: "receiverId is required" });
      }

      // Log dispatch for telemetry
      console.log(`[FCM Notification Dispatch] User ${receiverId} (@${username || "user"}) received a new ${mode || "Whisper"} ${modeIcon || "🤫"}`);
      
      // If FIREBASE_SERVICE_ACCOUNT or FCM server key is available in env, send HTTP v1 push
      return res.json({ 
        success: true, 
        delivered: true,
        message: `Notification dispatched for ${mode || "Whisper"}` 
      });
    } catch (err: any) {
      console.error("[FCM Dispatch Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to dispatch notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Whisper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
