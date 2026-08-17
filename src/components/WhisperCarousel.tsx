import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Copy, 
  CheckCircle2, 
  QrCode, 
  Share2, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { 
  WHISPER_MODES, 
  WhisperMode, 
  getModeUrl, 
  getModeDisplayPath 
} from "../lib/whisperModes";

interface WhisperCarouselProps {
  username: string;
  activeModeId?: string;
  onSelectMode?: (mode: WhisperMode) => void;
  onOpenQR: (mode: WhisperMode, url: string) => void;
  onOpenShare: (mode: WhisperMode, url: string) => void;
}

export default function WhisperCarousel({
  username,
  activeModeId = "anonymous",
  onSelectMode,
  onOpenQR,
  onOpenShare
}: WhisperCarouselProps) {
  // Find initial index
  const initialIdx = Math.max(0, WHISPER_MODES.findIndex(m => m.id === activeModeId));
  const [currentIndex, setCurrentIndex] = useState(initialIdx);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMode = WHISPER_MODES[currentIndex] || WHISPER_MODES[0];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowLeft") {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : WHISPER_MODES.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex(prev => (prev < WHISPER_MODES.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyLink = async (mode: WhisperMode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getModeUrl(mode, username);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(mode.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleOpenLive = (mode: WhisperMode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getModeUrl(mode, username);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const nextCard = () => {
    setCurrentIndex(prev => (prev < WHISPER_MODES.length - 1 ? prev + 1 : 0));
  };

  const prevCard = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : WHISPER_MODES.length - 1));
  };

  return (
    <div 
      ref={containerRef}
      className="relative rounded-3xl overflow-hidden bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 shadow-xl p-4 sm:p-5 text-white select-none transition-all"
      role="region"
      aria-roledescription="carousel"
      aria-label="Whisper Version Link Selector"
    >
      {/* Ambient Background Glow */}
      <div 
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 sm:w-80 h-60 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-25"
        style={{ backgroundColor: activeMode.glowColor }}
      />

      {/* Header Section */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-3.5">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <span>Choose Your Whisper</span>
        </h2>

        {/* Carousel Navigation Chevrons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={prevCard}
            aria-label="Previous Whisper mode"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextCard}
            aria-label="Next Whisper mode"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Swipeable Card Viewport */}
      <div className="relative z-10 overflow-hidden touch-pan-y">
        <motion.div
          className="cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(e, { offset, velocity }) => {
            const swipeThreshold = 40;
            if (offset.x < -swipeThreshold || velocity.x < -300) {
              nextCard();
            } else if (offset.x > swipeThreshold || velocity.x > 300) {
              prevCard();
            }
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeMode.id}
              initial={{ opacity: 0, scale: 0.96, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${activeMode.gradient} border ${activeMode.cardBorder} shadow-lg overflow-hidden flex flex-col justify-between`}
            >
              {/* Subtle radial shine highlight */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />

              {/* Card Top: Icon & Badge */}
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl shadow-inner shrink-0">
                  <span>{activeMode.icon}</span>
                </div>
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider mb-0.5">
                    {activeMode.badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black tracking-wide uppercase text-white drop-shadow-sm truncate">
                    {activeMode.name}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-white/90 font-medium leading-snug mb-3">
                {activeMode.description}
              </p>

              {/* Dedicated URL Pill */}
              <div className="mb-3">
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 border border-white/10">
                  <div className="font-mono text-xs text-white/90 truncate flex-1 select-all">
                    {getModeDisplayPath(activeMode, username)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleOpenLive(activeMode, e)}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
                    title="Open live mode page in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                {/* Copy Link */}
                <button
                  type="button"
                  onClick={(e) => handleCopyLink(activeMode, e)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                >
                  {copiedId === activeMode.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                {/* QR Code */}
                <button
                  type="button"
                  onClick={() => onOpenQR(activeMode, getModeUrl(activeMode, username))}
                  className="w-10 py-2.5 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 active:scale-98 text-white transition-all shadow-sm cursor-pointer"
                  title="View Mode QR Code"
                  aria-label="View Mode QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>

                {/* Share Story Card */}
                <button
                  type="button"
                  onClick={() => onOpenShare(activeMode, getModeUrl(activeMode, username))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 active:scale-98 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-900" />
                  <span>Share</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Pagination Indicator Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {WHISPER_MODES.map((m, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={m.id}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to ${m.name} mode`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                isActive
                  ? "w-5 h-1.5 bg-indigo-400"
                  : "w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
