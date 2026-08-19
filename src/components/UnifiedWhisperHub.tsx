import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Shuffle, 
  Pencil, 
  RotateCcw, 
  Clock, 
  Share2,
  Check, 
  MessageCircle,
  Twitter
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import { WhisperMode, WHISPER_MODES } from "../lib/whisperModes";
import { getNextPromptForMode, buildModeShareUrl } from "../lib/modeTemplates";
import { cn } from "../lib/utils";

interface UnifiedWhisperHubProps {
  username: string;
  displayName?: string;
  photoURL?: string | null;
  avatarUrl?: string | null;
  isLinkPaused?: boolean;
  onOpenPauseModal: () => void;
  activeModeId: string;
  onSelectModeId: (modeId: string) => void;
  customPrompts: Record<string, string>;
  onPromptChange: (modeId: string, newPrompt: string, newUrl: string) => void;
  onGenerateStoryCard: (mode: WhisperMode, url: string, prompt: string) => void;
}

const carouselVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 140 : dir < 0 ? -140 : 0,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 28 },
      opacity: { duration: 0.22, ease: "easeOut" },
      scale: { duration: 0.22, ease: "easeOut" },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -140 : dir < 0 ? 140 : 0,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 28 },
      opacity: { duration: 0.18, ease: "easeIn" },
      scale: { duration: 0.18, ease: "easeIn" },
    },
  }),
};

export default function UnifiedWhisperHub({
  username,
  displayName,
  photoURL,
  avatarUrl,
  isLinkPaused,
  onOpenPauseModal,
  activeModeId,
  onSelectModeId,
  customPrompts,
  onPromptChange,
  onGenerateStoryCard,
}: UnifiedWhisperHubProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState("");
  const [swipeDirection, setSwipeDirection] = useState<number>(0);

  const currentIndex = WHISPER_MODES.findIndex(m => m.id === activeModeId);
  const activeMode = WHISPER_MODES[currentIndex >= 0 ? currentIndex : 0];
  const activePrompt = customPrompts[activeMode.id] || activeMode.prompt;
  const isCustomized = activePrompt !== activeMode.prompt;
  const activeShareUrl = buildModeShareUrl(activeMode, username, activePrompt);

  const goToPrev = () => {
    const prevIndex = currentIndex <= 0 ? WHISPER_MODES.length - 1 : currentIndex - 1;
    setSwipeDirection(-1);
    onSelectModeId(WHISPER_MODES[prevIndex].id);
    setIsEditingPrompt(false);
  };

  const goToNext = () => {
    const nextIndex = currentIndex >= WHISPER_MODES.length - 1 ? 0 : currentIndex + 1;
    setSwipeDirection(1);
    onSelectModeId(WHISPER_MODES[nextIndex].id);
    setIsEditingPrompt(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {
      // fallback
    }
  };

  const handleShuffle = () => {
    const next = getNextPromptForMode(activeMode.id, activePrompt);
    const newUrl = buildModeShareUrl(activeMode, username, next);
    onPromptChange(activeMode.id, next, newUrl);
    setIsEditingPrompt(false);
  };

  const handleStartEdit = () => {
    setEditedPromptText(activePrompt);
    setIsEditingPrompt(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editedPromptText.trim();
    if (trimmed) {
      const newUrl = buildModeShareUrl(activeMode, username, trimmed);
      onPromptChange(activeMode.id, trimmed, newUrl);
    }
    setIsEditingPrompt(false);
  };

  const handleReset = () => {
    const newUrl = buildModeShareUrl(activeMode, username, activeMode.prompt);
    onPromptChange(activeMode.id, activeMode.prompt, newUrl);
    setIsEditingPrompt(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeMode.name} — Whisper`,
          text: `${activeMode.icon} ${activePrompt}`,
          url: activeShareUrl
        });
      } catch (err) {
        console.log("Share dismissed", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden space-y-0">
      
      {/* 1. Top Section: Profile Header & Version Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3.5">
        {/* Profile & Status Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar 
              photoURL={photoURL || avatarUrl}
              name={displayName}
              username={username}
              size="md" 
              className="ring-2 ring-indigo-500/30 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {displayName || `@${username}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pause Link Status indicator */}
            <button
              type="button"
              onClick={onOpenPauseModal}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer",
                isLinkPaused
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              )}
              title="Pause or resume receiving anonymous messages"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isLinkPaused ? "Paused" : "Active"}</span>
            </button>
          </div>
        </div>

        {/* Version Switcher Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
            <span>Swipe Carousel or Tap</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              {currentIndex + 1} / {WHISPER_MODES.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-0.5">
            {WHISPER_MODES.map((mode, idx) => {
              const isActive = activeMode.id === mode.id;
              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => {
                    setSwipeDirection(idx > currentIndex ? 1 : -1);
                    onSelectModeId(mode.id);
                    setIsEditingPrompt(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer select-none",
                    isActive
                      ? "bg-indigo-600 text-white border-transparent shadow-sm scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <span className="text-base shrink-0 select-none">{mode.icon}</span>
                  <span>{mode.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Carousel Card Container with Smooth Carousel Swipe */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="relative overflow-hidden touch-pan-y rounded-2xl">
          <AnimatePresence mode="wait" custom={swipeDirection}>
            <motion.div
              key={activeMode.id}
              custom={swipeDirection}
              variants={carouselVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => {
                const swipe = offset.x;
                if (swipe < -35 || velocity.x < -250) {
                  goToNext();
                } else if (swipe > 35 || velocity.x > 250) {
                  goToPrev();
                }
              }}
              className={cn(
                "relative rounded-2xl p-4 sm:p-5 border shadow-sm flex flex-col justify-between overflow-hidden text-white bg-gradient-to-br select-none cursor-grab active:cursor-grabbing",
                activeMode.gradient,
                activeMode.cardBorder
              )}
            >
              {/* Ambient Corner Flare */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              {/* Mode Banner: Icon + Badge + Mode Name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  <span className="select-none">{activeMode.icon}</span>
                </div>
                <div>
                  <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-extrabold uppercase tracking-wider mb-0.5">
                    {activeMode.badge}
                  </div>
                  <h4 className="text-base font-black tracking-wide text-white uppercase drop-shadow-xs">
                    {activeMode.name}
                  </h4>
                </div>
              </div>

              {/* Prompt Interactive Box with High-Visibility Action Icons */}
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 border border-white/20 space-y-2 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                    Live Prompt
                  </span>

                  {/* Prompt Action Icons (Shuffle, Edit, Reset) */}
                  <div className="flex items-center gap-1.5">
                    {/* Random Shuffle Button (Only Icon) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShuffle();
                      }}
                      className="w-8 h-8 rounded-xl bg-white/25 hover:bg-white/35 active:scale-95 text-white transition-all flex items-center justify-center border border-white/30 cursor-pointer shadow-2xs shrink-0"
                      title="Random prompt (30 templates)"
                      aria-label="Random prompt"
                    >
                      <Shuffle className="w-4 h-4 text-white shrink-0" strokeWidth={2.2} />
                    </button>

                    {/* Edit Prompt Button (Only Icon) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditingPrompt) {
                          setIsEditingPrompt(false);
                        } else {
                          handleStartEdit();
                        }
                      }}
                      className={cn(
                        "w-8 h-8 rounded-xl transition-all flex items-center justify-center border cursor-pointer active:scale-95 shadow-2xs shrink-0",
                        isEditingPrompt
                          ? "bg-white text-slate-900 border-white"
                          : "bg-white/25 hover:bg-white/35 text-white border-white/30"
                      )}
                      title={isEditingPrompt ? "Cancel editing" : "Edit custom prompt"}
                      aria-label={isEditingPrompt ? "Cancel editing" : "Edit custom prompt"}
                    >
                      <Pencil className={cn("w-4 h-4 shrink-0", isEditingPrompt ? "text-slate-900" : "text-white")} strokeWidth={2.2} />
                    </button>

                    {/* Reset to Default (Only Icon) */}
                    {isCustomized && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="w-8 h-8 rounded-xl border border-white/30 bg-white/15 text-white hover:bg-white/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                        title="Reset to default prompt"
                        aria-label="Reset to default prompt"
                      >
                        <RotateCcw className="w-4 h-4 text-white shrink-0" strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Editor or Display Text */}
                {isEditingPrompt ? (
                  <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editedPromptText}
                      onChange={(e) => setEditedPromptText(e.target.value)}
                      placeholder="Enter custom prompt..."
                      className="flex-1 bg-black/50 border border-white/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-white font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") setIsEditingPrompt(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-2.5 py-1.5 bg-white text-slate-900 font-bold rounded-xl text-xs hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Save</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed italic drop-shadow-xs">
                    "{activePrompt}"
                  </p>
                )}
              </div>

              {/* Main Link Pill with External Link Icon */}
              <div className="bg-black/35 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 flex items-center justify-between gap-2">
                <div className="font-mono text-xs text-white/90 truncate select-all flex-1 px-1">
                  {activeShareUrl}
                </div>
                {/* Open live link (Icon-Only) */}
                <a
                  href={activeShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center border border-white/25 cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="Open live link"
                  aria-label="Open live link"
                >
                  <ExternalLink className="w-4 h-4 text-white shrink-0" strokeWidth={2.2} />
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators / Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {WHISPER_MODES.map((mode, idx) => {
            const isActive = activeMode.id === mode.id;
            return (
              <button
                type="button"
                key={mode.id}
                onClick={() => {
                  setSwipeDirection(idx > currentIndex ? 1 : -1);
                  onSelectModeId(mode.id);
                  setIsEditingPrompt(false);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  isActive 
                    ? "w-6 bg-indigo-600 dark:bg-indigo-400" 
                    : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                )}
                title={`Switch to ${mode.name}`}
                aria-label={`Switch to ${mode.name}`}
              />
            );
          })}
        </div>

        {/* 3. Action Center: Story Card + Copy Button + Social Quick Share */}
        <div className="space-y-2.5">
          {/* Action Row: Generate Instagram Story Card + Copy Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGenerateStoryCard(activeMode, activeShareUrl, activePrompt)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse shrink-0" />
              <span>Generate Instagram Story Card</span>
            </button>

            {/* Icon-Only Copy Button located in the Story Card / Share section */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                "h-[48px] w-[48px] rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border shadow-sm shrink-0",
                copied
                  ? "bg-emerald-500 text-white border-emerald-400"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              )}
              title={copied ? "Link copied to clipboard!" : "Copy link"}
              aria-label={copied ? "Copied" : "Copy link"}
            >
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in-75 duration-150 shrink-0" strokeWidth={2.5} />
              ) : (
                <Copy className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0" strokeWidth={2.2} />
              )}
            </button>
          </div>

          {/* Social 1-Tap Quick Buttons with Rich Icons */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Send me a whisper! ${activeMode.icon} "${activePrompt}" 👉 ${activeShareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold text-center"
            >
              <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${activeMode.icon} ${activePrompt}`)}&url=${encodeURIComponent(activeShareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold text-center"
            >
              <Twitter className="w-5 h-5 text-sky-500 shrink-0" />
              <span>Twitter / X</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold text-center cursor-pointer"
            >
              <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>More Apps</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
