const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Cloud Function: Send background push notification whenever a new whisper is received
 * Trigger: Firestore document created at users/{userId}/messages/{messageId}
 */
exports.onNewWhisperNotification = onDocumentCreated(
  "users/{userId}/messages/{messageId}",
  async (event) => {
    try {
      const messageData = event.data ? event.data.data() : null;
      if (!messageData) {
        console.log("No message data present.");
        return;
      }

      const userId = event.params.userId;
      const db = getFirestore();

      // Get user document to find push notification tokens
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        console.log(`User ${userId} doc not found.`);
        return;
      }

      const userData = userDoc.data();

      // Check if user has enabled notifications
      if (userData.notificationsEnabled === false) {
        console.log(`User ${userId} has disabled notifications.`);
        return;
      }

      const modeName = messageData.modeName || "Secret Whisper";
      const modeIcon = messageData.modeIcon || "🤫";

      // Collect FCM registration tokens
      const tokenSet = new Set();
      if (userData.fcmToken && typeof userData.fcmToken === "string") {
        tokenSet.add(userData.fcmToken);
      }
      if (Array.isArray(userData.fcmTokens)) {
        userData.fcmTokens.forEach((tok) => {
          if (tok && typeof tok === "string" && !tok.startsWith("web_push_")) {
            tokenSet.add(tok);
          }
        });
      }

      const tokens = Array.from(tokenSet);

      if (tokens.length === 0) {
        console.log(`No valid FCM registration tokens found for user ${userId}.`);
        return;
      }

      const title = `New ${modeName} Received! ${modeIcon}`;
      const body = `You received a new anonymous ${modeName.toLowerCase()}. Tap to open and view.`;

      const messagePayload = {
        notification: {
          title,
          body,
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "https://whisper.runflix.name.ng/android-chrome-192x192.png",
            badge: "https://whisper.runflix.name.ng/favicon-32x32.png",
            vibrate: [200, 100, 200],
            click_action: "https://whisper.runflix.name.ng/dashboard",
          },
          fcmOptions: {
            link: "https://whisper.runflix.name.ng/dashboard",
          },
        },
        data: {
          url: "/dashboard",
          modeName: modeName,
        },
      };

      const messaging = getMessaging();

      // Send to all registered devices for this user
      const sendPromises = tokens.map((token) =>
        messaging.send({
          token,
          ...messagePayload,
        })
      );

      const results = await Promise.allSettled(sendPromises);
      console.log(`Sent background notifications to ${tokens.length} devices for user ${userId}:`, results);
    } catch (err) {
      console.error("Error in onNewWhisperNotification Cloud Function:", err);
    }
  }
);
