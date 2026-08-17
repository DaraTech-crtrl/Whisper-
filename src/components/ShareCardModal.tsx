import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Download, Copy, CheckCircle2, X, Sparkles } from "lucide-react";
import { generateProfileShareCard, ProfileCardTheme } from "../lib/canvasImage";
import { WhisperMode } from "../lib/whisperModes";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName?: string;
  photoURL?: string | null;
  avatarUrl?: string | null;
  publicUrl: string;
  modeTitle?: string;
  modePrompt?: string;
  modeIcon?: string;
  mode?: WhisperMode;
}

const THEME_OPTIONS: { id: ProfileCardTheme; name: string; bg: string; border: string; text: string }[] = [
  { id: "obsidian", name: "Obsidian", bg: "bg-slate-900", border: "border-purple-500", text: "text-purple-400" },
  { id: "neon", name: "Cyberpunk", bg: "bg-purple-950", border: "border-pink-500", text: "text-pink-400" },
  { id: "velvet", name: "Velvet Rose", bg: "bg-rose-950", border: "border-rose-500", text: "text-rose-400" },
  { id: "sunset", name: "Sunset", bg: "bg-orange-950", border: "border-orange-500", text: "text-orange-400" },
  { id: "cyberpunk", name: "Emerald", bg: "bg-emerald-950", border: "border-emerald-500", text: "text-emerald-400" }
];

export default function ShareCardModal({
  isOpen,
  onClose,
  username,
  displayName,
  photoURL,
  avatarUrl,
  publicUrl,
  modeTitle,
  modePrompt,
  modeIcon,
  mode
}: ShareCardModalProps) {
  // Automatically detect the mode's headline and details
  const activeModeTitle = modeTitle || mode?.name || "Anonymous Whisper";
  const activeModeIcon = modeIcon || mode?.icon || "🤫";
  
  const cardHeadline = React.useMemo(() => {
    if (modePrompt) {
      return `${modePrompt} ${activeModeIcon}`.trim();
    }
    if (mode?.prompt) {
      return `${mode.prompt} ${mode.icon}`.trim();
    }
    return `send me anonymous messages! ${activeModeIcon}`;
  }, [modePrompt, mode, activeModeIcon]);

  const [selectedTheme, setSelectedTheme] = useState<ProfileCardTheme>("obsidian");
  const [renderedCard, setRenderedCard] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reset/re-render when modal opens or key parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);
    setRenderedCard(null);

    const renderCard = async () => {
      try {
        const result = await generateProfileShareCard({
          username,
          displayName,
          photoURL,
          avatarUrl,
          publicUrl,
          theme: selectedTheme,
          headline: cardHeadline
        });

        if (isMounted) {
          setRenderedCard(result);
        }
      } catch (err) {
        console.error("Failed to render share card:", err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    const timer = setTimeout(renderCard, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, username, displayName, photoURL, avatarUrl, publicUrl, selectedTheme, cardHeadline]);

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
    if (!renderedCard?.dataUrl) return;
    const sanitizedTitle = activeModeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const link = document.createElement("a");
    link.download = `whisper-${sanitizedTitle}-${username}.png`;
    link.href = renderedCard.dataUrl;
    link.click();
    showToast("Share card image downloaded!");
  };

  const handleShareCard = async () => {
    if (!renderedCard?.blob || !renderedCard?.dataUrl) return;

    const sanitizedTitle = activeModeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      const file = new File(
        [renderedCard.blob], 
        `whisper-${sanitizedTitle}-${username}.png`, 
        { type: "image/png" }
      );

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: cardHeadline,
          text: cardHeadline,
          url: publicUrl
        });
        showToast("Shared card successfully!");
      } else if (navigator.share) {
        await navigator.share({
          title: cardHeadline,
          text: cardHeadline,
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[94vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-lg shadow-inner shrink-0">
                <span>{activeModeIcon}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                  Share {activeModeTitle} Card
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Ready to post to your Instagram story, Snapchat, or status
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close share card dialog"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

          {/* Theme / Style Selector Pills */}
          <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-xs font-bold text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Theme:
            </span>
            {THEME_OPTIONS.map(th => (
              <button
                key={th.id}
                onClick={() => setSelectedTheme(th.id)}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  selectedTheme === th.id
                    ? `${th.bg} text-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30`
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${th.bg} ${th.border} border`} />
                {th.name}
              </button>
            ))}
          </div>

          {/* Single Dedicated Share Card Image Preview */}
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2 my-1 shrink-0 max-h-[320px]">
            {renderedCard ? (
              <img
                src={renderedCard.dataUrl}
                alt={`Whisper ${activeModeTitle} Card`}
                className="w-full h-full object-contain rounded-xl shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Generating your {activeModeTitle} card...</span>
              </div>
            )}
          </div>

          {/* Card Prompt Text info */}
          <div className="py-1 px-1 flex items-center justify-center gap-1 text-center shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[320px]">
              Prompt: <span className="text-slate-800 dark:text-slate-200 font-bold">"{cardHeadline}"</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2 shrink-0">
            {/* Primary Action: Share Card & Link */}
            <button
              onClick={handleShareCard}
              disabled={isGenerating || !renderedCard?.blob}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Card & Link</span>
            </button>

            {/* Secondary Actions Row: Save Image & Copy Link */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !renderedCard?.dataUrl}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Image</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
