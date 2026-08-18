import { useState, useEffect, useCallback, useRef } from "react";
import localVersionData from "../version.json";

export interface VersionInfo {
  version: string;
  rawVersion: string;
  displayVersion: string;
  buildTime: number;
  buildDate: string;
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState<boolean>(() => {
    try {
      return localStorage.getItem("whisper_auto_update") !== "false";
    } catch {
      return true;
    }
  });

  const toggleAutoUpdate = useCallback((enabled?: boolean) => {
    setAutoUpdate((prev) => {
      const next = enabled !== undefined ? enabled : !prev;
      try {
        localStorage.setItem("whisper_auto_update", String(next));
      } catch {}
      return next;
    });
  }, []);

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const currentVersionData = localVersionData as VersionInfo;
  const currentVersion = currentVersionData.displayVersion || currentVersionData.version || "Whisper v1.0.0";

  // Apply update, clear stale cache, store applied version, and reload page safely
  const applyUpdate = useCallback(async () => {
    try {
      if (remoteVersion) {
        try {
          localStorage.setItem("whisper_applied_version", remoteVersion);
        } catch {}
      }

      // Clear CacheStorage
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      }

      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch (err) {
      console.warn("Apply update warning:", err);
    } finally {
      window.location.reload();
    }
  }, [remoteVersion]);

  // Check static /version.json and service worker status
  const checkForUpdate = useCallback(async (manual = false): Promise<boolean> => {
    // Skip automatic checks in local development to avoid dev server reload loops
    if (!manual && (import.meta as any).env?.DEV) {
      return false;
    }

    if (manual) setIsChecking(true);
    setUpdateStatusText(null);

    let isNewVersionFound = false;

    try {
      // 1. Direct fetch of static version.json from server
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      if (res.ok) {
        const remoteData: VersionInfo = await res.json();
        
        let appliedVersion = "";
        let dismissedVersion = "";
        try {
          appliedVersion = localStorage.getItem("whisper_applied_version") || "";
          dismissedVersion = localStorage.getItem("whisper_dismissed_version") || "";
        } catch {}

        const newLabel = remoteData.displayVersion || remoteData.version || `Whisper v${remoteData.rawVersion}`;

        // Version is only considered newer if it's different from local version AND not already applied or dismissed
        const isVersionDifferent = 
          remoteData.rawVersion !== currentVersionData.rawVersion &&
          newLabel !== appliedVersion &&
          remoteData.rawVersion !== appliedVersion &&
          newLabel !== dismissedVersion &&
          remoteData.rawVersion !== dismissedVersion;

        if (isVersionDifferent) {
          isNewVersionFound = true;
          setRemoteVersion(newLabel);
          setUpdateAvailable(true);
          setLastChecked(new Date());

          if (manual) {
            setUpdateStatusText(`New update ${newLabel} is ready!`);
          }
        } else {
          // If already on this version or applied, sync state
          if (manual) {
            setUpdateStatusText(`You are on the latest build (${currentVersion})`);
            setTimeout(() => setUpdateStatusText(null), 4000);
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching static /version.json:", err);
    }

    // 2. Backup check via Service Worker registration
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registrationRef.current = registration;

          if (registration.waiting) {
            waitingWorkerRef.current = registration.waiting;
            setUpdateAvailable(true);
            isNewVersionFound = true;
            if (manual) setUpdateStatusText("Service worker update ready to install!");
          } else if (manual) {
            await registration.update();
            if (registration.waiting) {
              waitingWorkerRef.current = registration.waiting;
              setUpdateAvailable(true);
              isNewVersionFound = true;
              setUpdateStatusText("Service worker update ready to install!");
            }
          }
        }
      }
    } catch (swErr) {
      console.warn("SW update check note:", swErr);
    }

    setLastChecked(new Date());
    if (manual) setIsChecking(false);
    return isNewVersionFound;
  }, [currentVersionData, currentVersion]);

  // Dismiss update banner for this specific version
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    if (remoteVersion) {
      try {
        localStorage.setItem("whisper_dismissed_version", remoteVersion);
      } catch {}
    }
  }, [remoteVersion]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        registrationRef.current = reg;

        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setUpdateAvailable(true);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setUpdateAvailable(true);
            }
          });
        });
      });
    }

    // Check updates on window focus
    const handleFocus = () => {
      checkForUpdate(false);
    };

    // Check updates on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      checkForUpdate(false);
    }, 60000);

    // Initial check after 3 seconds
    const initTimer = setTimeout(() => {
      checkForUpdate(false);
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      clearTimeout(initTimer);
    };
  }, [checkForUpdate]);

  return {
    currentVersion,
    remoteVersion,
    updateAvailable,
    isChecking,
    lastChecked,
    autoUpdate,
    updateStatusText,
    checkForUpdate: () => checkForUpdate(true),
    applyUpdate,
    toggleAutoUpdate,
    dismissUpdate
  };
}
