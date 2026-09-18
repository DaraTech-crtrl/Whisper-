import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  MoreVertical,
  Palette,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { cn } from "../../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Message } from "../../pages/Dashboard";
import { getMessageMode, WhisperMode } from "../../lib/whisperModes";
import { ProfileCardTheme } from "../../lib/canvasImage";
import FormattedMessageText from "../FormattedMessageText";
import { triggerHaptic } from "../../lib/haptics";
import { getReadTimeEstimate } from "../../lib/readTime";

const THEME_OPTIONS: { id: ProfileCardTheme; name: string; color: string; border: string; glow: string }[] = [
  { id: "obsidian", name: "Obsidian", color: "bg-slate-900", border: "border-purple-500", glow: "from-purple-600/30 via-indigo-600/20 to-transparent" },
  { id: "neon", name: "Neon", color: "bg-pink-950", border: "border-pink-500", glow: "from-pink-600/30 via-rose-600/20 to-transparent" },
  { id: "velvet", name: "Velvet", color: "bg-rose-950", border: "border-rose-500", glow: "from-rose-600/30 via-purple-600/20 to-transparent" },
  { id: "sunset", name: "Sunset", color: "bg-amber-950", border: "border-orange-500", glow: "from-amber-600/30 via-orange-600/20 to-transparent" },
  { id: "cyberpunk", name: "Cyberpunk", color: "bg-cyan-950", border: "border-cyan-500", glow: "from-cyan-600/30 via-teal-600/20 to-transparent" }
];

interface MessageReaderModalProps {
  message: Message | null;
  decryptedText: string;
  allMessages: Message[];
  onClose: () => void;
  onSelectMessage: (msg: Message) => void;
  onShareToStory: (theme?: ProfileCardTheme) => void;
  onDownloadPNG: (theme?: ProfileCardTheme) => void;
  isExporting: boolean;
  onOpenHint: (msg: Message) => void;
  restrictSenderHints?: boolean;
  onReaction?: (msgId: string, reaction: string, e: React.MouseEvent) => void;
  onToggleArchive: (msgId: string, isArchived: boolean, e?: React.MouseEvent) => void;
  onDeleteMessage: (msgId: string, e?: React.MouseEvent) => void;
  onReportMessage: (msgId: string, e?: React.MouseEvent) => void;
}

export default function MessageReaderModal({
  message,
  decryptedText,
  allMessages,
  onClose,
  onSelectMessage,
  onShareToStory,
  onDownloadPNG,
  isExporting,
  onOpenHint,
  restrictSenderHints = false,
  onToggleArchive,
  onDeleteMessage,
  onReportMessage
}: MessageReaderModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ProfileCardTheme>("obsidian");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Current message index in the visible list for sequential story navigation
  const currentIndex = message ? allMessages.findIndex(m => m.id === message.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allMessages.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      triggerHaptic("light");
      onSelectMessage(allMessages[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      triggerHaptic("light");
      onSelectMessage(allMessages[currentIndex + 1]);
    }
  };

  // Touch Swipe gesture handler on the card (no overlapping buttons needed!)
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 400;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      if (hasNext) {
        handleNext();
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      if (hasPrev) {
        handlePrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!message) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [message, currentIndex, allMessages]);

  if (!message) return null;

  const mode: WhisperMode = getMessageMode(message);
  const isArchived = Boolean(message.archived);
  const isLocked = message.unlocksAt && (message.unlocksAt.seconds * 1000 > Date.now());
  const timeString = message.createdAt?.seconds 
    ? formatDistanceToNow(new Date(message.createdAt.seconds * 1000), { addSuffix: true })
    : "Just now";

  const readTime = getReadTimeEstimate(
    decryptedText,
    message.encryptedContent ? Math.max(40, Math.round(message.encryptedContent.length * 0.35)) : undefined
  );

  const currentThemeConfig = THEME_OPTIONS.find(t => t.id === selectedTheme) || THEME_OPTIONS[0];

  const handleCopyText = async () => {
    if (!decryptedText) return;
    try {
      await navigator.clipboard.writeText(decryptedText);
      setCopied(true);
      showToast("Copied");
      triggerHaptic("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Copy failed");
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between overflow-hidden selection:bg-pink-500 selection:text-white backdrop-blur-2xl select-none"
      >
        {/* Dynamic Atmospheric Aurora Mood Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-35 transition-all duration-700">
          <div className={cn("absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-3xl bg-gradient-to-br", currentThemeConfig.glow)} />
          <div className={cn("absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl bg-gradient-to-tl", currentThemeConfig.glow)} />
        </div>

        {/* Top Story Navigation & Control Header */}
        <header className="relative z-30 w-full max-w-2xl mx-auto px-4 pt-[max(0.75rem,calc(0.75rem+env(safe-area-inset-top,0px)))] flex flex-col gap-2 shrink-0">
          {/* Instagram Story-style Multi-Item Progress Segment Bars */}
          {allMessages.length > 1 && (
            <div className="w-full flex items-center gap-1.5 px-0.5">
              {allMessages.map((m, idx) => (
                <div 
                  key={m.id || idx}
                  onClick={() => {
                    triggerHaptic("light");
                    onSelectMessage(m);
                  }}
                  className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden cursor-pointer hover:h-1.5 transition-all"
                  title={`Whisper ${idx + 1}`}
                >
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      idx < currentIndex 
                        ? "bg-white w-full" 
                        : idx === currentIndex 
                          ? "bg-white w-full shadow-xs shadow-white" 
                          : "w-0"
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="p-2 -ml-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Center: Mode Badge Pill + Non-Intrusive < > Stepper */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-white/10 border border-white/15 text-white shadow-lg backdrop-blur-md">
                <span>{mode.icon}</span>
                <span className="tracking-wide uppercase text-[11px]">{mode.name}</span>
              </span>

              {allMessages.length > 1 && (
                <div className="flex items-center gap-0.5 bg-white/10 border border-white/15 rounded-full px-1.5 py-0.5 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={handlePrev}
                    className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[11px] font-mono text-white/80 px-1 font-bold">
                    {currentIndex + 1}/{allMessages.length}
                  </span>

                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={handleNext}
                    className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Options Dropdown + Close */}
            <div className="flex items-center gap-1.5 relative">
              {/* Options Button */}
              <button
                type="button"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="p-2 -mr-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Discrete Options Dropdown Menu */}
              <AnimatePresence>
                {showOptionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-48 rounded-2xl bg-slate-900/95 border border-white/15 p-1.5 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-semibold"
                  >
                    {/* Copy Text */}
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-left text-white/90 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>Copy text</span>
                    </button>

                    {/* Report */}
                    <button
                      type="button"
                      onClick={(e) => {
                        onReportMessage(message.id, e);
                        showToast("Reported");
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-amber-500/20 flex items-center gap-2.5 text-left text-amber-400 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Report</span>
                    </button>

                    {/* Archive / Restore */}
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerHaptic("light");
                        onToggleArchive(message.id, isArchived, e);
                        showToast(isArchived ? "Restored" : "Archived");
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-left text-slate-300 transition-colors cursor-pointer"
                    >
                      {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      <span>{isArchived ? "Restore" : "Archive"}</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerHaptic("warning");
                        onDeleteMessage(message.id, e);
                        setShowOptionsMenu(false);
                        onClose();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/20 flex items-center gap-2.5 text-left text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 py-1.5 px-4 bg-indigo-600/95 text-white font-bold text-xs rounded-full shadow-2xl border border-indigo-400/30 animate-in fade-in zoom-in-95 backdrop-blur-xl">
            {toastMessage}
          </div>
        )}

        {/* Center Stage: Badass Instagram Story Card Stage */}
        <main className="relative z-10 flex-1 w-full max-w-lg mx-auto px-4 py-2 sm:py-4 flex items-center justify-center overflow-hidden">
          
          {/* ======================================================== */}
          {/* BADASS INSTAGRAM STORY CARD (Central Visual Masterpiece) */}
          {/* ======================================================== */}
          <motion.div
            key={message.id}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -15 }}
            drag={allMessages.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "w-full max-h-[72vh] rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/98 backdrop-blur-3xl border border-white/20 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group touch-pan-y",
              "ring-1 ring-white/15"
            )}
          >
            {/* Top Glowing Neon Border Rim */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", mode.gradient)} />
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl bg-indigo-500/20 pointer-events-none" />

            {/* Card Header: Mode Identity + Verification Badge + Timestamp */}
            <div className="w-full flex items-center justify-between gap-3 pb-4 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-white text-lg shadow-lg font-bold", mode.gradient)}>
                  <span>{mode.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wider uppercase text-white">
                      {mode.badge || "Whisper"}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>{timeString}</span>
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                    <span className="flex items-center gap-1 text-indigo-300">
                      <BookOpen className="w-3 h-3" />
                      <span>{readTime.label}</span>
                    </span>
                  </span>
                </div>
              </div>

              {/* Mode Theme Indicator */}
              <div className="text-right">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block">
                  Encrypted
                </span>
                <span className="text-[10px] font-mono text-pink-400/80">
                  {currentThemeConfig.name}
                </span>
              </div>
            </div>

            {/* Card Message Body: Big, Bold, Punchy Typography */}
            <div className="w-full my-auto py-4 overflow-y-auto max-h-[44vh] scrollbar-hide">
              {isLocked ? (
                <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-dashed border-white/20 text-center">
                  <Lock className="w-8 h-8 text-amber-400 mb-2 animate-bounce" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                    Time Capsule Locked
                  </span>
                  <span className="text-xs text-slate-400 font-mono mt-1">
                    Unlocks on {new Date(message.unlocksAt.seconds * 1000).toLocaleString()}
                  </span>
                </div>
              ) : (
                <FormattedMessageText
                  text={decryptedText || "..."}
                  mood={message.mood}
                  variant="cinematic"
                  textClassName="text-xl sm:text-2xl font-black tracking-tight text-white leading-relaxed break-words whitespace-pre-wrap drop-shadow-md font-sans"
                  previewClassName="mt-4 max-w-full"
                />
              )}
            </div>

            {/* Card Footer: Verified Decryption Stamp */}
            <div className="w-full pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 tracking-wide uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px]" title={`${readTime.charCount} characters, ~${readTime.wordCount} words`}>
                <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                <span>{readTime.label}</span>
                {readTime.charCount > 0 && <span className="opacity-60 font-mono">({readTime.charCount}c)</span>}
              </div>

              <div className="flex items-center gap-1 text-white/50 text-[10px]">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>whisper</span>
              </div>
            </div>

          </motion.div>
        </main>

        {/* Bottom Control Bar: Theme Selector Strip + Big Badass Share & Utility Buttons */}
        <footer className="relative z-30 w-full max-w-lg mx-auto px-4 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))] pt-2 flex flex-col gap-2.5 shrink-0">
          
          {/* Row 1: Sleek Theme Palette Picker Strip */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Theme</span>
            </div>

            {/* Theme Dots */}
            <div className="flex items-center gap-2">
              {THEME_OPTIONS.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedTheme(th.id);
                  }}
                  title={th.name}
                  className={cn(
                    "w-6 h-6 rounded-full border transition-all cursor-pointer",
                    th.color,
                    selectedTheme === th.id 
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-115 border-white shadow-lg" 
                      : "border-white/20 opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Row 2: Share & Utility Actions */}
          <div className="flex items-center gap-2">
            {/* Primary Share Story Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onShareToStory(selectedTheme);
              }}
              disabled={isExporting}
              className={cn(
                "flex-1 py-3.5 px-5 bg-gradient-to-r hover:brightness-110 text-white font-black text-sm rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer border border-white/20",
                mode.gradient
              )}
            >
              {isExporting ? (
                <span className="animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Sharing...</span>
                </span>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Story</span>
                </>
              )}
            </button>

            {/* Download PNG Image */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onDownloadPNG(selectedTheme);
              }}
              disabled={isExporting}
              title="Download"
              className="p-3.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Sender Intelligence & Fingerprint Hint */}
            {!restrictSenderHints && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onOpenHint(message);
                }}
                title="Hints"
                className="p-3.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-2xl transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Copy Whisper Text */}
            <button
              type="button"
              onClick={handleCopyText}
              title="Copy text"
              className="p-3.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-2xl transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
