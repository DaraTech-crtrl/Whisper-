import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";

dotenv.config();

// VAPID keys for Web Push Notifications (works in background when app is closed / locked)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMePyW-3IbjfHlFbKuYnq6p522JRTg0xf9XopVbFC4-79whD7MQdN4f5WdQRYox_pVi645CXkIdHTEaxL8VcauA";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "Ks5r5RskFAKq28z2wl1FkLjY0jfhrTXEBnCOdPlXqaY";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@whisper.runflix.name.ng";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn("[WebPush] setVapidDetails warning:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), webPushConfigured: true });
  });

  // Expose Public VAPID Key for client subscription
  app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Real Web Push & FCM dispatch endpoint
  app.post("/api/notify-whisper", async (req, res) => {
    try {
      const { 
        receiverId, 
        subscriptions, 
        subscription, 
        mode, 
        modeIcon, 
        username,
        customTitle,
        customBody,
        delayMs
      } = req.body || {};

      if (!receiverId && !subscriptions && !subscription) {
        return res.status(400).json({ error: "receiverId or subscription is required" });
      }

      // Collect target subscriptions
      const targetSubscriptions: any[] = [];
      if (subscription && typeof subscription === "object" && subscription.endpoint) {
        targetSubscriptions.push(subscription);
      }
      if (Array.isArray(subscriptions)) {
        for (const sub of subscriptions) {
          if (sub && typeof sub === "object" && sub.endpoint) {
            // Avoid duplicate endpoints
            if (!targetSubscriptions.some(t => t.endpoint === sub.endpoint)) {
              targetSubscriptions.push(sub);
            }
          }
        }
      }

      const notificationTitle = customTitle || `New ${mode || "Whisper"} Received! ${modeIcon || "🤫"}`;
      const notificationBody = customBody || `Someone just sent you a new anonymous encrypted ${mode ? mode.toLowerCase() : "whisper"}. Tap to decrypt and read.`;
      const clickUrl = "/dashboard";
      const icon = "https://whisper.runflix.name.ng/android-chrome-192x192.png";
      const badge = "https://whisper.runflix.name.ng/favicon-32x32.png";

      const payloadString = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: icon,
        badge: badge,
        tag: "whisper-" + Date.now(),
        url: clickUrl,
        data: {
          url: clickUrl,
          mode: mode || "Secret Whisper"
        }
      });

      console.log(`[WebPush Dispatch] Dispatching to ${targetSubscriptions.length} device subscriptions for user ${receiverId || "direct"}`);

      const dispatchFunction = async () => {
        let sentCount = 0;
        let failCount = 0;

        await Promise.all(
          targetSubscriptions.map(async (sub) => {
            try {
              if (sub.endpoint && sub.keys && sub.keys.p256dh && sub.keys.auth) {
                await webpush.sendNotification(sub, payloadString, {
                  TTL: 86400, // 24 hour buffer
                  urgency: "high"
                });
                sentCount++;
              }
            } catch (err: any) {
              failCount++;
              console.warn(`[WebPush Send Error for ${sub.endpoint.substring(0, 40)}...]:`, err.statusCode || err.message);
            }
          })
        );

        return { sentCount, failCount };
      };

      if (delayMs && typeof delayMs === "number" && delayMs > 0 && delayMs <= 10000) {
        setTimeout(dispatchFunction, delayMs);
        return res.json({ 
          success: true, 
          scheduled: true, 
          delayMs, 
          targetsCount: targetSubscriptions.length 
        });
      } else {
        const result = await dispatchFunction();
        return res.json({ 
          success: true, 
          delivered: result.sentCount > 0, 
          sentCount: result.sentCount, 
          failCount: result.failCount, 
          targetsCount: targetSubscriptions.length 
        });
      }
    } catch (err: any) {
      console.error("[WebPush Dispatch Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to dispatch push notification" });
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

