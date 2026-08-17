import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Share, PlusSquare, Smartphone, Bell, CheckCircle2, ArrowRight } from "lucide-react";

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function IOSInstallGuideModal({
  isOpen,
  onClose,
  title = "Enable Push Notifications on iPhone / iPad",
  subtitle = "Apple iOS requires adding Whisper to your Home Screen before it can deliver background push notifications."
}: IOSInstallGuideModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                iOS 16.4+ Web Push PWA
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {subtitle} Follow these quick 3 steps in Safari:
          </p>

          {/* Steps */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Tap the Safari <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><Share className="w-3.5 h-3.5 inline" /> Share</span> button
                </div>
                <p className="text-slate-500 text-[11px]">
                  Located at the bottom of Safari (or top bar on iPad).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Tap <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Scroll down the share sheet and select "Add to Home Screen", then tap "Add" in the top right.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Open <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><Bell className="w-3.5 h-3.5 inline" /> Whisper</span> from Home Screen
                </div>
                <p className="text-slate-500 text-[11px]">
                  Launch the installed Whisper app icon. Push notifications and offline mode will now activate seamlessly!
                </p>
              </div>
            </div>
          </div>

          {/* Done / Close CTA */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Got It, I'll Add to Home Screen
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
