import React from "react";
import { motion } from "motion/react";
import { 
  Inbox, 
  Filter, 
  Archive, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  ArrowRight
} from "lucide-react";

interface EmptyStateProps {
  variant: "inbox" | "archived" | "filter";
  selectedTag?: string;
  selectedMode?: string;
  filterLabel?: string;
  username?: string;
  onCopyLink?: () => void;
  onResetFilter?: () => void;
  onSwitchToActive?: () => void;
  copied?: boolean;
}

export default function EmptyState({
  variant,
  selectedTag = "ALL",
  selectedMode,
  filterLabel,
  username,
  onResetFilter,
  onSwitchToActive
}: EmptyStateProps) {
  if (variant === "filter") {
    const activeFilterDisplay = filterLabel || (selectedMode && selectedMode !== "ALL" ? selectedMode : selectedTag);
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
          <Filter className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          No messages match this filter
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-1.5 leading-relaxed">
          No messages found for <span className="font-semibold text-indigo-600 dark:text-indigo-400">"{activeFilterDisplay}"</span>.
        </p>

        {onResetFilter && (
          <div className="mt-5">
            <button
              id="empty-state-reset-filter-btn"
              onClick={onResetFilter}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm transition-all active:scale-95"
            >
              <span>Show All Messages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  if (variant === "archived") {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 sm:p-10 text-center"
      >
        {/* Subtle ambient amber aura */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/10 via-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-600 dark:text-amber-400 shadow-md">
          <Archive className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Your Archive is Empty
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed">
          Messages you manually archive or messages that reach their auto-expiry timer will be safely preserved here for 30 days before permanent deletion.
        </p>

        {onSwitchToActive && (
          <div className="mt-6 flex justify-center">
            <button
              id="empty-state-back-to-inbox-btn"
              onClick={onSwitchToActive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Inbox className="w-4 h-4" />
              <span>Go to Main Inbox</span>
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Default: Main Inbox Empty State (Brand-consistent, highly polished vector artwork & actions)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-b from-white/90 via-slate-50/70 to-indigo-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/20 backdrop-blur-xl p-8 sm:p-10 text-center shadow-sm"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-tr from-indigo-500/15 via-purple-500/15 to-pink-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Professional Vector Illustration */}
      <div className="relative mx-auto w-28 h-28 mb-6 flex items-center justify-center">
        {/* Outer Pulsing Aura Ring */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 animate-pulse" />
        
        {/* Secondary Decorative Ring */}
        <div className="absolute inset-2 rounded-3xl border-2 border-dashed border-indigo-300/40 dark:border-indigo-500/30 animate-spin" style={{ animationDuration: '30s' }} />

        {/* Center Card Stack with Lock & Mail */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center p-4 text-white">
          <svg className="w-10 h-10 drop-shadow-md" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6.5C4 5.11929 5.11929 4 6.5 4H17.5C18.8807 4 20 5.11929 20 6.5V17.5C20 18.8807 18.8807 20 17.5 20H6.5C5.11929 20 4 18.8807 4 17.5V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 7L10.88 11.5867C11.56 12.04 12.44 12.04 13.12 11.5867L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Floating Mini Lock Badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-950 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
          </div>

          {/* Floating Sparkle Badge */}
          <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 border border-white flex items-center justify-center shadow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Copy */}
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Your Secret Inbox is Ready
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed">
        You haven't received any anonymous messages yet. Share your private link on your Instagram bio, WhatsApp status, or Twitter to invite confessions and secret questions!
      </p>

      {/* Security & Feature Badges */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">End-to-End Encrypted</span>
            <span className="text-slate-400">Only decrypted on your device</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Real-time Delivery</span>
            <span className="text-slate-400">Instant inbox alerts</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
          <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Sender Reputation</span>
            <span className="text-slate-400">Rate & block bad senders</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
