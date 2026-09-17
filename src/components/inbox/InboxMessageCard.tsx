import React, { useState } from "react";
import { 
  CheckSquare, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  AlertTriangle, 
  Search, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  Eye,
  Smile
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Message } from "../../pages/Dashboard";
import { getMessageMode, WhisperMode } from "../../lib/whisperModes";
import { extractUrls } from "../../lib/linkPreview";
import LinkPreviewCard from "../LinkPreviewCard";
import { triggerHaptic } from "../../lib/haptics";

const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😲", "🥺", "🙏"];

interface InboxMessageCardProps {
  key?: React.Key;
  msg: Message;
  decryptedText?: string;
  isSelected: boolean;
  layoutDensity?: "cards" | "compact";
  restrictSenderHints?: boolean;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onClick: (msg: Message) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onArchiveToggle: (id: string, isArchived: boolean, e?: React.MouseEvent) => void;
  onReport: (id: string, e?: React.MouseEvent) => void;
  onReaction: (id: string, reaction: string, e: React.MouseEvent) => void;
  onOpenHint: (msg: Message, e: React.MouseEvent) => void;
  onQuickShare?: (msg: Message, e: React.MouseEvent) => void;
  archiveDaysRemaining?: number;
}

export default function InboxMessageCard({
  msg,
  decryptedText,
  isSelected,
  layoutDensity = "compact",
  restrictSenderHints = false,
  onSelect,
  onClick,
  onDelete,
  onArchiveToggle,
  onReport,
  onReaction,
  onOpenHint,
  onQuickShare,
  archiveDaysRemaining
}: InboxMessageCardProps) {
  const [copied, setCopied] = useState(false);

  const msgMode: WhisperMode = getMessageMode(msg);
  const isLocked = msg.unlocksAt && (msg.unlocksAt.seconds * 1000 > Date.now());
  const isArchived = Boolean(msg.archived);

  const timeString = msg.createdAt?.seconds 
    ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true }) 
    : "Just now";

  const handleCopyText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!decryptedText) return;
    try {
      await navigator.clipboard.writeText(decryptedText);
      setCopied(true);
      triggerHaptic("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // ==========================================
  // COMPACT ROW VIEW (Default layout with sleek side actions)
  // ==========================================
  if (layoutDensity === "compact") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={() => onClick(msg)}
        className={cn(
          "px-3.5 py-3 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 select-none relative overflow-hidden",
          isSelected
            ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20"
            : !msg.read
              ? `${msgMode.msgUnreadBg} ${msgMode.msgBorder} shadow-2xs hover:border-indigo-400`
              : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}
      >
        {/* Left: Checkbox + Mode Avatar + Text Snippet */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => onSelect(msg.id, e)}
            className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center transition-all border shrink-0",
              isSelected
                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-transparent border-slate-300 dark:border-slate-700 group-hover:opacity-100"
            )}
            title={isSelected ? "Deselect" : "Select"}
          >
            <CheckSquare className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "opacity-0")} />
          </button>

          <div className="relative shrink-0">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-2xs bg-gradient-to-tr text-white", msgMode.gradient)}>
              <span>{msgMode.icon}</span>
            </div>
            {!msg.read && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded-md border", msgMode.msgBadgeBg)}>
                {msgMode.name}
              </span>
              {!msg.read && (
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                  New
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-mono">
                {timeString}
              </span>
              {isArchived && typeof archiveDaysRemaining === "number" && (
                <span className="text-[10px] font-mono text-amber-500">
                  ({archiveDaysRemaining}d left)
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {isLocked ? (
                <span className="text-slate-400 italic flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Time Capsule (Locked)</span>
                </span>
              ) : !msg.read ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  Secret Whisper — Tap to decrypt
                </span>
              ) : (
                <span>
                  {msg.mood && <span className="mr-1.5">{msg.mood}</span>}
                  {decryptedText ? decryptedText.replace(/[\r\n]+/g, " ").trim() : "..."}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Side Action Dock (Neatly fitted on the side) */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Reaction Pill if reacted */}
          {msg.reaction && (
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold border border-slate-200 dark:border-slate-700 mr-1">
              {msg.reaction}
            </span>
          )}

          {/* Quick Hover/Action Buttons */}
          <div className="hidden sm:flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Sender Hint */}
            {!restrictSenderHints && (
              <button
                type="button"
                onClick={(e) => onOpenHint(msg, e)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Sender Hint"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Share */}
            {onQuickShare && (
              <button
                type="button"
                onClick={(e) => onQuickShare(msg, e)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Share to Story"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={(e) => onArchiveToggle(msg.id, isArchived, e)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isArchived 
                  ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40" 
                  : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              title={isArchived ? "Restore" : "Archive"}
            >
              {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => onDelete(msg.id, e)}
              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chevron Navigation Indicator */}
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-0.5 ml-0.5">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // CARD VIEW: UNREAD STATE (Magnetic Teaser)
  // ==========================================
  if (!msg.read) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => {
          triggerHaptic("medium");
          onClick(msg);
        }}
        className={cn(
          "p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden shadow-xs hover:shadow-lg active:scale-[0.99]",
          isSelected
            ? "bg-indigo-50/95 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/30"
            : `${msgMode.msgUnreadBg} ${msgMode.msgBorder} hover:border-indigo-400 dark:hover:border-indigo-500`
        )}
      >
        <div className={cn("absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 bg-gradient-to-br pointer-events-none", msgMode.gradient)} />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Multi-select Checkbox */}
            <button
              type="button"
              onClick={(e) => onSelect(msg.id, e)}
              className={cn(
                "w-6 h-6 rounded-xl flex items-center justify-center transition-all border shrink-0",
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                  : "bg-white/90 dark:bg-slate-800 text-transparent border-slate-300 dark:border-slate-700 hover:border-indigo-400"
              )}
              title={isSelected ? "Deselect" : "Select"}
            >
              <CheckSquare className={cn("w-4 h-4", isSelected ? "text-white" : "opacity-0")} />
            </button>

            {/* Glowing Mode Icon Box */}
            <div className="relative shrink-0">
              <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform", msgMode.gradient)}>
                <span className="text-2xl">{msgMode.icon || "🤫"}</span>
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>

            {/* Title & Teaser Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  <span>New Anonymous Whisper!</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300 animate-spin" style={{ animationDuration: "6s" }} />
                </h3>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs", msgMode.msgBadgeBg)}>
                  <span>{msgMode.name}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium flex-wrap">
                <span>{timeString}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Tap to decrypt & reveal</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Icons & Arrow */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => onDelete(msg.id, e)}
              className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Message"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-1 shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // CARD VIEW: READ STATE (Redesigned with fitted side actions)
  // ==========================================
  const urls = decryptedText ? extractUrls(decryptedText) : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick(msg)}
      className={cn(
        "p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group flex flex-col relative overflow-hidden shadow-2xs hover:shadow-md",
        isSelected
          ? "bg-indigo-50/95 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
          : isArchived
            ? "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800"
            : `bg-white dark:bg-slate-900/90 ${msgMode.msgBorder} hover:border-slate-300 dark:hover:border-slate-700`
      )}
    >
      {/* Top Header Row: Checkbox, Mode Badge, Time, Archive Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Checkbox */}
          <button
            type="button"
            onClick={(e) => onSelect(msg.id, e)}
            className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center transition-all border shrink-0",
              isSelected
                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-transparent border-slate-300 dark:border-slate-700 hover:border-indigo-400"
            )}
            title={isSelected ? "Deselect" : "Select"}
          >
            <CheckSquare className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "opacity-0")} />
          </button>

          {/* Mode Pill Badge */}
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs", msgMode.msgBadgeBg)}>
            <span>{msgMode.icon}</span>
            <span>{msgMode.name}</span>
          </span>

          <span className="text-xs font-medium text-slate-400 font-mono">
            {timeString}
          </span>

          {isArchived && typeof archiveDaysRemaining === "number" && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
              <Clock className="w-3 h-3" />
              Deletes in {archiveDaysRemaining}d
            </span>
          )}
        </div>

        {/* Reaction badge if already set */}
        {msg.reaction && (
          <span className="text-base animate-in zoom-in-75">
            {msg.reaction}
          </span>
        )}
      </div>

      {/* Message Body Content */}
      <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 break-words mb-3 flex-1">
        {isLocked ? (
          <div className="flex flex-col items-center justify-center p-5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
            <Lock className="w-6 h-6 text-slate-400 mb-2 animate-bounce" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Time Capsule Locked
            </span>
            <span className="text-xs text-slate-400 font-mono mt-1">
              Unlocks on {new Date(msg.unlocksAt.seconds * 1000).toLocaleString()}
            </span>
          </div>
        ) : decryptedText === undefined ? (
          <span className="animate-pulse text-slate-400">Decrypting whisper...</span>
        ) : (
          <div className="space-y-2">
            <p className="line-clamp-3 leading-relaxed">
              {msg.mood && <span className="mr-2 text-xl inline-block">{msg.mood}</span>}
              {decryptedText.replace(/[\r\n]+/g, " ").trim()}
            </p>
            {urls.length > 0 && (
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <LinkPreviewCard url={urls[0]} variant="compact" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Redesigned Card Footer: Left Reactions + Right Unified Action Dock */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Left: Quick Reaction Emojis */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                triggerHaptic("light");
                onReaction(msg.id, emoji, e);
              }}
              className={cn(
                "w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-125 active:scale-95",
                msg.reaction === emoji
                  ? "bg-indigo-100 dark:bg-indigo-900/60 ring-2 ring-indigo-500 scale-110"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 opacity-70 hover:opacity-100"
              )}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Right: Unified Side Action Dock (Neatly grouped on the side) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sender Hint */}
          {!restrictSenderHints && (
            <button
              type="button"
              onClick={(e) => onOpenHint(msg, e)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sender Hint"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Archive / Restore */}
          <button
            type="button"
            onClick={(e) => onArchiveToggle(msg.id, isArchived, e)}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              isArchived 
                ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100" 
                : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title={isArchived ? "Restore to Main Inbox" : "Move to Archive"}
          >
            {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>

          {/* Report */}
          <button
            type="button"
            onClick={(e) => onReport(msg.id, e)}
            className="text-slate-400 hover:text-amber-500 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Report Message"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => onDelete(msg.id, e)}
            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Delete Permanently"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Quick Story Share */}
          {onQuickShare && (
            <button
              type="button"
              onClick={(e) => {
                triggerHaptic("medium");
                onQuickShare(msg, e);
              }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all active:scale-95 bg-gradient-to-r hover:brightness-110 ml-0.5",
                msgMode.gradient
              )}
              title="Share as Instagram / WhatsApp Story"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Story</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
