import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Share2, 
  Download, 
  Copy, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  Check,
  AlertTriangle
} from "lucide-react";
import { generateShareImageBlob, ProfileCardTheme } from "../lib/canvasImage";
import { Message } from "../pages/Dashboard";
import { getMessageMode } from "../lib/whisperModes";
import { triggerHaptic } from "../lib/haptics";
import { cn } from "../lib/utils";

interface BatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessages: Message[];
  decryptedCache: Record<string, string>;
  username: string;
  publicUrl: string;
}

const THEME_OPTIONS: { id: ProfileCardTheme; name: string; color: string; border: string }[] = [
  { id: "obsidian", name: "Obsidian", color: "bg-slate-900", border: "border-purple-500" },
  { id: "neon", name: "Neon", color: "bg-purple-900", border: "border-pink-500" },
  { id: "velvet", name: "Velvet", color: "bg-rose-900", border: "border-rose-500" },
  { id: "sunset", name: "Sunset", color: "bg-amber-900", border: "border-orange-500" },
  { id: "cyberpunk", name: "Emerald", color: "bg-emerald-900", border: "border-emerald-500" }
];

export default function BatchShareModal({
  isOpen,
  onClose,
  selectedMessages,
  decryptedCache,
  username,
  publicUrl
}: BatchShareModalProps) {
  const [caption, setCaption] = useState("Check out these anonymous whispers people sent me! 👇");
  const [selectedTheme, setSelectedTheme] = useState<ProfileCardTheme>("obsidian");
  const [generatedItems, setGeneratedItems] = useState<{ id: string; dataUrl: string; blob: Blob }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Limit batch to max 10 messages for performance and platform share limits
  const activeMessages = useMemo(() => {
    return selectedMessages.slice(0, 10);
  }, [selectedMessages]);

  const activeIdsKey = activeMessages.map(m => m.id).join(",");

  useEffect(() => {
    if (!isOpen || activeMessages.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);
    setGeneratedItems([]);
    setProgressText(`Generating 1 of ${activeMessages.length} cards...`);

    const generateAllCards = async () => {
      const results: { id: string; dataUrl: string; blob: Blob }[] = [];
      
      for (let i = 0; i < activeMessages.length; i++) {
        if (!isMounted) break;
        const msg = activeMessages[i];
        const text = decryptedCache[msg.id] || "Anonymous Whisper";
        const mode = getMessageMode(msg);

        setProgressText(`Rendering card ${i + 1} of ${activeMessages.length}...`);

        try {
          const { blob, dataUrl } = await generateShareImageBlob({
            text,
            reaction: msg.reaction,
            mood: msg.mood,
            publicUrl,
            username,
            mode,
            theme: selectedTheme
          });
          results.push({ id: msg.id, dataUrl, blob });
        } catch (err) {
          console.error(`Failed to generate card for message ${msg.id}:`, err);
        }
      }

      if (isMounted) {
        setGeneratedItems(results);
        setIsGenerating(false);
        setProgressText("");
      }
    };

    const timer = setTimeout(generateAllCards, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, activeIdsKey, username, publicUrl, selectedTheme]);

  const fullShareText = `${caption}\n\n${publicUrl}`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopied(true);
      triggerHaptic("success");
      showToast("Caption & link copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy");
    }
  };

  const handleDownloadAll = () => {
    triggerHaptic("medium");
    generatedItems.forEach((item, index) => {
      const link = document.createElement("a");
      link.download = `whisper-batch-${index + 1}.png`;
      link.href = item.dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    showToast(`Successfully downloaded ${generatedItems.length} images! 📥`);
  };

  const handleNativeBatchShare = async () => {
    if (generatedItems.length === 0) return;
    triggerHaptic("medium");
    setIsSharing(true);

    try {
      const files = generatedItems.map((item, index) => 
        new File([item.blob], `whisper-${index + 1}.png`, { type: "image/png" })
      );

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: "Whisper Batch Share",
          text: fullShareText,
          files: files
        });
        showToast("Batch shared successfully! 🎉");
      } else {
        // Fallback: copy caption and download images
        handleCopyCaption();
        handleDownloadAll();
        showToast("Files sharing not supported here. Downloaded images & copied caption instead!");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Batch share error:", err);
        handleCopyCaption();
        handleDownloadAll();
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  Batch Share Whispers ({generatedItems.length}/{activeMessages.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share up to 10 images at once with one caption to any place
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Toast feedback */}
            {toastMessage && (
              <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Card Theme Style
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(t.id);
                      triggerHaptic("light");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                      selectedTheme === t.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-105"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className={cn("w-3 h-3 rounded-full", t.color, t.border, "border")} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Shared Caption for All Images
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Write your shared caption..."
              />
            </div>

            {/* Generated Cards Preview Carousel / Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Generated Cards Preview ({generatedItems.length})
                </label>
                {isGenerating && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                    {progressText}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                {activeMessages.map((msg, index) => {
                  const rendered = generatedItems.find(item => item.id === msg.id);
                  return (
                    <div 
                      key={msg.id}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center group"
                    >
                      {rendered ? (
                        <img 
                          src={rendered.dataUrl} 
                          alt={`Card ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="text-[9px] text-slate-400 font-mono">#{index + 1}</span>
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                        #{index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyCaption}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied Caption" : "Copy Caption & Link"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isGenerating || generatedItems.length === 0}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download All ({generatedItems.length})</span>
              </button>

              <button
                type="button"
                onClick={handleNativeBatchShare}
                disabled={isGenerating || generatedItems.length === 0 || isSharing}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30"
              >
                {isSharing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Share Batch to Apps ({generatedItems.length})</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
