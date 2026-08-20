import React from "react";
import { motion } from "motion/react";
import { Lock, ShieldCheck } from "lucide-react";
import { getAssetUrl } from "../lib/assets";

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  badge?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = "Whisper", 
  subtext = "Encrypted Anonymous Messaging",
  badge = "End-to-End Encrypted",
  fullScreen = true 
}: LoadingScreenProps) {
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${
        fullScreen ? "min-h-screen w-full fixed inset-0 z-50 overflow-hidden" : "min-h-[50vh] w-full"
      }`}
    >
      <div className="relative flex flex-col items-center max-w-xs w-full">
        {/* Glowing ambient radial aura */}
        <div className="absolute -top-6 w-44 h-44 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-2xl animate-pulse pointer-events-none" />

        {/* Branded Logo Container */}
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center p-2 bg-white dark:bg-slate-900 shadow-2xl shadow-indigo-500/15 border-2 border-slate-200/80 dark:border-slate-800 mb-5 ring-4 ring-indigo-500/10"
        >
          {!imgFailed ? (
            <img 
              src={getAssetUrl("android-chrome-192x192.png")} 
              alt="Whisper Logo" 
              className="w-full h-full object-contain rounded-2xl"
              onError={() => setImgFailed(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-3xl leading-none select-none">🤫</span>
          )}
        </motion.div>

        {/* Title & Subtext */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="space-y-1.5 flex flex-col items-center"
        >
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {message}
          </h2>
          {subtext && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs leading-relaxed">
              {subtext}
            </p>
          )}

          {badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold tracking-wide mt-2">
              <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{badge}</span>
            </div>
          )}
        </motion.div>

        {/* Sleek Animated Progress Bar */}
        <motion.div 
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mt-6 w-32 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative"
        >
          <motion.div 
            animate={{ 
              x: ["-100%", "200%"],
              width: ["40%", "70%", "40%"]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.4, 
              ease: "easeInOut" 
            }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 rounded-full"
          />
        </motion.div>

        {/* Pulsing Dots Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-3 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </motion.div>
      </div>
    </motion.div>
  );
}
