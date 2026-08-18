import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatDistanceToNow } from "date-fns";

interface PauseLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  dbUser: any;
  onUpdateDbUser?: (updatedFields: Partial<any>) => void;
}

export default function PauseLinkModal({
  isOpen,
  onClose,
  userUid,
  dbUser,
  onUpdateDbUser
}: PauseLinkModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  // Check current pause state
  const isPermanentlyPaused = dbUser?.isLinkPaused === true;
  let isTemporarilyPaused = false;
  let tempPauseTimeRemaining = "";
  let pauseUntilDate: Date | null = null;

  if (dbUser?.pauseUntil) {
    const timeMs = dbUser.pauseUntil.seconds
      ? dbUser.pauseUntil.seconds * 1000
      : (dbUser.pauseUntil.toDate ? dbUser.pauseUntil.toDate().getTime() : new Date(dbUser.pauseUntil).getTime());
    
    if (timeMs > Date.now()) {
      isTemporarilyPaused = true;
      pauseUntilDate = new Date(timeMs);
      tempPauseTimeRemaining = formatDistanceToNow(pauseUntilDate, { addSuffix: true });
    }
  }

  const isPaused = isPermanentlyPaused || isTemporarilyPaused;

  // Handler to toggle permanent pause
  const handleTogglePermanentPause = async () => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const nextPausedState = !isPermanentlyPaused;
      const updates = {
        isLinkPaused: nextPausedState,
        pauseUntil: null,
        pauseStartedAt: nextPausedState ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "users", userUid), updates);
      
      if (onUpdateDbUser) {
        onUpdateDbUser({
          isLinkPaused: nextPausedState,
          pauseUntil: null,
          pauseStartedAt: nextPausedState ? new Date() : null
        });
      }

      setFeedback({
        text: nextPausedState ? "Link permanently paused. Senders won't be able to message you." : "Link unpaused! You can receive messages again.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Error toggling link pause:", err);
      setFeedback({ text: "Failed to update pause status. Please try again.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handler to set temporary pause (1, 6, 24 hours)
  const handlePauseForHours = async (hours: number) => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const untilDate = new Date(Date.now() + hours * 60 * 60 * 1000);
      const updates = {
        isLinkPaused: false,
        pauseUntil: Timestamp.fromDate(untilDate),
        pauseStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "users", userUid), updates);

      if (onUpdateDbUser) {
        onUpdateDbUser({
          isLinkPaused: false,
          pauseUntil: untilDate,
          pauseStartedAt: new Date()
        });
      }

      setFeedback({
        text: `Link paused for ${hours} ${hours === 1 ? 'hour' : 'hours'}. Messages will auto-resume afterwards.`,
        type: "success"
      });
    } catch (err: any) {
      console.error("Error setting temporary pause:", err);
      setFeedback({ text: "Failed to set temporary pause. Please try again.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handler to unpause completely
  const handleUnpause = async () => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const updates = {
        isLinkPaused: false,
        pauseUntil: null,
        pauseStartedAt: null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "users", userUid), updates);

      if (onUpdateDbUser) {
        onUpdateDbUser({
          isLinkPaused: false,
          pauseUntil: null,
          pauseStartedAt: null
        });
      }

      setFeedback({ text: "Link unpaused! You are now receiving messages.", type: "success" });
    } catch (err: any) {
      console.error("Error unpausing link:", err);
      setFeedback({ text: "Failed to unpause link. Please try again.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Header Row with Chevron Back & Title */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-900 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Pause my link
            </h2>
            <div className="w-8" /> {/* Spacer for optical centering */}
          </div>

          {/* Scrollable Content Container */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Center Stop Hand Icon Header */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                {/* Hand stop icon styling */}
                <span className="text-3xl select-none" role="img" aria-label="Stop">
                  ✋
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Stop receiving messages
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                You can pause your link to stop receiving messages for a period of time, or permanently.
              </p>
            </div>

            {/* Active Pause Status Alert (If currently paused) */}
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span>
                      {isPermanentlyPaused
                        ? "Link is permanently paused"
                        : `Paused ${tempPauseTimeRemaining}`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-amber-700/80 dark:text-amber-400/90">
                  Senders who visit your link will see a "Messages Paused" notification.
                </p>

                <button
                  type="button"
                  onClick={handleUnpause}
                  disabled={isUpdating}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Unpause & Resume Messages Now
                </button>
              </motion.div>
            )}

            {/* Feedback Message Banner */}
            {feedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Permanent Pause Toggle Card */}
            <div className="bg-slate-100/80 dark:bg-slate-900/90 rounded-2xl p-4 flex items-center justify-between transition-colors">
              <span className="font-bold text-base text-slate-900 dark:text-white">
                Pause link
              </span>

              {/* iOS Style Switch Toggle */}
              <button
                type="button"
                onClick={handleTogglePermanentPause}
                disabled={isUpdating}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPermanentlyPaused ? "bg-slate-900 dark:bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
                role="switch"
                aria-checked={isPermanentlyPaused}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isPermanentlyPaused ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Temporary Pause Options Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Pause temporarily</span>
              </div>

              {/* Card List with Options */}
              <div className="bg-slate-100/80 dark:bg-slate-900/90 rounded-2xl overflow-hidden divide-y divide-slate-200/70 dark:divide-slate-800/80 border border-transparent">
                <button
                  type="button"
                  onClick={() => handlePauseForHours(1)}
                  disabled={isUpdating}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer disabled:opacity-50"
                >
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Pause for 1 hour
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePauseForHours(6)}
                  disabled={isUpdating}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer disabled:opacity-50"
                >
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Pause for 6 hours
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePauseForHours(24)}
                  disabled={isUpdating}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer disabled:opacity-50"
                >
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Pause for 24 hours
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
