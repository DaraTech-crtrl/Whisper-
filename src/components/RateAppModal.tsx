import React, { useState } from "react";
import { Star, X, Sparkles, MessageSquare, Heart, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfileData } from "../pages/AdminDashboard";
import { triggerHaptic } from "../lib/haptics";

interface RateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  dbUser?: UserProfileData | null;
  onRatedSuccess?: () => void;
}

const RATING_LABELS: Record<number, { text: string; sub: string; icon: string }> = {
  5: { text: "We Love You Too! 💖", sub: "Thank you for being part of Whisper!", icon: "🌟" },
  4: { text: "Great to Hear! 😊", sub: "We're thrilled you're enjoying Whisper.", icon: "✨" },
  3: { text: "Thanks for Feedback 👍", sub: "We're constantly improving the experience.", icon: "💬" },
  2: { text: "We Can Do Better 😕", sub: "Tell us how we can improve Whisper for you.", icon: "🛠️" },
  1: { text: "Sorry to Hear That 💔", sub: "Please let us know what went wrong.", icon: "🙏" },
};

export const STORAGE_KEY_HAS_RATED = "whisper_app_rated";
export const STORAGE_KEY_SNOOZE = "whisper_rate_snooze_until";

export function markUserHasRated(userId?: string, ratingScore?: number) {
  try {
    localStorage.setItem(STORAGE_KEY_HAS_RATED, "true");
    localStorage.removeItem(STORAGE_KEY_SNOOZE);
    if (userId) {
      updateDoc(doc(db, "users", userId), {
        hasRatedApp: true,
        ...(ratingScore ? { ratingScore } : {})
      }).catch(err => console.warn("Could not sync rating status to Firestore user doc:", err));
    }
  } catch (err) {
    console.error("Storage error marking rated state:", err);
  }
}

export function snoozeRatingPrompt(days = 3) {
  try {
    const snoozeUntil = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_SNOOZE, snoozeUntil.toString());
  } catch (err) {
    console.error("Storage error snoozing rating:", err);
  }
}

export function shouldShowRatingPrompt(dbUser?: UserProfileData | null): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY_HAS_RATED) === "true") {
      return false;
    }
    if ((dbUser as any)?.hasRatedApp) {
      localStorage.setItem(STORAGE_KEY_HAS_RATED, "true");
      return false;
    }

    const snoozeUntil = localStorage.getItem(STORAGE_KEY_SNOOZE);
    if (snoozeUntil && parseInt(snoozeUntil, 10) > Date.now()) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export default function RateAppModal({ isOpen, onClose, user, dbUser, onRatedSuccess }: RateAppModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const currentStarCount = hoverRating || rating;

  const handleStarClick = (score: number) => {
    setRating(score);
    triggerHaptic(score >= 4 ? "success" : "medium");
  };

  const handleStarHover = (score: number) => {
    if (score !== hoverRating) {
      setHoverRating(score);
      triggerHaptic("light");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMsg("Please select a star rating first.");
      triggerHaptic("warning");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Gather device info
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(userAgent);
      const deviceInfo = `${isMobileDevice ? "Mobile" : "Desktop"} (${navigator.platform || "Web"})`;

      // Save rating to Firestore ratings collection
      await addDoc(collection(db, "ratings"), {
        rating,
        feedback: feedbackText.trim() || null,
        userId: user?.uid || dbUser?.uid || "anonymous",
        username: dbUser?.username || "Anonymous User",
        displayName: dbUser?.displayName || "Whisper User",
        createdAt: serverTimestamp(),
        deviceInfo
      });

      // Mark locally and in user document
      markUserHasRated(user?.uid || dbUser?.uid, rating);

      triggerHaptic("success");
      setIsSubmitted(true);

      if (onRatedSuccess) {
        onRatedSuccess();
      }

      setTimeout(() => {
        setIsSubmitted(false);
        setRating(0);
        setFeedbackText("");
        onClose();
      }, 2200);
    } catch (err: any) {
      console.error("Error submitting rating:", err);
      setErrorMsg("Could not submit rating. Please try again.");
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemindLater = () => {
    triggerHaptic("light");
    snoozeRatingPrompt(3);
    onClose();
  };

  const handleNoThanks = () => {
    triggerHaptic("light");
    markUserHasRated(user?.uid || dbUser?.uid);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        id="rate-app-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8"
          id="rate-app-modal-card"
        >
          {/* Close button */}
          <button
            onClick={handleRemindLater}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close modal"
            id="rate-app-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {isSubmitted ? (
            <div className="py-8 text-center space-y-4" id="rate-app-success-view">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Thank You for Rating!
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                Your feedback helps us make Whisper faster, safer, and better for everyone.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" id="rate-app-form">
              {/* Header Icon & Title */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Enjoying Whisper?
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tap a star to rate your experience with anonymous encrypted messaging.
                </p>
              </div>

              {/* Star Selector */}
              <div className="flex flex-col items-center space-y-2 py-2">
                <div className="flex items-center space-x-2" id="star-rating-buttons">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = star <= currentStarCount;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => handleStarHover(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1.5 focus:outline-none transition-transform hover:scale-125 active:scale-95"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        id={`rate-star-btn-${star}`}
                      >
                        <Star
                          className={`w-9 h-9 transition-colors duration-200 ${
                            isSelected
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              : "fill-zinc-200 dark:fill-zinc-800 text-zinc-300 dark:text-zinc-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Dynamic Feedback Badge */}
                <div className="h-10 flex items-center justify-center">
                  {currentStarCount > 0 ? (
                    <motion.div
                      key={currentStarCount}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                        <span>{RATING_LABELS[currentStarCount]?.icon}</span>
                        <span>{RATING_LABELS[currentStarCount]?.text}</span>
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {RATING_LABELS[currentStarCount]?.sub}
                      </p>
                    </motion.div>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                      Select 1 to 5 stars
                    </span>
                  )}
                </div>
              </div>

              {/* Optional Feedback Comment */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="rate-feedback-textarea"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  Feedback (Optional)
                </label>
                <textarea
                  id="rate-feedback-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share what you like or how we can improve..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-rose-500 text-center" id="rate-app-error-msg">
                  {errorMsg}
                </p>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0}
                  onClick={() => triggerHaptic("medium")}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 ${
                    rating > 0
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-[0.99]"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  }`}
                  id="submit-rating-btn"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Rating</span>
                      <Heart className="w-4 h-4 fill-current" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={handleRemindLater}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    id="rate-app-remind-later-btn"
                  >
                    Remind me later
                  </button>
                  <button
                    type="button"
                    onClick={handleNoThanks}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    id="rate-app-no-thanks-btn"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
