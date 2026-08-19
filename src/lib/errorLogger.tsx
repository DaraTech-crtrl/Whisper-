import React, { Component, ReactNode, ErrorInfo } from "react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

export interface SystemLogData {
  id?: string;
  message: string;
  stack?: string;
  type: "runtime-error" | "unhandledrejection" | "react-boundary" | "pwa-error" | "network-error" | "manual";
  url?: string;
  userAgent?: string;
  userId?: string;
  username?: string;
  timestamp?: any;
  metadata?: string;
}

// In-memory rate limiting to prevent spamming Firestore
const recentErrorHashes = new Set<string>();
const DUP_TIME_WINDOW_MS = 5000;

function hashError(message: string, stack?: string): string {
  return `${message.slice(0, 100)}_${(stack || "").slice(0, 100)}`;
}

/**
  * Logs a client-side runtime error or PWA issue directly to Firestore system-logs collection.
  */
export async function logErrorToFirestore(params: {
  message: string;
  stack?: string;
  type?: SystemLogData["type"];
  metadata?: string | Record<string, any>;
  userId?: string;
  username?: string;
}): Promise<void> {
  try {
    const message = params.message || "Unknown runtime error";
    const stack = params.stack || "";
    const errType = params.type || "runtime-error";

    // Deduplicate rapid identical error triggers
    const errKey = hashError(message, stack);
    if (recentErrorHashes.has(errKey)) {
      return;
    }
    recentErrorHashes.add(errKey);
    setTimeout(() => {
      recentErrorHashes.delete(errKey);
    }, DUP_TIME_WINDOW_MS);

    // Get current auth user details if available
    const currentUser = auth?.currentUser;
    const uid = params.userId || currentUser?.uid || "anonymous";
    const userDisplayName = params.username || currentUser?.displayName || currentUser?.email || "anonymous";

    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, "system-logs", logId);

    const serializedMetadata = typeof params.metadata === "object"
      ? JSON.stringify(params.metadata)
      : params.metadata || "";

    const payload: Record<string, any> = {
      message: message.slice(0, 3900),
      type: errType,
      timestamp: serverTimestamp(),
      url: window.location.href.slice(0, 1900),
      userAgent: navigator.userAgent.slice(0, 900),
      userId: uid.slice(0, 120),
      username: userDisplayName.slice(0, 60),
    };

    if (stack) {
      payload.stack = stack.slice(0, 9500);
    }
    if (serializedMetadata) {
      payload.metadata = serializedMetadata.slice(0, 4800);
    }

    await setDoc(logRef, payload);
  } catch (err) {
    // Fail silently so logging itself never breaks application runtime
    console.warn("[ErrorLogger] Failed to send error log to Firestore:", err);
  }
}

let isLoggerInitialized = false;

/**
 * Initializes global error listeners for uncaught JS errors, unhandled promise rejections,
 * and PWA service worker errors.
 */
export function initErrorLogger(): void {
  if (isLoggerInitialized || typeof window === "undefined") return;
  isLoggerInitialized = true;

  // 1. Uncaught JS runtime errors
  window.addEventListener("error", (event: ErrorEvent) => {
    // Ignore cross-origin script errors or non-actionable noise
    if (!event.message || event.message.includes("ResizeObserver loop limit exceeded")) {
      return;
    }

    logErrorToFirestore({
      message: event.message || "Uncaught JS Error",
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      type: "runtime-error",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // 2. Unhandled Promise Rejections
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    let message = "Unhandled Promise Rejection";
    let stack = "";

    if (reason instanceof Error) {
      message = reason.message || message;
      stack = reason.stack || "";
    } else if (typeof reason === "string") {
      message = reason;
    } else if (reason) {
      try {
        message = JSON.stringify(reason);
      } catch {
        message = String(reason);
      }
    }

    logErrorToFirestore({
      message,
      stack,
      type: "unhandledrejection",
    });
  });

  // 3. Service Worker / PWA Error Listener
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_ERROR") {
        logErrorToFirestore({
          message: event.data.message || "Service Worker Runtime Error",
          stack: event.data.stack,
          type: "pwa-error",
          metadata: event.data.metadata,
        });
      }
    });
  }

  console.log("[ErrorLogger] Automated Firestore error logging initialized.");
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component that captures rendering crashes and logs them to Firestore system-logs.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logErrorToFirestore({
      message: error.message || "React Component Rendering Failure",
      stack: error.stack || errorInfo.componentStack || "",
      type: "react-boundary",
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              An unexpected error occurred in this view. The error has been automatically logged for remote diagnostics.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
