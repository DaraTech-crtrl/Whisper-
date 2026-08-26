import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  X, 
  Inbox, 
  Archive, 
  Bell, 
  CheckCheck, 
  LayoutGrid, 
  List, 
  ShieldCheck, 
  ArrowUpDown,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { WHISPER_MODES } from "../../lib/whisperModes";
import { triggerHaptic } from "../../lib/haptics";

export type InboxViewType = "active" | "archived";
export type LayoutDensity = "cards" | "compact";
export type SortOption = "newest" | "oldest" | "most_rated" | "longest";

interface InboxHeaderProps {
  inboxView: InboxViewType;
  setInboxView: (view: InboxViewType) => void;
  activeCount: number;
  archivedCount: number;
  unreadCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  layoutDensity: LayoutDensity;
  setLayoutDensity: (density: LayoutDensity) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedModeFilter?: string;
  setSelectedModeFilter?: (mode: string) => void;
  modeCounts?: Record<string, number>;
  totalFilteredCount?: number;
  isAllSelected?: boolean;
  toggleSelectAll?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  onMarkAllRead?: () => void;
  isMarkingAllRead?: boolean;
  quickFilter?: string;
  setQuickFilter?: (filter: any) => void;
}

export default function InboxHeader({
  inboxView,
  setInboxView,
  activeCount,
  archivedCount,
  unreadCount,
  searchQuery,
  setSearchQuery,
  layoutDensity,
  setLayoutDensity,
  sortBy,
  setSortBy,
  selectedModeFilter = "ALL",
  setSelectedModeFilter,
  modeCounts = {},
  totalFilteredCount = 0,
  isAllSelected = false,
  toggleSelectAll,
  onResetFilters,
  hasActiveFilters = false,
  onMarkAllRead,
  isMarkingAllRead = false,
  quickFilter = "ALL",
  setQuickFilter
}: InboxHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close mode popover on outside click
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

  // Keyboard shortcut listener (/ or Cmd+K to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        triggerHaptic("light");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentMode = WHISPER_MODES.find(m => m.id === selectedModeFilter);

  return (
    <div className="space-y-3">
      {/* Top Banner: Glassmorphism Summary Stats & Security Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Active Whispers Stat */}
        <button
          type="button"
          onClick={() => {
            setInboxView("active");
            if (setQuickFilter) setQuickFilter("ALL");
            triggerHaptic("light");
          }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group active:scale-[0.98]",
            inboxView === "active" && quickFilter !== "UNREAD"
              ? "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/40 dark:border-indigo-500/30 ring-2 ring-indigo-500/20 shadow-xs"
              : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Inbox
            </span>
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
              inboxView === "active" && quickFilter !== "UNREAD" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}>
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
              {activeCount}
            </span>
            <span className="text-[11px] font-medium text-slate-400">total</span>
          </div>
        </button>

        {/* Unread Whispers Stat (Interactive: Click to filter unread) */}
        <button
          type="button"
          onClick={() => {
            if (quickFilter === "UNREAD") {
              if (setQuickFilter) setQuickFilter("ALL");
            } else {
              setInboxView("active");
              if (setQuickFilter) setQuickFilter("UNREAD");
            }
            triggerHaptic("light");
          }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group active:scale-[0.98]",
            quickFilter === "UNREAD"
              ? "bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-transparent border-rose-500/50 dark:border-rose-500/40 ring-2 ring-rose-500/25 shadow-xs"
              : unreadCount > 0
                ? "bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent border-rose-500/30 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/40"
                : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </span>
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
              quickFilter === "UNREAD" || unreadCount > 0 ? "bg-rose-500 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {unreadCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {quickFilter === "UNREAD" ? "filtered" : "new"}
              </span>
            </div>
            {unreadCount > 0 && onMarkAllRead && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllRead();
                  triggerHaptic("medium");
                }}
                className={cn(
                  "text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 z-10 cursor-pointer p-0.5 rounded",
                  isMarkingAllRead && "opacity-50 pointer-events-none"
                )}
                title="Mark all active unread messages as read"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Read All</span>
              </span>
            )}
          </div>
        </button>

        {/* Archived Vault Stat */}
        <button
          type="button"
          onClick={() => {
            setInboxView("archived");
            if (setQuickFilter) setQuickFilter("ALL");
            triggerHaptic("light");
          }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group active:scale-[0.98]",
            inboxView === "archived"
              ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/40 dark:border-amber-500/30 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vault Archive
            </span>
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
              inboxView === "archived" ? "bg-amber-500 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}>
              <Archive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
              {archivedCount}
            </span>
            <span className="text-[11px] font-medium text-slate-400">saved</span>
          </div>
        </button>

        {/* E2EE Security Status Stat */}
        <div className="p-3.5 rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 dark:border-emerald-500/20 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Security
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              E2EE Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">RSA-OAEP 2048-bit</p>
        </div>
      </div>

      {/* Main Search & Control Toolbar */}
      <div className={cn("space-y-2 relative transition-all", isModeMenuOpen ? "z-40" : "z-20")}>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
          
          {/* Left: Search Input with Shortcut badge */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search whispers..."
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  triggerHaptic("light");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                <span>/</span>
              </div>
            )}
          </div>

          {/* Right Controls: Mode Filter Dropdown (BESIDE NEWEST FILTER), Sort Selector, Layout Switcher, and Select All */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* 1. Mode Filter Dropdown (Positioned directly beside the Newest sort filter) */}
            {setSelectedModeFilter && (
              <div className="relative" ref={modeMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModeMenuOpen(prev => !prev);
                    triggerHaptic("light");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-2xs active:scale-[0.98]",
                    selectedModeFilter !== "ALL"
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm shrink-0">
                    {currentMode ? currentMode.icon : "✨"}
                  </span>
                  <span className="max-w-[85px] sm:max-w-[100px] truncate">
                    {currentMode ? currentMode.name : "Mode"}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-md font-mono bg-black/5 dark:bg-white/10 opacity-80 shrink-0">
                    {selectedModeFilter === "ALL" ? modeCounts.ALL || 0 : modeCounts[selectedModeFilter] || 0}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform shrink-0", isModeMenuOpen && "rotate-180")} />
                </button>

                {/* Mode Popover Dropdown (High z-index) */}
                <AnimatePresence>
                  {isModeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 z-50 origin-top-left w-56 sm:w-60 max-w-[calc(100vw-2rem)] p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-0.5 max-h-72 overflow-y-auto"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Filter By Mode
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
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer",
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
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer",
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
            )}

            {/* 2. Sort Selector ("Newest" dropdown) */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                id="inbox-sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  triggerHaptic("light");
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
                aria-label="Sort inbox whispers"
              >
                <option value="newest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Newest</option>
                <option value="oldest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Oldest</option>
                <option value="most_rated" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Most Rated</option>
                <option value="longest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Longest</option>
              </select>
            </div>

            {/* 3. Layout Switcher (Cards vs Compact) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setLayoutDensity("cards");
                  triggerHaptic("light");
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  layoutDensity === "cards"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Rich Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutDensity("compact");
                  triggerHaptic("light");
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  layoutDensity === "compact"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Compact Row View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Select All Button */}
            {toggleSelectAll && totalFilteredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  toggleSelectAll();
                  triggerHaptic("light");
                }}
                className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 sm:px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                title={isAllSelected ? "Deselect all" : "Select all"}
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="hidden xs:inline text-[11px]">Deselect</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="hidden xs:inline text-[11px]">Select All</span>
                  </>
                )}
              </button>
            )}

          </div>
        </div>

        {/* Active Filter Chips & Reset Button (Directly below toolbar if any filter is active) */}
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
              {selectedModeFilter !== "ALL" && setSelectedModeFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 shadow-2xs">
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
              {quickFilter === "UNREAD" && setQuickFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 shadow-2xs">
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

              {/* Search Active Tag */}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span className="max-w-[100px] truncate">"{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      triggerHaptic("light");
                    }}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Clear All / Reset Button */}
              {onResetFilters && (
                <button
                  type="button"
                  onClick={() => {
                    onResetFilters();
                    triggerHaptic("medium");
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer ml-auto"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
