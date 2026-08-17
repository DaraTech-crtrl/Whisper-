import { useState, useEffect, useCallback, useRef } from "react";

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoUpdate, setAutoUpdate] = useState<boolean>(() => {
    try {
      return localStorage.getItem("whisper_pwa_autoupdate") !== "false";
    } catch {
      return true;
    }
  });
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Apply update and reload
  const applyUpdate = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
    } else if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, []);

  // Check for updates
  const checkForUpdate = useCallback(async (manual = false): Promise<boolean> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      if (manual) {
        setUpdateStatusText("Service workers not supported on this browser.");
        setTimeout(() => setUpdateStatusText(null), 4000);
      }
      return false;
    }

    if (manual) setIsChecking(true);
    setUpdateStatusText(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        if (manual) {
          setUpdateStatusText("You are using the latest live version.");
          setTimeout(() => setUpdateStatusText(null), 4000);
        }
        setLastChecked(new Date());
        return false;
      }

      registrationRef.current = registration;

      // If there is already a waiting worker
      if (registration.waiting) {
        waitingWorkerRef.current = registration.waiting;
        setUpdateAvailable(true);
        setLastChecked(new Date());
        if (manual) setUpdateStatusText("New update ready to install!");
        if (autoUpdate) {
          applyUpdate();
        }
        return true;
      }

      // Check server for new version
      await registration.update();
      setLastChecked(new Date());

      if (registration.waiting) {
        waitingWorkerRef.current = registration.waiting;
        setUpdateAvailable(true);
        if (manual) setUpdateStatusText("New update ready to install!");
        if (autoUpdate) {
          applyUpdate();
        }
        return true;
      } else {
        if (manual) {
          setUpdateStatusText("Whisper is up to date! (Latest build)");
          setTimeout(() => setUpdateStatusText(null), 4000);
        }
        return false;
      }
    } catch (err) {
      console.warn("PWA update check error:", err);
      if (manual) {
        setUpdateStatusText("Check completed. App is up to date.");
        setTimeout(() => setUpdateStatusText(null), 4000);
      }
      return false;
    } finally {
      if (manual) setIsChecking(false);
    }
  }, [autoUpdate, applyUpdate]);

  // Toggle auto-update setting
  const toggleAutoUpdate = useCallback((enabled: boolean) => {
    setAutoUpdate(enabled);
    try {
      localStorage.setItem("whisper_pwa_autoupdate", enabled ? "true" : "false");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;

    // Handle controller change (when new worker takes over)
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Monitor registrations
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
            if (autoUpdate) {
              applyUpdate();
            }
          }
        });
      });
    });

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

    // Initial check after 2 seconds
    const initTimer = setTimeout(() => {
      checkForUpdate(false);
    }, 2000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      clearTimeout(initTimer);
    };
  }, [checkForUpdate, autoUpdate, applyUpdate]);

  return {
    updateAvailable,
    isChecking,
    lastChecked,
    autoUpdate,
    updateStatusText,
    checkForUpdate: () => checkForUpdate(true),
    applyUpdate,
    toggleAutoUpdate,
    dismissUpdate: () => setUpdateAvailable(false)
  };
}
