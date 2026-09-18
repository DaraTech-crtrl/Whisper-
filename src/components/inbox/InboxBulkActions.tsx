import React, { useState } from "react";
import { 
  CheckCheck, 
  Mail, 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  X, 
  Download, 
  CheckSquare, 
  AlertTriangle,
  Share2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../../lib/haptics";
import { InboxViewType } from "./InboxHeader";

interface InboxBulkActionsProps {
  selectedCount: number;
  inboxView: InboxViewType;
  onMarkRead: (isRead: boolean) => Promise<void>;
  onArchive: (archiveState: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  onExportSelected?: () => void;
  onBatchShare?: () => void;
}

export default function InboxBulkActions({
  selectedCount,
  inboxView,
  onMarkRead,
  onArchive,
  onDelete,
  onClearSelection,
  onExportSelected,
  onBatchShare
}: InboxBulkActionsProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async (actionFn: () => Promise<void>, hapticType: any = "light") => {
    try {
      setIsProcessing(true);
      triggerHaptic(hapticType);
      await actionFn();
    } finally {
      setIsProcessing(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 inset-x-3 max-w-xl mx-auto z-40 bg-slate-950/95 text-white backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-3 shadow-2xl shadow-indigo-950/60"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Left: Selected count pill */}
          <div className="flex items-center gap-2 pl-1">
            <span className="bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1.5 rounded-full font-mono flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedCount} selected</span>
            </span>
          </div>

          {/* Center/Right: Action Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Batch Share */}
            {onBatchShare && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  onBatchShare();
                }}
                className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-sm shadow-indigo-600/30"
                title={`Batch Share Selected Images (${selectedCount})`}
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Mark as Read */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(() => onMarkRead(true), "medium")}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-emerald-400 border border-slate-800 transition-all disabled:opacity-50"
              title="Mark as Read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>

            {/* Mark as Unread */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(() => onMarkRead(false), "medium")}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-indigo-400 border border-slate-800 transition-all disabled:opacity-50"
              title="Mark as Unread"
            >
              <Mail className="w-4 h-4" />
            </button>

            {/* Archive / Restore */}
            {inboxView === "active" ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(() => onArchive(true), "medium")}
                className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 border border-slate-800 transition-all disabled:opacity-50"
                title="Move to Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(() => onArchive(false), "medium")}
                className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-emerald-400 border border-slate-800 transition-all disabled:opacity-50"
                title="Restore to Main Inbox"
              >
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}

            {/* Delete button or confirmation */}
            {!isConfirmingDelete ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setIsConfirmingDelete(true);
                  triggerHaptic("warning");
                }}
                className="p-2.5 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 text-rose-300 border border-rose-800/40 transition-all disabled:opacity-50"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-700/60 rounded-2xl p-1 animate-in zoom-in-95">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction(onDelete, "heavy")}
                  className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete {selectedCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => {
                onClearSelection();
                triggerHaptic("light");
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors ml-0.5"
              title="Close Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
