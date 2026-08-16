import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Download, Copy, CheckCircle2, X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { generateProfileShareCard, ProfileCardTheme } from "../lib/canvasImage";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName?: string;
  publicUrl: string;
}

const THEME_OPTIONS: { id: ProfileCardTheme; name: string; bg: string; border: string; text: string }[] = [
  { id: "obsidian", name: "Obsidian", bg: "bg-slate-900", border: "border-purple-500", text: "text-purple-400" },
  { id: "neon", name: "Cyberpunk", bg: "bg-purple-950", border: "border-pink-500", text: "text-pink-400" },
  { id: "velvet", name: "Velvet Rose", bg: "bg-rose-950", border: "border-rose-500", text: "text-rose-400" },
  { id: "sunset", name: "Sunset", bg: "bg-orange-950", border: "border-orange-500", text: "text-orange-400" },
  { id: "cyberpunk", name: "Emerald", bg: "bg-emerald-950", border: "border-emerald-500", text: "text-emerald-400" }
];

interface PrefilledCardConfig {
  id: string;
  headline: string;
  defaultTheme: ProfileCardTheme;
}

const PREFILLED_CARDS: PrefilledCardConfig[] = [
  { id: "1", headline: "send me anonymous messages! 🤫", defaultTheme: "obsidian" },
  { id: "2", headline: "ask me anything in secret! 🤐", defaultTheme: "neon" },
  { id: "3", headline: "drop a confession or hint! 💌", defaultTheme: "velvet" },
  { id: "4", headline: "what's a secret you never told me? 🔮", defaultTheme: "sunset" },
  { id: "5", headline: "tell me something you can't say out loud 💭", defaultTheme: "cyberpunk" },
  { id: "6", headline: "send me your honest opinion about me! 💬", defaultTheme: "obsidian" }
];

export default function ShareCardModal({
  isOpen,
  onClose,
  username,
  displayName,
  publicUrl
}: ShareCardModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardThemes, setCardThemes] = useState<ProfileCardTheme[]>(
    PREFILLED_CARDS.map(c => c.defaultTheme)
  );
  // Cache rendered images: { [cardIndex]: { dataUrl, blob } }
  const [renderedCache, setRenderedCache] = useState<Record<number, { dataUrl: string; blob: Blob }>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Swipe gesture touch tracking refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setSlideDirection(1);
      setRenderedCache({});
    }
  }, [isOpen]);

  // Generate image for current active index if not cached
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const currentTheme = cardThemes[activeIndex];
    const currentCard = PREFILLED_CARDS[activeIndex];

    if (renderedCache[activeIndex]) {
      // Already rendered this index
      return;
    }

    setIsGenerating(true);

    const renderCurrentCard = async () => {
      try {
        const { blob, dataUrl } = await generateProfileShareCard({
          username,
          displayName,
          publicUrl,
          theme: currentTheme,
          headline: currentCard.headline
        });

        if (isMounted) {
          setRenderedCache(prev => ({
            ...prev,
            [activeIndex]: { dataUrl, blob }
          }));
        }
      } catch (err) {
        console.error("Failed to render share card:", err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    const t = setTimeout(renderCurrentCard, 40);

    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [isOpen, activeIndex, cardThemes, renderedCache, username, displayName, publicUrl]);

  // Pre-render adjacent cards in background for seamless swiping
  useEffect(() => {
    if (!isOpen) return;

    const indicesToPreload = [
      (activeIndex + 1) % PREFILLED_CARDS.length,
      (activeIndex - 1 + PREFILLED_CARDS.length) % PREFILLED_CARDS.length
    ];

    indicesToPreload.forEach(idx => {
      if (!renderedCache[idx]) {
        const cardConfig = PREFILLED_CARDS[idx];
        const cardTheme = cardThemes[idx];

        generateProfileShareCard({
          username,
          displayName,
          publicUrl,
          theme: cardTheme,
          headline: cardConfig.headline
        }).then(({ blob, dataUrl }) => {
          setRenderedCache(prev => {
            if (prev[idx]) return prev;
            return { ...prev, [idx]: { dataUrl, blob } };
          });
        }).catch(() => {});
      }
    });
  }, [isOpen, activeIndex, cardThemes, renderedCache, username, displayName, publicUrl]);

  const handlePrev = () => {
    setSlideDirection(-1);
    setActiveIndex(prev => (prev - 1 + PREFILLED_CARDS.length) % PREFILLED_CARDS.length);
  };

  const handleNext = () => {
    setSlideDirection(1);
    setActiveIndex(prev => (prev + 1) % PREFILLED_CARDS.length);
  };

  // Change theme for current active card
  const handleThemeChange = (newTheme: ProfileCardTheme) => {
    setCardThemes(prev => {
      const next = [...prev];
      next[activeIndex] = newTheme;
      return next;
    });
    // Evict cache for active index so it re-renders with new theme
    setRenderedCache(prev => {
      const next = { ...prev };
      delete next[activeIndex];
      return next;
    });
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentCache = renderedCache[activeIndex];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      showToast("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      showToast("Could not copy link automatically");
    }
  };

  const handleDownload = () => {
    if (!currentCache?.dataUrl) return;
    const link = document.createElement("a");
    link.download = `whisper-card-${username}-${activeIndex + 1}.png`;
    link.href = currentCache.dataUrl;
    link.click();
    showToast("Active card downloaded!");
  };

  const handleShareCard = async () => {
    if (!currentCache?.blob || !currentCache?.dataUrl) return;

    try {
      const file = new File([currentCache.blob], `whisper-card-${username}-${activeIndex + 1}.png`, { type: "image/png" });
      const shareText = `Send me an anonymous message! 🤫\n\n${publicUrl}`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Send me anonymous messages!",
          text: shareText,
          url: publicUrl
        });
        showToast("Shared active card successfully!");
      } else if (navigator.share) {
        await navigator.share({
          title: "Send me anonymous messages!",
          text: shareText,
          url: publicUrl
        });
      } else {
        handleDownload();
        await handleCopyLink();
        showToast("Card saved & link copied to clipboard!");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("Native share fallback triggered:", err);
        handleDownload();
        handleCopyLink();
      }
    }
  };

  if (!isOpen) return null;

  const currentCardConfig = PREFILLED_CARDS[activeIndex];
  const activeTheme = cardThemes[activeIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[94vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Share Card Deck</h3>
                <p className="text-xs text-slate-500">Swipe to pick your favorite card to share</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Banner */}
          {toastMessage && (
            <div className="mt-2 py-1.5 px-3 bg-indigo-600 text-white font-bold text-xs rounded-xl text-center shadow-lg animate-in fade-in shrink-0">
              {toastMessage}
            </div>
          )}

          {/* Theme / Style Override Pills */}
          <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Style:</span>
            {THEME_OPTIONS.map(th => (
              <button
                key={th.id}
                onClick={() => handleThemeChange(th.id)}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 border ${
                  activeTheme === th.id
                    ? `${th.bg} text-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30`
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${th.bg} ${th.border} border`} />
                {th.name}
              </button>
            ))}
          </div>

          {/* Interactive Swipeable Card Preview Carousel */}
          <div
            className="relative w-full aspect-square bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2 my-1 shrink-0 max-h-[310px] select-none touch-pan-y cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Left Chevron Button */}
            <button
              onClick={handlePrev}
              className="absolute left-2.5 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              aria-label="Previous Card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Right Chevron Button */}
            <button
              onClick={handleNext}
              className="absolute right-2.5 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              aria-label="Next Card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Active Card Image with Slide Motion */}
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={activeIndex}
                custom={slideDirection}
                initial={{ opacity: 0, x: slideDirection > 0 ? 80 : -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection > 0 ? -80 : 80 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentCache ? (
                  <img
                    src={currentCache.dataUrl}
                    alt={`Whisper Card ${activeIndex + 1}`}
                    className="w-full h-full object-contain rounded-xl shadow-2xl pointer-events-none"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Preparing card {activeIndex + 1}...</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            <div className="absolute bottom-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-800">
              {PREFILLED_CARDS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSlideDirection(idx > activeIndex ? 1 : -1);
                    setActiveIndex(idx);
                  }}
                  className={`transition-all rounded-full ${
                    idx === activeIndex
                      ? "w-4 h-1.5 bg-indigo-400"
                      : "w-1.5 h-1.5 bg-slate-600 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Active Card Prompt Badge */}
          <div className="py-1 px-1 flex items-center justify-center gap-1 text-center shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px]">
              Active Card {activeIndex + 1} of {PREFILLED_CARDS.length}: <span className="text-slate-800 dark:text-slate-200 font-bold">"{currentCardConfig.headline}"</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2 shrink-0">
            {/* Primary Action: Share Active Card */}
            <button
              onClick={handleShareCard}
              disabled={isGenerating || !currentCache?.blob}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Active Card & Link</span>
            </button>

            {/* Secondary Actions Row: Save Active Card & Copy Link */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !currentCache?.dataUrl}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Active Image</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
