import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles, X, ArrowUpCircle } from "lucide-react";
import { usePWAUpdate } from "../lib/usePWAUpdate";

interface AppUpdateBannerProps {
  updateState?: ReturnType<typeof usePWAUpdate>;
}

export default function AppUpdateBanner({ updateState }: AppUpdateBannerProps) {
  const fallbackHook = usePWAUpdate();
  const { updateAvailable, applyUpdate, dismissUpdate, isChecking } = updateState || fallbackHook;

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-50 pointer-events-auto"
      >
        <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white border-2 border-indigo-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-white truncate">New Update Ready!</h4>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300">
                  v-latest
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                A fresh version of Whisper is ready to install.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={applyUpdate}
              disabled={isChecking}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
              Update Now
            </button>
            <button
              onClick={dismissUpdate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
