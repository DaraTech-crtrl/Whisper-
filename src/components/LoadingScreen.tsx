import React from "react";
import { motion } from "motion/react";
import { getAssetUrl } from "../lib/assets";

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = "Whisper", 
  subtext = "Secure anonymous messaging",
  fullScreen = true 
}: LoadingScreenProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950 transition-colors ${
        fullScreen ? 'min-h-screen w-full fixed inset-0 z-50' : 'min-h-[50vh] w-full'
      }`}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative flex items-center justify-center mb-5"
      >
        {/* Subtle glowing ambient aura */}
        <div className="absolute w-24 h-24 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-2xl animate-pulse" />
        
        {/* Branded Logo Container */}
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center p-1.5 bg-white shadow-xl shadow-indigo-100 border-2 border-indigo-50 ring-4 ring-indigo-500/5">
          <img 
            src={getAssetUrl("android-chrome-192x192.png")} 
            alt="Whisper Logo" 
            className="w-16 h-16 object-contain rounded-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="space-y-1.5 flex flex-col items-center"
      >
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>{message}</span>
        </h2>
        {subtext && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs">
            {subtext}
          </p>
        )}
      </motion.div>

      {/* Modern pulsing dots indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex items-center gap-1.5"
      >
        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </motion.div>
    </div>
  );
}
