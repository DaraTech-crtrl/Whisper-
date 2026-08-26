import React, { useState, useRef, useEffect } from "react";
import { 
  CheckSquare, 
  Square, 
  RotateCcw,
  Check,
  ChevronDown,
  X,
  SlidersHorizontal,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { WHISPER_MODES } from "../../lib/whisperModes";
import { triggerHaptic } from "../../lib/haptics";
import { InboxViewType } from "./InboxHeader";

export type QuickFilterType = "ALL" | "UNREAD" | "HAS_LINK" | "HAS_REACTION" | "TIME_CAPSULE";

interface InboxFilterBarProps {
  inboxView: InboxViewType;
  selectedModeFilter: string;
  setSelectedModeFilter: (mode: string) => void;
  quickFilter: QuickFilterType;
  setQuickFilter: (filter: QuickFilterType) => void;
  activeCount: number;
  archivedCount: number;
  unreadCount: number;
  modeCounts: Record<string, number>;
  isAllSelected: boolean;
  totalFilteredCount: number;
  toggleSelectAll: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  setInboxView?: (view: InboxViewType) => void;
}

export default function InboxFilterBar({
  selectedModeFilter,
  setSelectedModeFilter,
  quickFilter,
  setQuickFilter,
  modeCounts,
  isAllSelected,
  totalFilteredCount,
  toggleSelectAll,
  onResetFilters,
  hasActiveFilters
}: InboxFilterBarProps) {
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setIsModeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const currentMode = WHISPER_MODES.find(m => m.id === selectedModeFilter);

  return (
    <div className={cn("space-y-2 relative transition-all", isModeMenuOpen ? "z-40" : "z-30")}>
      {/* Consolidated Filter Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
        
        {/* Left Controls: Compact Mode Filter Dropdown & Reset */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          
          {/* 1. Compact Mode Filter Dropdown */}
          <div className="relative" ref={modeMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsModeMenuOpen(prev => !prev);
                triggerHaptic("light");
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-2xs active:scale-[0.98]",
                selectedModeFilter !== "ALL"
                  ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <span className="text-sm shrink-0">
                {currentMode ? currentMode.icon : "✨"}
              </span>
              <span className="max-w-[110px] truncate">
                {currentMode ? currentMode.name : "Mode"}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-md font-mono bg-black/5 dark:bg-white/10 opacity-80 shrink-0">
                {selectedModeFilter === "ALL" ? modeCounts.ALL || 0 : modeCounts[selectedModeFilter] || 0}
              </span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform shrink-0", isModeMenuOpen && "rotate-180")} />
            </button>

            {/* Mode Popover Dropdown (High z-index to stay above message cards) */}
            <AnimatePresence>
              {isModeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1.5 z-50 w-56 sm:w-60 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-0.5 max-h-72 overflow-y-auto"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Filter Mode
                  </div>

                  {/* All Modes Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModeFilter("ALL");
                      setIsModeMenuOpen(false);
                      triggerHaptic("light");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left",
                      selectedModeFilter === "ALL"
                        ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✨</span>
                      <span>All Modes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {modeCounts.ALL || 0}
                      </span>
                      {selectedModeFilter === "ALL" && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Whisper Modes List */}
                  {WHISPER_MODES.map((mode) => {
                    const count = modeCounts[mode.id] || 0;
                    const isSelected = selectedModeFilter === mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setSelectedModeFilter(mode.id);
                          setIsModeMenuOpen(false);
                          triggerHaptic("light");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left",
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{mode.icon}</span>
                          <span className="truncate">{mode.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {count > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              {count}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Clear Button when any filter is active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                triggerHaptic("medium");
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

        </div>

        {/* Right Controls: Whisper Count & Select All */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] font-medium text-slate-400 font-mono hidden sm:inline">
            {totalFilteredCount} {totalFilteredCount === 1 ? "whisper" : "whispers"}
          </span>

          {totalFilteredCount > 0 && (
            <button
              type="button"
              onClick={() => {
                toggleSelectAll();
                triggerHaptic("light");
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden xs:inline">Deselect</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden xs:inline">Select All</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Active Filter Chips (Clean, tight single line if active) */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-1.5 px-1 overflow-hidden"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
              <span>Active:</span>
            </span>

            {/* Mode Filter Tag */}
            {selectedModeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                <span>{currentMode?.icon || "✨"}</span>
                <span>{currentMode?.name || selectedModeFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModeFilter("ALL");
                    triggerHaptic("light");
                  }}
                  className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-md transition-colors cursor-pointer"
                  title="Clear mode filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Unread Active Tag */}
            {quickFilter === "UNREAD" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 shadow-2xs">
                <Bell className="w-3 h-3 text-rose-500" />
                <span>Unread Only</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickFilter("ALL");
                    triggerHaptic("light");
                  }}
                  className="p-0.5 hover:bg-rose-200 dark:hover:bg-rose-900 rounded-md transition-colors cursor-pointer"
                  title="Clear unread filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
