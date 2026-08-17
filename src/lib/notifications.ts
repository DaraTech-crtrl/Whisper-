import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { app, db } from "./firebase";

// Web Push VAPID Public Key for Whisper Background Push Service
export const VAPID_PUBLIC_KEY = 
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || 
  (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
  "BOy5oVBmsK0d_Dzb1VWy6GvMqDJU57R3G_ueIExeQP5Px_63N33tBECpy2TjaXXEDBJGFjR11FIJMeh4M7Ep5Hk";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Convert a base64 string to a Uint8Array for PushManager applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detect if the current device is running Apple iOS (iPhone / iPad / iPod)
 */
export function isIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect if the app is currently running in standalone PWA / Home Screen mode
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/**
 * Detailed diagnostic of notification support including iOS PWA status
 */
export function getNotificationSupportDetails(): {
  supported: boolean;
  isIOSDevice: boolean;
  isInstalledPWA: boolean;
  permission: NotificationPermissionState;
  needsIOSInstall: boolean;
  message?: string;
} {
  const isIOSDevice = isIOS();
  const isInstalledPWA = isStandalonePWA();
  const hasNotificationAPI = typeof window !== "undefined" && "Notification" in window;

  const permission = getNotificationPermissionStatus();

  // On iOS, Web Push is supported exclusively when added to the Home Screen (iOS 16.4+)
  const needsIOSInstall = isIOSDevice && !isInstalledPWA;

  if (needsIOSInstall) {
    return {
      supported: false,
      isIOSDevice,
      isInstalledPWA,
      permission,
      needsIOSInstall: true,
      message: "iOS requires adding Whisper to your Home Screen first to enable push notifications."
    };
  }

  return {
    supported: hasNotificationAPI,
    isIOSDevice,
    isInstalledPWA,
    permission,
    needsIOSInstall: false
  };
}

let fcmSupportedPromise: Promise<boolean> | null = null;

/**
 * Safely check if FCM is supported in the current environment
 */
export function isFCMSupported(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!("Notification" in window)) return Promise.resolve(false);
  if (!("serviceWorker" in navigator)) return Promise.resolve(false);
  if (!("indexedDB" in window)) return Promise.resolve(false);

  if (!fcmSupportedPromise) {
    fcmSupportedPromise = isSupported().catch((err) => {
      console.warn("FCM isSupported check notice:", err);
      return false;
    });
  }
  return fcmSupportedPromise;
}

/**
 * Check if the current browser environment supports Web Push Notifications & FCM
 */
export async function checkNotificationSupport(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return true;
}

/**
 * Get the current browser notification permission
 */
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    return Notification.permission as NotificationPermissionState;
  } catch {
    return "unsupported";
  }
}

/**
 * Play a gentle modern chime sound using Web Audio API (zero external assets needed)
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Smooth chime note 1 (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Note 2 (B5 - 987.77Hz) slightly delayed for sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // AudioContext blocked or not allowed yet
  }
}

/**
 * Register Service Worker, obtain Web Push Subscription & FCM token, and store in Firestore
 */
export async function enablePushNotifications(userId: string): Promise<{ 
  success: boolean; 
  token?: string; 
  subscription?: any; 
  error?: string; 
  needsIOSInstall?: boolean 
}> {
  try {
    const isIOSDevice = isIOS();
    const isInstalled = isStandalonePWA();

    if (isIOSDevice && !isInstalled) {
      return {
        success: false,
        needsIOSInstall: true,
        error: "To enable push notifications on iOS, tap the Share button in Safari and select 'Add to Home Screen', then launch Whisper from your Home Screen."
      };
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return { success: false, error: "Your browser does not support web push notifications." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { 
        success: false, 
        error: permission === "denied" 
          ? "Notification permission was blocked. Please click the site icon in your browser address bar to allow notifications."
          : "Notification permission was dismissed."
      };
    }

    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn("Service worker registration note:", swErr);
      }
    }

    let pushSubscriptionJSON: any = null;

    // 1. Obtain native Web Push Subscription (RFC8291 / RFC8292 standard for all browsers/OS)
    if (swRegistration && "PushManager" in window && swRegistration.pushManager) {
      try {
        let sub = await swRegistration.pushManager.getSubscription();
        if (!sub) {
          sub = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }
        if (sub) {
          pushSubscriptionJSON = sub.toJSON();
          try {
            localStorage.setItem("whisper_push_sub", JSON.stringify(pushSubscriptionJSON));
          } catch {}
        }
      } catch (pushErr: any) {
        console.warn("Web Push Subscription note:", pushErr);
      }
    }

    let token: string | undefined;

    // 2. Also register with Firebase Cloud Messaging if available
    const supported = await isFCMSupported();
    if (supported) {
      try {
        const messaging = getMessaging(app);
        const tokenOptions: any = {};
        if (swRegistration) {
          tokenOptions.serviceWorkerRegistration = swRegistration;
        }
        if (VAPID_PUBLIC_KEY) {
          tokenOptions.vapidKey = VAPID_PUBLIC_KEY;
        }

        token = await getToken(messaging, tokenOptions);
      } catch (fcmErr: any) {
        console.warn("FCM getToken note (using fallback):", fcmErr);
        token = `web_push_${userId.substring(0, 8)}_${Date.now()}`;
      }
    } else {
      token = `web_push_${userId.substring(0, 8)}_${Date.now()}`;
    }

    // 3. Save subscription and preferences to Firestore user profile
    const userDocRef = doc(db, "users", userId);
    const updateData: any = {
      notificationsEnabled: true,
      notificationSound: true,
      updatedAt: serverTimestamp()
    };

    if (pushSubscriptionJSON) {
      updateData.pushSubscription = pushSubscriptionJSON;
      updateData.pushSubscriptions = arrayUnion(pushSubscriptionJSON);
    }

    if (token) {
      updateData.fcmToken = token;
      updateData.fcmTokens = arrayUnion(token);
    }

    await updateDoc(userDocRef, updateData);

    return { 
      success: true, 
      token, 
      subscription: pushSubscriptionJSON 
    };
  } catch (err: any) {
    console.error("Error enabling push notifications:", err);
    return { success: false, error: err.message || "Failed to enable notifications." };
  }
}

/**
 * Disable push notifications for the current user and unsubscribe push manager
 */
export async function disablePushNotifications(userId: string, currentToken?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      } catch (e) {
        console.warn("Unsubscribe notice:", e);
      }
    }

    let localSub: any = null;
    try {
      const stored = localStorage.getItem("whisper_push_sub");
      if (stored) localSub = JSON.parse(stored);
      localStorage.removeItem("whisper_push_sub");
    } catch {}

    const userDocRef = doc(db, "users", userId);
    const updateData: any = {
      notificationsEnabled: false,
      updatedAt: serverTimestamp()
    };

    if (currentToken) {
      updateData.fcmTokens = arrayRemove(currentToken);
    }
    if (localSub) {
      updateData.pushSubscriptions = arrayRemove(localSub);
    }

    await updateDoc(userDocRef, updateData);

    return { success: true };
  } catch (err: any) {
    console.error("Error disabling push notifications:", err);
    return { success: false, error: err.message || "Failed to disable notifications." };
  }
}

/**
 * Send real background push notification through the server
 */
export async function dispatchServerPushNotification(options: {
  receiverId?: string;
  subscriptions?: any[];
  subscription?: any;
  mode?: string;
  modeIcon?: string;
  username?: string;
  customTitle?: string;
  customBody?: string;
  delayMs?: number;
}): Promise<{ success: boolean; delivered?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/notify-whisper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn("Dispatch server push warning:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a sample/test notification on the user's device.
 * Triggers BOTH local notification and background Web Push via server so users can test closing the app.
 */
export async function triggerTestNotification(username: string = "friend", delaySeconds: number = 0) {
  playNotificationChime();

  // Retrieve current push subscription from localStorage or ServiceWorker
  let currentSub: any = null;
  try {
    const stored = localStorage.getItem("whisper_push_sub");
    if (stored) currentSub = JSON.parse(stored);
  } catch {}

  if (!currentSub && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) currentSub = sub.toJSON();
      }
    } catch {}
  }

  // Dispatch background push test via server
  if (currentSub) {
    dispatchServerPushNotification({
      subscription: currentSub,
      username,
      mode: "Secret Whisper",
      modeIcon: "🤫",
      customTitle: "Whisper Alert: Test Notification 🤫",
      customBody: `Push notification delivered to @${username}! Tap to open Whisper inbox.`,
      delayMs: delaySeconds * 1000
    });
  }

  // Immediate local preview notification
  const title = "New Secret Whisper! 🤫";
  const options: NotificationOptions = {
    body: `Someone just sent a secret whisper to @${username}. Click to jump straight into your dashboard.`,
    icon: "https://whisper.runflix.name.ng/android-chrome-192x192.png",
    badge: "https://whisper.runflix.name.ng/favicon-32x32.png",
    tag: "test-whisper-notification",
    data: {
      url: "/dashboard"
    }
  };

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // Continue to standard Notification fallback
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        window.location.href = "/dashboard";
      };
    } catch (e) {
      console.warn("Test notification display error:", e);
    }
  }
}

/**
 * Trigger an instant browser notification when a new whisper arrives in realtime
 */
export function displayIncomingWhisperNotification(modeName: string = "Secret Whisper", modeIcon: string = "🤫") {
  playNotificationChime();

  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = `New ${modeName} Received! ${modeIcon}`;
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: `You have a new encrypted anonymous ${modeName.toLowerCase()}. Click to open and read.`,
    icon: "https://whisper.runflix.name.ng/android-chrome-192x192.png",
    badge: "https://whisper.runflix.name.ng/favicon-32x32.png",
    tag: "incoming-whisper-" + Date.now(),
    vibrate: [200, 100, 200],
    data: {
      url: "/dashboard"
    }
  };

  // Try Service Worker showNotification first (standard on mobile browsers / PWAs)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js").then((reg) => {
      if (reg && reg.showNotification) {
        reg.showNotification(title, options).catch(() => {
          try {
            const notif = new Notification(title, options);
            notif.onclick = () => {
              window.focus();
              window.location.href = "/dashboard";
            };
          } catch (e) {}
        });
      } else {
        try {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            window.location.href = "/dashboard";
          };
        } catch (e) {}
      }
    }).catch(() => {
      try {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          window.location.href = "/dashboard";
        };
      } catch (e) {}
    });
  } else {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        window.location.href = "/dashboard";
      };
    } catch (e) {
      console.warn("Direct Notification notice:", e);
    }
  }
}

/**
 * Safely subscribe to foreground messages from Firebase Cloud Messaging if supported
 */
export function subscribeToForegroundFCM(onReceive: (payload: any) => void) {
  let unsub: (() => void) | null = null;
  let isCancelled = false;

  isFCMSupported().then((supported) => {
    if (!supported || isCancelled) return;
    try {
      const messaging = getMessaging(app);
      unsub = onMessage(messaging, (payload) => {
        console.log("Foreground FCM message received:", payload);
        playNotificationChime();
        onReceive(payload);
      });
    } catch (err) {
      console.warn("Foreground FCM subscription note:", err);
    }
  }).catch(() => {});

  return () => {
    isCancelled = true;
    if (unsub) unsub();
  };
}

