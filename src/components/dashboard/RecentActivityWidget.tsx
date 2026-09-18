import React, { useMemo } from "react";
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  ArrowUpRight, 
  Activity,
  Zap,
  CheckCircle,
  ShieldCheck
} from "lucide-react";
import { Message } from "../../pages/Dashboard";
import { cn } from "../../lib/utils";

interface RecentActivityWidgetProps {
  messages: Message[];
  onNavigateToInbox: (filter?: string) => void;
}

export default function RecentActivityWidget({
  messages,
  onNavigateToInbox
}: RecentActivityWidgetProps) {
  // Helper to safely extract timestamp in ms
  const getMsgTimestamp = (msg: Message): number => {
    if (!msg.createdAt) return 0;
    if (typeof msg.createdAt.toMillis === "function") return msg.createdAt.toMillis();
    if (typeof msg.createdAt.seconds === "number") return msg.createdAt.seconds * 1000;
    if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
    if (typeof msg.createdAt === "number") return msg.createdAt;
    const parsed = new Date(msg.createdAt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const activityMetrics = useMemo(() => {
    const now = new Date();
    
    // Start of Today (00:00:00.000)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Start of Yesterday (00:00:00.000 yesterday)
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    
    // Start of This Week (Past 7 days rolling or since beginning of week)
    const startOfWeek = startOfToday - (6 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let yesterdayCount = 0;
    let thisWeekCount = 0;
    let readCount = 0;
    let unreadCount = 0;
    let latestMsgTime = 0;

    messages.forEach((msg) => {
      const time = getMsgTimestamp(msg);
      if (time > latestMsgTime) latestMsgTime = time;

      if (time >= startOfToday) {
        todayCount++;
      } else if (time >= startOfYesterday && time < startOfToday) {
        yesterdayCount++;
      }

      if (time >= startOfWeek) {
        thisWeekCount++;
      }

      if (msg.read) {
        readCount++;
      } else {
        unreadCount++;
      }
    });

    const totalCount = messages.length;
    const maxDayCount = Math.max(1, Math.max(todayCount, yesterdayCount, Math.round(thisWeekCount / 4)));

    // Trend calculation
    let trendLabel = "Steady";
    let trendDirection: "up" | "down" | "neutral" = "neutral";
    if (todayCount > yesterdayCount) {
      trendLabel = `+${todayCount - yesterdayCount} more than yesterday`;
      trendDirection = "up";
    } else if (todayCount < yesterdayCount && yesterdayCount > 0) {
      trendLabel = `${yesterdayCount - todayCount} fewer than yesterday`;
      trendDirection = "down";
    } else if (todayCount > 0 && yesterdayCount === 0) {
      trendLabel = "Surge today";
      trendDirection = "up";
    }

    return {
      today: todayCount,
      yesterday: yesterdayCount,
      thisWeek: thisWeekCount,
      total: totalCount,
      read: readCount,
      unread: unreadCount,
      trendLabel,
      trendDirection,
      latestMsgTime,
      maxDayCount
    };
  }, [messages]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header: Title & Total Analytics Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>Recent Activity</span>
              {activityMetrics.today > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Message frequency & momentum tracker
            </p>
          </div>
        </div>

        {/* Encrypted Activity Status Badge */}
        <div 
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-bold">Encrypted Logs</span>
        </div>
      </div>

      {/* 3 Quick Count Metric Cards: Today, Yesterday, This Week */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Today Card */}
        <div 
          onClick={() => onNavigateToInbox("TODAY")}
          className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Today
            </span>
            <Zap className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activityMetrics.today}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">new</span>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.round((activityMetrics.today / activityMetrics.maxDayCount) * 100))}%` 
              }} 
            />
          </div>
        </div>

        {/* Yesterday Card */}
        <div 
          onClick={() => onNavigateToInbox()}
          className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yesterday
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activityMetrics.yesterday}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">msgs</span>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.round((activityMetrics.yesterday / activityMetrics.maxDayCount) * 100))}%` 
              }} 
            />
          </div>
        </div>

        {/* This Week Card */}
        <div 
          onClick={() => onNavigateToInbox()}
          className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-purple-600 dark:text-purple-400">
              This Week
            </span>
            <Calendar className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activityMetrics.thisWeek}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">total</span>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-purple-600 h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.round((activityMetrics.thisWeek / Math.max(1, activityMetrics.total)) * 100))}%` 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Momentum & Total Messages Analytics Row */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-800/60 dark:via-indigo-950/30 dark:to-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className={cn(
            "w-4 h-4 shrink-0",
            activityMetrics.trendDirection === "up" ? "text-emerald-500" : "text-indigo-500"
          )} />
          <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
            {activityMetrics.trendLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-extrabold text-slate-900 dark:text-white font-mono">
              {activityMetrics.total}
            </span>
            <span className="text-[11px]">all-time</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToInbox()}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Inbox</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
