import React, { useState, useEffect, useMemo } from "react";
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  Send, 
  ShieldCheck, 
  TrendingUp, 
  Award,
  Users,
  MessageSquare,
  Zap,
  Star,
  MoreHorizontal
} from "lucide-react";
import { Link } from "react-router-dom";
import { collection, getDocs, getCountFromServer, query, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ADMIN_TOP_10_BADGES, AdminLeaderboardBadge, getAdminTop10Badge } from "../../lib/leaderboardBadges";
import UserAvatar from "../UserAvatar";
import { cn } from "../../lib/utils";

export interface AdminRankedUser {
  uid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
  avatarUrl?: string;
  email?: string;
  messageCount: number;
  rank: number;
  badge?: AdminLeaderboardBadge | null;
}

interface AdminLeaderboardTabProps {
  isDarkMode: boolean;
  autoSync?: boolean;
  onAddLog: (action: string, details: string, type: "info" | "success" | "warning" | "danger") => void;
  onShowToast: (title: string, message: string, type: "info" | "success" | "warning" | "danger") => void;
}

export default function AdminLeaderboardTab({
  isDarkMode,
  autoSync = false,
  onAddLog,
  onShowToast
}: AdminLeaderboardTabProps) {
  const [rankedUsers, setRankedUsers] = useState<AdminRankedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedRankFilter, setSelectedRankFilter] = useState<"all" | "top10" | "active">("all");

  const loadLeaderboardData = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const usersData: { uid: string; data: any }[] = [];

      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.isDeleted && d.username) {
          usersData.push({ uid: docSnap.id, data: d });
        }
      });

      // Fetch message counts for all users directly from their messages subcollection
      const countPromises = usersData.map(async ({ uid, data }) => {
        let count = 0;
        
        // Aggressive Priority 1: Check ALL known count fields on the user document
        const possibleFields = [
          "receivedMessagesCount", // The new standard
          "messageCount",           // Old standard
          "receivedCount",          // Legacy standard
          "totalMessages", 
          "whispersCount",
          "totalReceived"
        ];
        
        for (const field of possibleFields) {
          if (typeof data[field] === "number") {
            count = Math.max(count, data[field]);
          }
        }

        // Priority 2: Accurate server-side aggregation count from subcollection
        // If Priority 1 gave us 0, we MUST check the subcollection
        if (count === 0) {
          try {
            const msgCol = collection(db, "users", uid, "messages");
            const countSnap = await getCountFromServer(msgCol);
            count = countSnap.data().count;
            
            // If still 0, double check if it's a permission/cache lag issue
            if (count === 0) {
              const fullSnap = await getDocs(query(msgCol, limit(50)));
              if (!fullSnap.empty) {
                count = fullSnap.size;
              }
            }
          } catch (countErr) {
            console.warn(`Fallback counting for ${uid}:`, countErr);
          }
        }

        return {
          uid,
          username: data.username,
          displayName: data.displayName || data.username,
          photoURL: data.photoURL || data.avatarUrl,
          avatarUrl: data.avatarUrl || data.photoURL,
          email: data.email || "",
          messageCount: count,
          rank: 0,
          badge: null as AdminLeaderboardBadge | null
        };
      });

      const settled = await Promise.all(countPromises);

      // Sort descending by message count, then alphabetical
      settled.sort((a, b) => {
        if (b.messageCount !== a.messageCount) {
          return b.messageCount - a.messageCount;
        }
        return a.username.localeCompare(b.username);
      });

      // Assign ranks and Admin Unique Top 10 Badges
      // Only users with at least 1 message received are awarded an Admin Top 10 honor badge
      const ranked: AdminRankedUser[] = settled.map((u, idx) => {
        const rank = idx + 1;
        const badge = (rank <= 10 && u.messageCount > 0) ? getAdminTop10Badge(rank) : null;
        return {
          ...u,
          rank,
          badge
        };
      });

      setRankedUsers(ranked);
      onAddLog("Leaderboard Synchronized", `Ranked ${ranked.length} registered users by total received volume`, "info");
    } catch (err: any) {
      console.error("Admin leaderboard sync failed:", err);
      onShowToast("Sync Failed", err?.message || "Could not aggregate user message counts", "danger");
      onAddLog("Leaderboard Sync Error", err?.message || "Unknown error querying message counts", "danger");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  // Silent Auto-Sync Effect
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      // Re-fetch data silently without full loading state if we already have data
      const silentLoad = async () => {
        try {
          const usersSnap = await getDocs(collection(db, "users"));
          const usersData: { uid: string; data: any }[] = [];

          usersSnap.forEach((docSnap) => {
            const d = docSnap.data();
            if (!d.isDeleted && d.username) {
              usersData.push({ uid: docSnap.id, data: d });
            }
          });

          const countPromises = usersData.map(async ({ uid, data }) => {
            let count = 0;
            const possibleFields = ["messageCount", "receivedMessagesCount", "receivedCount", "totalMessages", "whispersCount"];
            for (const field of possibleFields) {
              if (typeof data[field] === "number") {
                count = Math.max(count, data[field]);
              }
            }

            try {
              const msgCol = collection(db, "users", uid, "messages");
              const countSnap = await getCountFromServer(msgCol);
              const serverCount = countSnap.data().count;
              if (serverCount > 0) {
                count = Math.max(count, serverCount);
              }
            } catch (err) {}

            return {
              uid,
              username: data.username,
              displayName: data.displayName || data.username,
              photoURL: data.photoURL || data.avatarUrl,
              avatarUrl: data.avatarUrl || data.photoURL,
              email: data.email || "",
              messageCount: count,
              rank: 0,
              badge: null as AdminLeaderboardBadge | null
            };
          });

          const settled = await Promise.all(countPromises);
          settled.sort((a, b) => {
            if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
            return a.username.localeCompare(b.username);
          });

          const ranked: AdminRankedUser[] = settled.map((u, idx) => {
            const rank = idx + 1;
            const badge = (rank <= 10 && u.messageCount > 0) ? getAdminTop10Badge(rank) : null;
            return { ...u, rank, badge };
          });

          setRankedUsers(ranked);
        } catch (err) {
          console.warn("Leaderboard silent sync failed:", err);
        }
      };

      silentLoad();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoSync]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLeaderboardData();
  };

  const totalMessagesAnalytics = useMemo(() => {
    const totalMsgs = rankedUsers.reduce((sum, u) => sum + u.messageCount, 0);
    const activeRecipients = rankedUsers.filter(u => u.messageCount > 0).length;
    const avgMsgs = rankedUsers.length > 0 ? (totalMsgs / rankedUsers.length).toFixed(1) : "0";
    const topRecipient = rankedUsers.find(u => u.messageCount > 0) || null;

    return {
      totalMsgs,
      activeRecipients,
      avgMsgs,
      topRecipient,
      totalUsers: rankedUsers.length
    };
  }, [rankedUsers]);

  // Export Leaderboard to CSV
  const handleExportCSV = () => {
    if (rankedUsers.length === 0) return;
    const headers = ["Rank", "Username", "DisplayName", "Email", "TotalMessagesReceived", "AdminHonorBadge", "UID"];
    const rows = rankedUsers.map(u => [
      u.rank,
      u.username,
      (u.displayName || "").replace(/"/g, '""'),
      u.email || "",
      u.messageCount,
      u.badge ? `${u.badge.emoji} ${u.badge.title}` : "Standard",
      u.uid
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whisper_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast("Leaderboard Exported", `Saved ranking data for ${rankedUsers.length} users to CSV`, "success");
    onAddLog("Export Leaderboard CSV", `Generated CSV report for ${rankedUsers.length} user ranks`, "info");
  };

  const filteredUsers = useMemo(() => {
    let list = rankedUsers;
    if (selectedRankFilter === "top10") {
      list = list.slice(0, 10);
    } else if (selectedRankFilter === "active") {
      list = list.filter(u => u.messageCount > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        u => u.username.toLowerCase().includes(q) || 
             (u.displayName && u.displayName.toLowerCase().includes(q)) ||
             (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rankedUsers, selectedRankFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Row with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Leaderboard & Admin Top 10 Badges</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time whisper volume rankings and honor badges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-indigo-500")} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Analytics Quick Look */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Total Whispers</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{totalMessagesAnalytics.totalMsgs}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Active Users</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{totalMessagesAnalytics.activeRecipients}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Avg Volume</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{totalMessagesAnalytics.avgMsgs}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-tight mb-1">#1 Apex</div>
          <div className="text-sm font-black text-slate-900 dark:text-white truncate">@{totalMessagesAnalytics.topRecipient?.username || "None"}</div>
        </div>
      </div>

      {/* Filter Pills and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Tabs Group */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedRankFilter("all")}
              className={cn(
                "px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center flex-1 lg:flex-none whitespace-nowrap",
                selectedRankFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              All Ranked ({rankedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRankFilter("top10")}
              className={cn(
                "px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center flex-1 lg:flex-none whitespace-nowrap",
                selectedRankFilter === "top10"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Top 10
            </button>
            <button
              type="button"
              onClick={() => setSelectedRankFilter("active")}
              className={cn(
                "px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center flex-1 lg:flex-none whitespace-nowrap",
                selectedRankFilter === "active"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Active (&ge;1)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ranked users..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "cards" 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "list" 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UNIQUE ADMIN TOP 10 HONOR ROLL - MAJESTIC PODIUM STYLE */}
      {selectedRankFilter === "all" && !searchQuery && rankedUsers.length > 0 && (
        <div className="space-y-4 py-8 px-4 bg-gradient-to-b from-indigo-50/30 via-transparent to-transparent dark:from-indigo-950/10 rounded-3xl mb-6">
          <div className="text-center space-y-1 mb-16 sm:mb-20">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 fill-current" />
              Whisper Hall of Fame
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Global Top Influencers</p>
          </div>

          {/* Podium Row */}
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-10 max-w-3xl mx-auto pt-6">
            {/* Rank 2 - Silver */}
            {rankedUsers[1] && (
              <div className="flex flex-col items-center group relative">
                <div className="relative mb-4">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[2rem] overflow-hidden border-4 border-slate-300 dark:border-slate-500 shadow-xl group-hover:-translate-y-2 transition-all duration-500">
                    <UserAvatar 
                      name={rankedUsers[1].displayName} 
                      username={rankedUsers[1].username}
                      photoURL={rankedUsers[1].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shadow-md transform rotate-12">
                    🥈
                  </div>
                </div>
                <div className="text-center w-full mb-3">
                  <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                    @{rankedUsers[1].username}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span className="font-mono font-black text-sm text-slate-600 dark:text-slate-400">
                      {rankedUsers[1].messageCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Visual Step */}
                <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-slate-200/80 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/50 rounded-t-3xl border-x border-t border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center">
                  <span className="text-4xl sm:text-6xl font-black text-slate-400/20 dark:text-slate-600/20">2</span>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {rankedUsers[0] && (
              <div className="flex flex-col items-center group relative -mt-10 sm:-mt-16">
                <div className="relative mb-5 scale-90 sm:scale-125 origin-bottom">
                  {/* Decorative Glow */}
                  <div className="absolute -inset-4 bg-amber-400/20 dark:bg-amber-400/10 blur-2xl rounded-full animate-pulse" />
                  
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-[2.5rem] overflow-hidden border-4 border-amber-400 shadow-[0_10px_40px_rgba(251,191,36,0.4)] group-hover:-translate-y-3 transition-all duration-700 z-10">
                    <UserAvatar 
                      name={rankedUsers[0].displayName} 
                      username={rankedUsers[0].username}
                      photoURL={rankedUsers[0].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-5 -right-5 w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-xl z-20 animate-bounce duration-[2000ms]">
                    👑
                  </div>
                </div>
                <div className="text-center w-full z-10 mb-4">
                  <div className="font-black text-sm text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                    @{rankedUsers[0].username}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="font-mono font-black text-xl text-slate-900 dark:text-white">
                      {rankedUsers[0].messageCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Visual Step */}
                <div className="w-full h-32 sm:h-44 bg-gradient-to-t from-amber-400/20 to-amber-400/5 dark:from-amber-400/10 dark:to-transparent rounded-t-[2.5rem] border-x border-t border-amber-400/50 shadow-[inset_0_2px_20px_rgba(251,191,36,0.15)] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-amber-500" />
                  <span className="text-6xl sm:text-8xl font-black text-amber-500/20 relative z-10">1</span>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {rankedUsers[2] && (
              <div className="flex flex-col items-center group relative">
                <div className="relative mb-4">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[2rem] overflow-hidden border-4 border-amber-800/40 dark:border-amber-700/40 shadow-xl group-hover:-translate-y-2 transition-all duration-500">
                    <UserAvatar 
                      name={rankedUsers[2].displayName} 
                      username={rankedUsers[2].username}
                      photoURL={rankedUsers[2].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-800/20 dark:border-amber-700/20 flex items-center justify-center text-xl shadow-md transform -rotate-12">
                    🥉
                  </div>
                </div>
                <div className="text-center w-full mb-3">
                  <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                    @{rankedUsers[2].username}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-amber-700/60" />
                    <span className="font-mono font-black text-sm text-amber-800 dark:text-amber-600">
                      {rankedUsers[2].messageCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Visual Step */}
                <div className="w-full h-14 sm:h-20 bg-gradient-to-t from-amber-900/10 to-amber-900/5 dark:from-amber-900/10 dark:to-transparent rounded-t-3xl border-x border-t border-amber-900/20 dark:border-amber-900/30 shadow-inner flex items-center justify-center">
                  <span className="text-3xl sm:text-5xl font-black text-amber-900/10 dark:text-amber-900/20">3</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RANKINGS DIRECTORY & ITEMS */}
      <div className="space-y-4">
        {/* User Items: List or Cards View */}
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No Legends Found</p>
            <p className="text-slate-500 text-[11px] mt-1">Adjust filters or search query to find more users.</p>
          </div>
        ) : viewMode === "list" ? (
          /* Table / List View - Redesigned as a Gaming/Majestic Directory */
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                    <th className="py-5 px-6">Rank</th>
                    <th className="py-5 px-6">Influencer</th>
                    <th className="py-5 px-6">Achievement</th>
                    <th className="py-5 px-6 text-right">Activity Volume</th>
                    <th className="py-5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredUsers.slice(selectedRankFilter === "all" && !searchQuery ? 3 : 0).map((u) => (
                    <tr key={u.uid} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all duration-300">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex items-center justify-center min-w-[34px] h-8 px-2 rounded-xl font-mono font-black text-xs shadow-sm border transition-all group-hover:scale-110",
                            u.rank === 1 ? "bg-amber-400 border-amber-500 text-slate-950" :
                            u.rank === 2 ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" :
                            u.rank === 3 ? "bg-amber-900 border-amber-950 text-white" :
                            "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-700"
                          )}>
                            #{u.rank}
                          </div>
                          {u.rank <= 3 && <Sparkles className="w-4 h-4 text-amber-500 fill-current animate-pulse shrink-0" />}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="relative">
                            <div className="w-11 h-11 rounded-[1.25rem] overflow-hidden shrink-0 border-2 border-white dark:border-slate-800 shadow-md group-hover:rotate-6 transition-transform">
                              <UserAvatar 
                                name={u.displayName} 
                                username={u.username}
                                photoURL={u.photoURL} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            {u.rank <= 10 && <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" title="Active Top Tier" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 dark:text-white truncate text-sm tracking-tight leading-none mb-1">
                              {u.displayName || u.username}
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest truncate">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {u.badge ? (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-2xs group-hover:shadow-md transition-shadow",
                            u.badge.badgeBg,
                            u.badge.borderColor,
                            u.badge.textColor
                          )}>
                            <span className="text-xs">{u.badge.emoji}</span>
                            <span>{u.badge.title}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            Rising Star
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <div className="text-base font-black text-slate-900 dark:text-white font-mono leading-none mb-0.5">
                            {u.messageCount.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Whispers
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/u/${u.username}`}
                            target="_blank"
                            className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                            title="View Public Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-200 hover:text-white dark:hover:text-slate-900 transition-all shadow-2xs"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid View - Condensed for high-volume scalability */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.slice(selectedRankFilter === "all" && !searchQuery ? 3 : 0).map((u) => (
              <div
                key={u.uid}
                className={cn(
                  "group relative p-4 rounded-3xl border transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                  u.rank === 1 ? "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-500/30" :
                  u.rank === 2 ? "bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 border-slate-300 dark:border-slate-600" :
                  u.rank === 3 ? "bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-950/10 dark:to-slate-900 border-amber-700/30 dark:border-amber-800/20" :
                  "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                )}
              >
                {/* Subtle background rank decoration */}
                <div className="absolute -right-2 -top-4 text-6xl font-black text-slate-100/30 dark:text-slate-800/10 select-none pointer-events-none group-hover:scale-110 transition-all duration-700">
                  {u.rank}
                </div>

                <div className="relative z-10">
                  {/* Card Header: Rank & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono font-black text-[10px] shadow-sm border",
                      u.rank === 1 ? "bg-amber-400 border-amber-500 text-slate-950" :
                      u.rank === 2 ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" :
                      u.rank === 3 ? "bg-amber-900 border-amber-950 text-white" :
                      "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                      <span>RANK</span>
                      <span>#{u.rank}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/u/${u.username}`}
                        target="_blank"
                        className="w-7 h-7 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* User Profile Info - More Compact */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md group-hover:scale-105 transition-transform duration-300",
                        u.rank === 1 ? "ring-2 ring-amber-400/20" :
                        u.rank === 2 ? "ring-2 ring-slate-400/10" : ""
                      )}>
                        <UserAvatar 
                          name={u.displayName} 
                          username={u.username}
                          photoURL={u.photoURL} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      {u.rank <= 3 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[10px]">
                          {u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : "🥉"}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white truncate tracking-tight leading-tight mb-0.5">
                        {u.displayName || u.username}
                      </h4>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  {/* Achievement & Stats - Highly Dense */}
                  <div className="flex items-center justify-between gap-4 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Volume</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none">
                          {u.messageCount.toLocaleString()}
                        </p>
                        <TrendingUp className={cn("w-3 h-3", u.rank <= 10 ? "text-emerald-500" : "text-indigo-500")} />
                      </div>
                    </div>
                    
                    {u.badge ? (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-xl border text-[8px] font-black uppercase tracking-widest shadow-2xs whitespace-nowrap",
                        u.badge.badgeBg,
                        u.badge.borderColor,
                        u.badge.textColor
                      )}>
                        <span>{u.badge.emoji}</span>
                        <span>{u.badge.title}</span>
                      </div>
                    ) : (
                      <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Rising Star</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
