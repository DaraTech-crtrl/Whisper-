import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles, X, ArrowUpCircle } from "lucide-react";
import { usePWAUpdate } from "../lib/usePWAUpdate";

interface AppUpdateBannerProps {
  updateState?: ReturnType<typeof usePWAUpdate>;
}

export default function AppUpdateBanner({ updateState }: AppUpdateBannerProps) {
  const fallbackHook = usePWAUpdate();
  const { updateAvailable, applyUpdate, dismissUpdate, isChecking, remoteVersion } = updateState || fallbackHook;

  if (!updateAvailable) return null;

  // Clean version string (strip redundant "Whisper " prefix if present)
  const formattedVersion = remoteVersion ? remoteVersion.replace(/^Whisper\s*/i, "") : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed bottom-4 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 pointer-events-auto"
      >
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h4 className="font-bold text-sm text-white">
                  Update Ready
                </h4>
                {formattedVersion && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 shrink-0">
                    {formattedVersion}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={dismissUpdate}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            A fresh version of Whisper is ready with updated features, performance improvements, and fixes.
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={applyUpdate}
              disabled={isChecking}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Installing..." : "Update & Refresh"}</span>
            </button>

            <button
              onClick={dismissUpdate}
              className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
