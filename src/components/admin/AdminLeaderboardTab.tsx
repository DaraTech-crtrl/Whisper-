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
  Star
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
  onAddLog: (action: string, details: string, type: "info" | "success" | "warning" | "danger") => void;
  onShowToast: (title: string, message: string, type: "info" | "success" | "warning" | "danger") => void;
}

export default function AdminLeaderboardTab({
  isDarkMode,
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
        
        // Priority 1: Check for any existing count fields on the user document
        const possibleFields = ["messageCount", "receivedMessagesCount", "receivedCount", "totalMessages", "whispersCount"];
        for (const field of possibleFields) {
          if (typeof data[field] === "number") {
            count = Math.max(count, data[field]);
          }
        }

        // Priority 2: Accurate server-side aggregation count from subcollection
        try {
          const msgCol = collection(db, "users", uid, "messages");
          const countSnap = await getCountFromServer(msgCol);
          const serverCount = countSnap.data().count;
          
          if (serverCount > 0) {
            count = Math.max(count, serverCount);
          } else {
            // If server count says 0, double check with a small limit query to see if it's a permission/sync issue
            const sampleSnap = await getDocs(query(msgCol, limit(1)));
            if (!sampleSnap.empty) {
              // If at least one exists, we might need to fetch all to be sure, 
              // but for performance, we'll just fetch the full collection size if it's small or use the snapshot size
              const fullSnap = await getDocs(msgCol);
              count = Math.max(count, fullSnap.size);
            }
          }
        } catch (countErr) {
          // If server aggregation fails, fetch collection documents directly as ultimate fallback
          try {
            const msgsSnap = await getDocs(collection(db, "users", uid, "messages"));
            count = Math.max(count, msgsSnap.size);
          } catch (err) {
            console.warn(`Could not count messages for ${data.username || uid}:`, err);
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
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-[400px]">
            <button
              type="button"
              onClick={() => setSelectedRankFilter("all")}
              className={cn(
                "px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center",
                selectedRankFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              All ({rankedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRankFilter("top10")}
              className={cn(
                "px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center",
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
                "px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[10px] sm:text-xs text-center",
                selectedRankFilter === "active"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              &ge; 1 Msg
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

      {/* UNIQUE ADMIN TOP 10 HONOR ROLL - REDESIGNED PODIUM STYLE */}
      {selectedRankFilter === "all" && !searchQuery && rankedUsers.length > 0 && (
        <div className="space-y-8 py-4">
          {/* Podium Row */}
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-6 max-w-4xl mx-auto pt-10 pb-4 px-2">
            {/* Rank 2 - Silver */}
            {rankedUsers[1] && (
              <div className="flex flex-col items-center group">
                <div className="relative mb-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-500 shadow-lg group-hover:scale-105 transition-transform">
                    <UserAvatar 
                      name={rankedUsers[1].displayName} 
                      username={rankedUsers[1].username}
                      photoURL={rankedUsers[1].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-lg shadow-sm">
                    🥈
                  </div>
                </div>
                <div className="text-center w-full">
                  <div className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate px-1">
                    @{rankedUsers[1].username}
                  </div>
                  <div className="font-black text-sm text-slate-500 dark:text-slate-400">
                    {rankedUsers[1].messageCount}
                  </div>
                </div>
                <div className="w-full h-16 sm:h-20 bg-slate-200/50 dark:bg-slate-800/50 rounded-t-2xl mt-2 border-x border-t border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-600 opacity-50">2</span>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {rankedUsers[0] && (
              <div className="flex flex-col items-center group -mt-8">
                <div className="relative mb-4 scale-110 sm:scale-125 origin-bottom">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform">
                    <UserAvatar 
                      name={rankedUsers[0].displayName} 
                      username={rankedUsers[0].username}
                      photoURL={rankedUsers[0].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-xl shadow-lg animate-bounce duration-1000">
                    👑
                  </div>
                </div>
                <div className="text-center w-full z-10">
                  <div className="font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400 truncate px-1 uppercase tracking-tight">
                    @{rankedUsers[0].username}
                  </div>
                  <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    {rankedUsers[0].messageCount}
                  </div>
                </div>
                <div className="w-full h-24 sm:h-32 bg-amber-400/10 dark:bg-amber-400/5 rounded-t-2xl mt-2 border-x border-t border-amber-400/40 relative overflow-hidden group shadow-[inset_0_2px_10px_rgba(251,191,36,0.1)] flex flex-col items-center justify-center">
                   <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent pointer-events-none" />
                   <span className="text-3xl sm:text-5xl font-black text-amber-500/30">1</span>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {rankedUsers[2] && (
              <div className="flex flex-col items-center group">
                <div className="relative mb-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-700/50 dark:border-amber-800/50 shadow-lg group-hover:scale-105 transition-transform">
                    <UserAvatar 
                      name={rankedUsers[2].displayName} 
                      username={rankedUsers[2].username}
                      photoURL={rankedUsers[2].photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-lg shadow-sm">
                    🥉
                  </div>
                </div>
                <div className="text-center w-full">
                  <div className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate px-1">
                    @{rankedUsers[2].username}
                  </div>
                  <div className="font-black text-sm text-amber-800 dark:text-amber-600">
                    {rankedUsers[2].messageCount}
                  </div>
                </div>
                <div className="w-full h-12 sm:h-16 bg-amber-900/10 dark:bg-amber-900/5 rounded-t-2xl mt-2 border-x border-t border-amber-900/20 dark:border-amber-900/30 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-900/20 dark:text-amber-900/30">3</span>
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
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-xs font-medium">No ranked users match the current filter.</p>
          </div>
        ) : viewMode === "list" ? (
          /* Table / List View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Admin Honor Badge</th>
                  <th className="py-2.5 px-3 text-right">Messages Received</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredUsers.slice(selectedRankFilter === "all" && !searchQuery ? 3 : 0).map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs",
                        u.rank === 1 ? "bg-amber-400 text-slate-950" :
                        u.rank === 2 ? "bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white" :
                        u.rank === 3 ? "bg-amber-700 text-white" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        #{u.rank}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          <UserAvatar 
                            name={u.displayName} 
                            username={u.username}
                            photoURL={u.photoURL} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {u.displayName || u.username}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {u.badge ? (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-black shadow-2xs",
                          u.badge.badgeBg,
                          u.badge.borderColor,
                          u.badge.textColor
                        )}>
                          <span>{u.badge.emoji}</span>
                          <span>{u.badge.title}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Standard Recipient
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {u.messageCount}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/u/${u.username}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredUsers.slice(selectedRankFilter === "all" && !searchQuery ? 3 : 0).map((u) => (
              <div
                key={u.uid}
                className={cn(
                  "group relative p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                  u.rank === 1 ? "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-500/30" :
                  u.rank === 2 ? "bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 border-slate-300 dark:border-slate-600" :
                  u.rank === 3 ? "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-900 border-orange-300 dark:border-orange-500/30" :
                  u.badge 
                    ? `bg-white dark:bg-slate-900 ${u.badge.borderColor}`
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                )}
              >
                {/* Background rank number decoration */}
                <div className="absolute -right-4 -top-8 text-8xl font-black text-slate-100 dark:text-slate-800/40 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  {u.rank}
                </div>

                {/* Header: Rank + Badge if any */}
                <div className="relative flex items-center justify-between gap-2 mb-4">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-xs shadow-sm",
                    u.rank === 1 ? "bg-amber-400 text-slate-950" :
                    u.rank === 2 ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" :
                    u.rank === 3 ? "bg-amber-700 text-white" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    <span>RANK</span>
                    <span>#{u.rank}</span>
                  </div>

                  {u.badge && (
                    <div className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl border shadow-xs animate-pulse-slow",
                      u.badge.badgeBg,
                      u.badge.borderColor,
                      u.badge.textColor
                    )}>
                      <span>{u.badge.emoji}</span>
                      <span className="uppercase tracking-wider">{u.badge.shortTitle}</span>
                    </div>
                  )}
                </div>

                {/* User Identity Info */}
                <div className="relative flex items-center gap-4 mb-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl overflow-hidden shrink-0 border shadow-md p-0.5 bg-white dark:bg-slate-800 transition-transform group-hover:rotate-3",
                    u.rank === 1 ? "border-amber-400 ring-4 ring-amber-400/10" :
                    u.rank === 2 ? "border-slate-300 ring-4 ring-slate-300/10" :
                    u.rank === 3 ? "border-amber-700/50 ring-4 ring-amber-700/10" :
                    "border-slate-100 dark:border-slate-700"
                  )}>
                    <UserAvatar 
                      name={u.displayName} 
                      username={u.username}
                      photoURL={u.photoURL} 
                      className="w-full h-full object-cover rounded-[14px]" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-base text-slate-900 dark:text-white truncate tracking-tight">
                      {u.displayName || u.username}
                    </h4>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                      @{u.username}
                    </p>
                    {u.email && (
                      <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                        {u.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Messages Received & Profile Link */}
                <div className="relative pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-xl">
                        {u.messageCount}
                      </span>
                      <span className="text-slate-400 text-[11px] font-bold">whispers</span>
                    </div>
                  </div>

                  <Link
                    to={`/u/${u.username}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 px-3.5 py-2 rounded-2xl transition-all shadow-xs active:scale-95"
                  >
                    <span>INSPECT</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
