export interface AdminLeaderboardBadge {
  rank: number;
  title: string;
  shortTitle: string;
  emoji: string;
  gradient: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
  isAdminExclusive: boolean;
}

export const ADMIN_TOP_10_BADGES: Record<number, AdminLeaderboardBadge> = {
  1: {
    rank: 1,
    title: "Apex Sovereign",
    shortTitle: "Apex #1",
    emoji: "👑",
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    badgeBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20",
    textColor: "text-amber-500 dark:text-amber-300",
    borderColor: "border-amber-400/60 dark:border-amber-500/60",
    glowColor: "shadow-amber-500/30",
    description: "System-wide highest message volume titan and #1 community recipient",
    isAdminExclusive: true
  },
  2: {
    rank: 2,
    title: "Diamond Luminary",
    shortTitle: "Diamond #2",
    emoji: "💎",
    gradient: "from-cyan-400 via-sky-500 to-blue-600",
    badgeBg: "bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-cyan-500/20",
    textColor: "text-cyan-500 dark:text-cyan-300",
    borderColor: "border-cyan-400/60 dark:border-cyan-500/60",
    glowColor: "shadow-cyan-500/30",
    description: "Premier volume vanguard holding #2 all-time incoming traffic",
    isAdminExclusive: true
  },
  3: {
    rank: 3,
    title: "Platinum Titan",
    shortTitle: "Titan #3",
    emoji: "🏆",
    gradient: "from-emerald-400 via-teal-500 to-emerald-600",
    badgeBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20",
    textColor: "text-emerald-500 dark:text-emerald-300",
    borderColor: "border-emerald-400/60 dark:border-emerald-500/60",
    glowColor: "shadow-emerald-500/30",
    description: "Elite podium medalist maintaining extraordinary user engagement",
    isAdminExclusive: true
  },
  4: {
    rank: 4,
    title: "Grandmaster Whisperer",
    shortTitle: "Grandmaster #4",
    emoji: "🌟",
    gradient: "from-orange-400 via-amber-500 to-orange-600",
    badgeBg: "bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20",
    textColor: "text-orange-500 dark:text-orange-300",
    borderColor: "border-orange-400/60 dark:border-orange-500/60",
    glowColor: "shadow-orange-500/30",
    description: "High-tier verified authority with massive community dialogue",
    isAdminExclusive: true
  },
  5: {
    rank: 5,
    title: "Flame Vanguard",
    shortTitle: "Vanguard #5",
    emoji: "🔥",
    gradient: "from-rose-500 via-red-500 to-pink-600",
    badgeBg: "bg-gradient-to-r from-rose-500/20 via-red-500/15 to-rose-500/20",
    textColor: "text-rose-500 dark:text-rose-300",
    borderColor: "border-rose-400/60 dark:border-rose-500/60",
    glowColor: "shadow-rose-500/30",
    description: "High-velocity momentum recipient driving peak conversational surges",
    isAdminExclusive: true
  },
  6: {
    rank: 6,
    title: "Velocity Sovereign",
    shortTitle: "Velocity #6",
    emoji: "⚡",
    gradient: "from-violet-500 via-purple-500 to-indigo-600",
    badgeBg: "bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-violet-500/20",
    textColor: "text-violet-500 dark:text-violet-300",
    borderColor: "border-violet-400/60 dark:border-violet-500/60",
    glowColor: "shadow-violet-500/30",
    description: "Dynamic feedback catalyst consistently operating in the upper echelon",
    isAdminExclusive: true
  },
  7: {
    rank: 7,
    title: "Mystic Oracle",
    shortTitle: "Oracle #7",
    emoji: "🔮",
    gradient: "from-indigo-500 via-blue-600 to-purple-600",
    badgeBg: "bg-gradient-to-r from-indigo-500/20 via-blue-500/15 to-indigo-500/20",
    textColor: "text-indigo-500 dark:text-indigo-300",
    borderColor: "border-indigo-400/60 dark:border-indigo-500/60",
    glowColor: "shadow-indigo-500/30",
    description: "Deep anonymous network node receiving steady high-volume whispers",
    isAdminExclusive: true
  },
  8: {
    rank: 8,
    title: "Sentinel Prime",
    shortTitle: "Sentinel #8",
    emoji: "🛡️",
    gradient: "from-teal-400 via-cyan-500 to-teal-600",
    badgeBg: "bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-teal-500/20",
    textColor: "text-teal-500 dark:text-teal-300",
    borderColor: "border-teal-400/60 dark:border-teal-500/60",
    glowColor: "shadow-teal-500/30",
    description: "Steadfast engagement anchor commanding reliable daily whispers",
    isAdminExclusive: true
  },
  9: {
    rank: 9,
    title: "Aurora Envoy",
    shortTitle: "Aurora #9",
    emoji: "✨",
    gradient: "from-fuchsia-500 via-pink-500 to-purple-600",
    badgeBg: "bg-gradient-to-r from-fuchsia-500/20 via-pink-500/15 to-fuchsia-500/20",
    textColor: "text-fuchsia-500 dark:text-fuchsia-300",
    borderColor: "border-fuchsia-400/60 dark:border-fuchsia-500/60",
    glowColor: "shadow-fuchsia-500/30",
    description: "Cosmic engagement luminary maintaining impressive feedback volume",
    isAdminExclusive: true
  },
  10: {
    rank: 10,
    title: "Elite Centurion",
    shortTitle: "Centurion #10",
    emoji: "🎖️",
    gradient: "from-slate-600 via-indigo-600 to-slate-700",
    badgeBg: "bg-gradient-to-r from-slate-500/20 via-indigo-500/15 to-slate-500/20",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-400/60 dark:border-slate-500/60",
    glowColor: "shadow-slate-500/30",
    description: "Top-10 milestone achiever sealing the platform honor vanguard",
    isAdminExclusive: true
  }
};

export function getAdminTop10Badge(rank: number): AdminLeaderboardBadge | null {
  return ADMIN_TOP_10_BADGES[rank] || null;
}
