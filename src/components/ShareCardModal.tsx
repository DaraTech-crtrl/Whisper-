import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Share2, 
  Download, 
  Copy, 
  CheckCircle2, 
  X, 
  Shuffle, 
  Pencil, 
  Check, 
  RotateCcw,
  Smartphone,
  Square,
  ArrowLeft
} from "lucide-react";
import { generateProfileShareCard, generateShareImageBlob, ProfileCardTheme } from "../lib/canvasImage";
import { WhisperMode } from "../lib/whisperModes";
import { getNextPromptForMode, buildModeShareUrl } from "../lib/modeTemplates";

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
  onPromptChange?: (modeId: string, newPrompt: string, newUrl: string) => void;
}

const THEME_OPTIONS: { id: ProfileCardTheme; name: string; color: string; border: string }[] = [
  { id: "obsidian", name: "Obsidian", color: "bg-slate-900", border: "border-purple-500" },
  { id: "neon", name: "Neon", color: "bg-purple-900", border: "border-pink-500" },
  { id: "velvet", name: "Velvet", color: "bg-rose-900", border: "border-rose-500" },
  { id: "sunset", name: "Sunset", color: "bg-amber-900", border: "border-orange-500" },
  { id: "cyberpunk", name: "Emerald", color: "bg-emerald-900", border: "border-emerald-500" }
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
  mode,
  onPromptChange
}: ShareCardModalProps) {
  const activeModeTitle = modeTitle || mode?.name || "Anonymous Whisper";
  const activeModeIcon = modeIcon || mode?.icon || "🤫";
  const modeId = mode?.id || "anonymous";

  const [cardFormat, setCardFormat] = useState<"story" | "square">("square");
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    modePrompt || mode?.prompt || "send me anonymous messages!"
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState(currentPrompt);

  useEffect(() => {
    if (isOpen) {
      const initialPrompt = modePrompt || mode?.prompt || "send me anonymous messages!";
      setCurrentPrompt(initialPrompt);
      setEditedPromptText(initialPrompt);
      setIsEditingPrompt(false);
    }
  }, [isOpen, modePrompt, mode]);

  const activeShareUrl = React.useMemo(() => {
    if (mode) {
      return buildModeShareUrl(mode, username, currentPrompt);
    }
    return publicUrl;
  }, [mode, username, currentPrompt, publicUrl]);

  const cardHeadline = React.useMemo(() => {
    if (currentPrompt.trim()) {
      return `${currentPrompt.trim()} ${activeModeIcon}`.trim();
    }
    return `send me anonymous messages! ${activeModeIcon}`;
  }, [currentPrompt, activeModeIcon]);

  const [selectedTheme, setSelectedTheme] = useState<ProfileCardTheme>("obsidian");
  const [renderedCard, setRenderedCard] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);
    setRenderedCard(null);

    const renderCard = async () => {
      try {
        let result;
        if (cardFormat === "story") {
          result = await generateShareImageBlob({
            text: cardHeadline,
            username,
            publicUrl: activeShareUrl,
            theme: selectedTheme,
            mode: mode || modeId
          });
        } else {
          result = await generateProfileShareCard({
            username,
            displayName,
            photoURL,
            avatarUrl,
            publicUrl: activeShareUrl,
            theme: selectedTheme,
            headline: cardHeadline
          });
        }

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
  }, [isOpen, cardFormat, username, displayName, photoURL, avatarUrl, activeShareUrl, selectedTheme, cardHeadline, mode, modeId]);

  const handleShufflePrompt = () => {
    const nextPrompt = getNextPromptForMode(modeId, currentPrompt);
    setCurrentPrompt(nextPrompt);
    setEditedPromptText(nextPrompt);
    setIsEditingPrompt(false);
    showToast("Prompt shuffled 🎲");
    
    if (mode && onPromptChange) {
      const newUrl = buildModeShareUrl(mode, username, nextPrompt);
      onPromptChange(mode.id, nextPrompt, newUrl);
    }
  };

  const handleSaveEditedPrompt = () => {
    const trimmed = editedPromptText.trim();
    if (!trimmed) {
      showToast("Prompt cannot be empty");
      return;
    }
    setCurrentPrompt(trimmed);
    setIsEditingPrompt(false);
    showToast("Prompt updated!");

    if (mode && onPromptChange) {
      const newUrl = buildModeShareUrl(mode, username, trimmed);
      onPromptChange(mode.id, trimmed, newUrl);
    }
  };

  const handleResetPrompt = () => {
    const defaultPrompt = mode?.prompt || "send me anonymous messages!";
    setCurrentPrompt(defaultPrompt);
    setEditedPromptText(defaultPrompt);
    setIsEditingPrompt(false);
    showToast("Reset to default prompt");

    if (mode && onPromptChange) {
      const newUrl = buildModeShareUrl(mode, username, defaultPrompt);
      onPromptChange(mode.id, defaultPrompt, newUrl);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopied(true);
      showToast("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      showToast("Could not copy link");
    }
  };

  const handleDownload = () => {
    if (!renderedCard?.dataUrl) return;
    const sanitizedTitle = activeModeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const link = document.createElement("a");
    link.download = `whisper-${sanitizedTitle}-${username}.png`;
    link.href = renderedCard.dataUrl;
    link.click();
    showToast("Card image downloaded!");
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
          url: activeShareUrl
        });
        showToast("Shared successfully!");
      } else if (navigator.share) {
        await navigator.share({
          title: cardHeadline,
          text: cardHeadline,
          url: activeShareUrl
        });
      } else {
        handleDownload();
        await handleCopyLink();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        handleDownload();
        handleCopyLink();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col backdrop-blur-2xl select-none"
      >
        {/* Sleek Minimal Header */}
        <header className="px-4 py-3 pt-[max(0.75rem,calc(0.75rem+env(safe-area-inset-top,0px)))] flex items-center justify-between z-20 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Format Toggle Pill */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-full p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setCardFormat("square")}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                cardFormat === "square" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Square</span>
            </button>
            <button
              type="button"
              onClick={() => setCardFormat("story")}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                cardFormat === "story" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Story</span>
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Center Canvas Stage (Spacious, airy preview) */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
          {/* Toast Banner Overlay */}
          {toastMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 py-1.5 px-4 bg-indigo-600 text-white font-semibold text-xs rounded-full shadow-2xl animate-in fade-in zoom-in-95">
              {toastMessage}
            </div>
          )}

          {/* Card Preview Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            {renderedCard ? (
              <motion.img
                key={`${cardFormat}-${selectedTheme}-${currentPrompt}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                src={renderedCard.dataUrl}
                alt={`Whisper ${activeModeTitle} Card`}
                className={`max-w-full max-h-full object-contain rounded-2xl shadow-2xl ${
                  cardFormat === "story" ? "aspect-[9/16]" : "aspect-square"
                }`}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/50">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-xs">Generating card...</span>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Bottom Control Bar */}
        <div className="px-4 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))] pt-2 flex flex-col gap-3 shrink-0 max-w-lg mx-auto w-full z-20">
          {/* Inline Prompt Edit Drawer (if active) */}
          {isEditingPrompt && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
              <input
                type="text"
                value={editedPromptText}
                onChange={(e) => setEditedPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEditedPrompt();
                  if (e.key === "Escape") setIsEditingPrompt(false);
                }}
                placeholder="Type your custom question..."
                maxLength={100}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveEditedPrompt}
                className="p-1.5 bg-white text-slate-900 rounded-xl transition-all hover:bg-white/90 cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Minimal Controls Row: Theme Dots + Shuffle/Edit Icons */}
          <div className="flex items-center justify-between gap-3">
            {/* Theme Dots */}
            <div className="flex items-center gap-2">
              {THEME_OPTIONS.map(th => (
                <button
                  key={th.id}
                  onClick={() => setSelectedTheme(th.id)}
                  title={th.name}
                  className={`w-7 h-7 rounded-full ${th.color} border transition-all cursor-pointer ${
                    selectedTheme === th.id 
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110 border-white" 
                      : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>

            {/* Prompt Tools */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShufflePrompt}
                title="Shuffle question"
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                title="Edit question"
                className={`p-1.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                  isEditingPrompt
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {currentPrompt !== mode?.prompt && (
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  title="Reset prompt"
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareCard}
              disabled={isGenerating || !renderedCard?.blob}
              className="flex-1 py-3 px-4 bg-white text-slate-950 hover:bg-white/90 font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Story</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating || !renderedCard?.dataUrl}
              title="Save Image"
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopyLink}
              title="Copy Link"
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
