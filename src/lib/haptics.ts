/**
 * Haptic Feedback Utility for Mobile & Touch Devices
 * Uses Web Vibration API when available.
 */

import type { SyntheticEvent } from "react";

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "message";

export const STORAGE_KEY_HAPTICS_ENABLED = "whisper_haptics_enabled";

/**
 * Checks if haptics are enabled in browser localStorage. Defaults to true.
 */
export function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HAPTICS_ENABLED);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

/**
 * Enable or disable haptics preference in localStorage.
 */
export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_HAPTICS_ENABLED, enabled ? "true" : "false");
  } catch {
    // Handle quota errors or private browsing restrictions
  }
}

export function triggerHaptic(style: HapticStyle = "light"): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  // Respect user preference setting
  if (!isHapticsEnabled()) {
    return;
  }

  try {
    switch (style) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(50);
        break;
      case "success":
        navigator.vibrate([15, 30, 20]);
        break;
      case "warning":
        navigator.vibrate([30, 50, 30]);
        break;
      case "error":
        navigator.vibrate([50, 30, 50, 30, 50]);
        break;
      case "message":
        // Distinct double pulse for incoming whisper messages
        navigator.vibrate([70, 40, 90]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Gracefully handle browser/permission restrictions
  }
}

/**
 * Creates a click handler wrapper that triggers haptic feedback before calling onClick
 */
export function withHaptic<E extends SyntheticEvent>(
  handler?: (e: E) => void,
  style: HapticStyle = "light"
): (e: E) => void {
  return (e: E) => {
    triggerHaptic(style);
    if (handler) {
      handler(e);
    }
  };
}

