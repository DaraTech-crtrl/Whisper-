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
import { collection, getDocs, getCountFromServer } from "firebase/firestore";
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
        try {
          const countSnap = await getCountFromServer(collection(db, "users", uid, "messages"));
          count = countSnap.data().count;
        } catch (countErr) {
          // If server aggregation fails, fetch collection documents directly
          try {
            const msgsSnap = await getDocs(collection(db, "users", uid, "messages"));
            count = msgsSnap.size;
          } catch (err) {
            console.warn(`Could not count messages for ${data.username || uid}:`, err);
            count = 0;
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

  // Total Analytics Computations
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

  // Filtered List
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
              Admin Exclusive Badges
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global whisper volume rankings with exclusive administrative honor badges assigned to the top 10 recipients.
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
            <span>Sync Volume</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Total Messages Analytics Cards (4 Key Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Messages */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total Messages
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalMessagesAnalytics.totalMsgs.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            System-wide encrypted whispers
          </p>
        </div>

        {/* Active Recipients */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Recipients
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalMessagesAnalytics.activeRecipients}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Users with &ge; 1 whisper received
          </p>
        </div>

        {/* Average Per User */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Avg Per User
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalMessagesAnalytics.avgMsgs}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Average inbox density
          </p>
        </div>

        {/* Top Recipient (#1 Apex) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              #1 Apex Sovereign
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-500 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
            {totalMessagesAnalytics.topRecipient ? `@${totalMessagesAnalytics.topRecipient.username}` : "None"}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
            {totalMessagesAnalytics.topRecipient?.messageCount || 0} whispers received
          </p>
        </div>
      </div>

      {/* UNIQUE ADMIN TOP 10 HONOR BADGES SECTION */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Admin-Exclusive Top 10 Honor Roll Badges</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These 10 custom badges are uniquely minted and exclusively accessible here on the Administrator Console.
            </p>
          </div>

          <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 font-bold">
            10 Unique Distinction Badges
          </span>
        </div>

        {/* 10 Badges Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((rank) => {
            const badge = ADMIN_TOP_10_BADGES[rank];
            const recipient = rankedUsers.find(u => u.rank === rank && u.messageCount > 0);

            return (
              <div
                key={rank}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group shadow-2xs",
                  recipient
                    ? `bg-white dark:bg-slate-900 ${badge.borderColor} hover:shadow-md`
                    : "bg-slate-100/60 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700 opacity-70"
                )}
              >
                {/* Top Accent Rim */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", badge.gradient)} />

                <div>
                  {/* Badge Header: Rank & Emoji */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-black text-slate-400">
                      Rank #{badge.rank}
                    </span>
                    <span className="text-xl" title={badge.title}>
                      {badge.emoji}
                    </span>
                  </div>

                  {/* Badge Title */}
                  <h4 className={cn("text-xs font-black tracking-tight", badge.textColor)}>
                    {badge.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                    {badge.description}
                  </p>
                </div>

                {/* Recipient User Section */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  {recipient ? (
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          <UserAvatar 
                            name={recipient.displayName} 
                            username={recipient.username}
                            photoURL={recipient.photoURL} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          @{recipient.username}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded shrink-0">
                        {recipient.messageCount}m
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      Vacant (Awaiting activity)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RANKINGS DIRECTORY & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Search, Filter and View Mode Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ranked users..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSelectedRankFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  selectedRankFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                All ({rankedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRankFilter("top10")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  selectedRankFilter === "top10"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Top 10 Badges
              </button>
              <button
                type="button"
                onClick={() => setSelectedRankFilter("active")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  selectedRankFilter === "active"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                &ge; 1 Msg
              </button>
            </div>

            {/* List / Cards View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "cards" 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs" 
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "list" 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs" 
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Table/List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* User Items: List or Cards View */}
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No ranked users match the current filter.
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
                {filteredUsers.map((u) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.map((u) => (
              <div
                key={u.uid}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs",
                  u.badge 
                    ? `bg-white dark:bg-slate-900 ${u.badge.borderColor}`
                    : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
                )}
              >
                {/* Header: Rank + Badge if any */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={cn(
                    "w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center",
                    u.rank === 1 ? "bg-amber-400 text-slate-950" :
                    u.rank === 2 ? "bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white" :
                    u.rank === 3 ? "bg-amber-700 text-white" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    #{u.rank}
                  </span>

                  {u.badge && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border",
                      u.badge.badgeBg,
                      u.badge.borderColor,
                      u.badge.textColor
                    )}>
                      <span>{u.badge.emoji}</span>
                      <span>{u.badge.shortTitle}</span>
                    </span>
                  )}
                </div>

                {/* User Identity Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <UserAvatar 
                      name={u.displayName} 
                      username={u.username}
                      photoURL={u.photoURL} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {u.displayName || u.username}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      @{u.username}
                    </p>
                    {u.email && (
                      <p className="text-[10px] text-slate-400 truncate font-mono">
                        {u.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Messages Received & Profile Link */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm mr-1">
                      {u.messageCount}
                    </span>
                    <span className="text-slate-400 text-[11px]">whispers</span>
                  </div>

                  <Link
                    to={`/u/${u.username}`}
                    target="_blank"
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl"
                  >
                    <span>Inspect</span>
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
