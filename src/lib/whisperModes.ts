export type WhisperModeId =
  | "anonymous"
  | "confess"
  | "about"
  | "ask"
  | "opinion"
  | "crush"
  | "compliment"
  | "roast";

export interface WhisperMode {
  id: WhisperModeId;
  name: string;
  icon: string;
  pathPrefix: string;
  badge: string;
  purpose: string;
  description: string;
  prompt: string;
  placeholder: string;
  examplePrompts: string[];
  gradient: string;
  cardBg: string;
  glowColor: string;
  accentText: string;
  accentBg: string;
  cardBorder: string;
  tagLabel: string;
  themeStyle: "obsidian" | "neon" | "velvet" | "sunset" | "cyberpunk";
  publicBg: string;
  successTitle: string;
  successMessage: (username: string) => string;
  // Message feed preview & modal theme styles
  msgBorder: string;
  msgUnreadBg: string;
  msgBadgeBg: string;
  msgModalBorder: string;
  msgModalBadge: string;
}

export const WHISPER_MODES: WhisperMode[] = [
  {
    id: "anonymous",
    name: "Anonymous",
    icon: "🤫",
    pathPrefix: "u",
    badge: "Classic Whisper",
    purpose: "The normal Whisper experience.",
    description: "Receive anonymous messages from anyone.",
    prompt: "Send me an anonymous whisper...",
    placeholder: "Send me an anonymous message...",
    examplePrompts: [
      "Send me an anonymous message...",
      "Tell me a secret you've never told anyone",
      "What's on your mind right now?"
    ],
    gradient: "from-indigo-600 via-indigo-700 to-purple-800",
    cardBg: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800",
    glowColor: "rgba(99, 102, 241, 0.35)",
    accentText: "text-indigo-400",
    accentBg: "bg-indigo-600",
    cardBorder: "border-indigo-500/30",
    tagLabel: "Secret Whisper",
    themeStyle: "obsidian",
    publicBg: "from-slate-950 via-indigo-950/40 to-slate-950",
    successTitle: "Whisper Sent!",
    successMessage: (username: string) => `Your anonymous, encrypted message is on its way to @${username}.`,
    msgBorder: "border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-700",
    msgUnreadBg: "bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-300/80 dark:border-indigo-800/80",
    msgBadgeBg: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80",
    msgModalBorder: "from-purple-400 via-indigo-500 to-sky-400",
    msgModalBadge: "from-indigo-500/30 to-purple-500/30 border-purple-400/40 text-purple-200"
  },
  {
    id: "confess",
    name: "Confessions",
    icon: "🫣",
    pathPrefix: "confess",
    badge: "Confession Box",
    purpose: "A dedicated anonymous confession page.",
    description: "Give people a place to anonymously confess something.",
    prompt: "Tell me something you’ve always wanted to say.",
    placeholder: "I have a confession to make...",
    examplePrompts: [
      "Tell me something you've always wanted to say.",
      "Confess a secret you hid from me.",
      "What is something you never had the courage to say?"
    ],
    gradient: "from-purple-700 via-purple-900 to-pink-900",
    cardBg: "bg-gradient-to-br from-purple-700 via-purple-900 to-pink-900",
    glowColor: "rgba(217, 70, 239, 0.35)",
    accentText: "text-pink-400",
    accentBg: "bg-pink-600",
    cardBorder: "border-pink-500/30",
    tagLabel: "Confession",
    themeStyle: "neon",
    publicBg: "from-slate-950 via-purple-950/50 to-pink-950/40",
    successTitle: "Confession Delivered!",
    successMessage: (username: string) => `Your anonymous confession is safely encrypted and delivered to @${username}.`,
    msgBorder: "border-pink-200/80 dark:border-pink-900/60 hover:border-pink-400 dark:hover:border-pink-700",
    msgUnreadBg: "bg-pink-50/70 dark:bg-pink-950/25 border-pink-300/80 dark:border-pink-800/80",
    msgBadgeBg: "bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/80",
    msgModalBorder: "from-fuchsia-500 via-pink-600 to-purple-600",
    msgModalBadge: "from-pink-500/30 to-fuchsia-500/30 border-pink-400/40 text-pink-200"
  },
  {
    id: "about",
    name: "One Thing About Me",
    icon: "👀",
    pathPrefix: "about",
    badge: "Perception Check",
    purpose: "People anonymously tell the profile owner one thing about themselves.",
    description: "Find out what people really think about you.",
    prompt: "Tell me one thing about me that you like, dislike, or think I should know.",
    placeholder: "One thing about you that I notice is...",
    examplePrompts: [
      "One thing you like about me?",
      "One thing you dislike about me?",
      "One thing I should know?"
    ],
    gradient: "from-blue-700 via-indigo-800 to-violet-900",
    cardBg: "bg-gradient-to-br from-blue-700 via-indigo-800 to-violet-900",
    glowColor: "rgba(139, 92, 246, 0.35)",
    accentText: "text-violet-400",
    accentBg: "bg-violet-600",
    cardBorder: "border-violet-500/30",
    tagLabel: "One Thing",
    themeStyle: "obsidian",
    publicBg: "from-slate-950 via-blue-950/40 to-violet-950/40",
    successTitle: "Feedback Sent!",
    successMessage: (username: string) => `Your anonymous thought about @${username} has been safely delivered.`,
    msgBorder: "border-violet-200/80 dark:border-violet-900/60 hover:border-violet-400 dark:hover:border-violet-700",
    msgUnreadBg: "bg-violet-50/70 dark:bg-violet-950/25 border-violet-300/80 dark:border-violet-800/80",
    msgBadgeBg: "bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/80",
    msgModalBorder: "from-blue-500 via-indigo-600 to-violet-500",
    msgModalBadge: "from-blue-500/30 to-violet-500/30 border-violet-400/40 text-violet-200"
  },
  {
    id: "ask",
    name: "Ask Me Anything",
    icon: "❓",
    pathPrefix: "ask",
    badge: "AMA Edition",
    purpose: "Anonymous questions.",
    description: "Ask me anything without revealing who you are.",
    prompt: "Ask me anything without holding back.",
    placeholder: "What is something you want to ask me?",
    examplePrompts: [
      "Ask me anything.",
      "What question have you always wanted to ask?",
      "Ask me for advice or an honest answer!"
    ],
    gradient: "from-cyan-700 via-teal-800 to-blue-900",
    cardBg: "bg-gradient-to-br from-cyan-700 via-teal-800 to-blue-900",
    glowColor: "rgba(6, 182, 212, 0.35)",
    accentText: "text-cyan-400",
    accentBg: "bg-cyan-600",
    cardBorder: "border-cyan-500/30",
    tagLabel: "AMA Question",
    themeStyle: "cyberpunk",
    publicBg: "from-slate-950 via-cyan-950/40 to-blue-950/40",
    successTitle: "Question Submitted!",
    successMessage: (username: string) => `Your anonymous question is on its way to @${username}.`,
    msgBorder: "border-cyan-200/80 dark:border-cyan-900/60 hover:border-cyan-400 dark:hover:border-cyan-700",
    msgUnreadBg: "bg-cyan-50/70 dark:bg-cyan-950/25 border-cyan-300/80 dark:border-cyan-800/80",
    msgBadgeBg: "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80",
    msgModalBorder: "from-teal-400 via-cyan-500 to-blue-500",
    msgModalBadge: "from-teal-500/30 to-cyan-500/30 border-cyan-400/40 text-cyan-200"
  },
  {
    id: "opinion",
    name: "Honest Opinion",
    icon: "💭",
    pathPrefix: "opinion",
    badge: "Truth Mirror",
    purpose: "Anonymous opinions and feedback.",
    description: "Get honest opinions from the people around you.",
    prompt: "What is your 100% honest opinion of me?",
    placeholder: "My honest opinion of you is...",
    examplePrompts: [
      "What is your honest opinion of me?",
      "What should I improve?",
      "What was your first impression of me?"
    ],
    gradient: "from-indigo-800 via-blue-900 to-cyan-900",
    cardBg: "bg-gradient-to-br from-indigo-800 via-blue-900 to-cyan-900",
    glowColor: "rgba(99, 102, 241, 0.35)",
    accentText: "text-indigo-300",
    accentBg: "bg-indigo-600",
    cardBorder: "border-indigo-400/30",
    tagLabel: "Honest Opinion",
    themeStyle: "obsidian",
    publicBg: "from-slate-950 via-indigo-950/50 to-slate-950",
    successTitle: "Opinion Delivered!",
    successMessage: (username: string) => `Your honest opinion was encrypted and sent anonymously to @${username}.`,
    msgBorder: "border-sky-200/80 dark:border-sky-900/60 hover:border-sky-400 dark:hover:border-sky-700",
    msgUnreadBg: "bg-sky-50/70 dark:bg-sky-950/25 border-sky-300/80 dark:border-sky-800/80",
    msgBadgeBg: "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80",
    msgModalBorder: "from-indigo-500 via-blue-600 to-cyan-500",
    msgModalBadge: "from-indigo-500/30 to-sky-500/30 border-sky-400/40 text-sky-200"
  },
  {
    id: "crush",
    name: "Crush",
    icon: "❤️",
    pathPrefix: "crush",
    badge: "Secret Admirer",
    purpose: "Anonymous romantic/crush messages.",
    description: "Find out what people secretly think about you.",
    prompt: "Do you have a crush on me? Tell me secretly.",
    placeholder: "I've secretly had a crush on you because...",
    examplePrompts: [
      "Do you have a crush on me?",
      "Leave a hint about who you are!",
      "What made you secretly like me?"
    ],
    gradient: "from-pink-700 via-rose-800 to-purple-900",
    cardBg: "bg-gradient-to-br from-pink-700 via-rose-800 to-purple-900",
    glowColor: "rgba(244, 63, 94, 0.35)",
    accentText: "text-rose-400",
    accentBg: "bg-rose-600",
    cardBorder: "border-rose-500/30",
    tagLabel: "Secret Crush",
    themeStyle: "velvet",
    publicBg: "from-slate-950 via-pink-950/40 to-rose-950/40",
    successTitle: "Crush Note Sent!",
    successMessage: (username: string) => `Your secret crush whisper is safely delivered to @${username} ❤️`,
    msgBorder: "border-rose-200/80 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700",
    msgUnreadBg: "bg-rose-50/70 dark:bg-rose-950/25 border-rose-300/80 dark:border-rose-800/80",
    msgBadgeBg: "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80",
    msgModalBorder: "from-rose-500 via-pink-600 to-purple-600",
    msgModalBadge: "from-rose-500/30 to-pink-500/30 border-rose-400/40 text-rose-200"
  },
  {
    id: "compliment",
    name: "Compliments",
    icon: "💌",
    pathPrefix: "compliment",
    badge: "Kind Words",
    purpose: "Anonymous compliments.",
    description: "Send me a compliment without revealing yourself.",
    prompt: "Send me a sweet compliment anonymously.",
    placeholder: "Something wonderful about you is...",
    examplePrompts: [
      "Send me a compliment without revealing yourself.",
      "What is your favorite memory or quality about me?",
      "Drop some positivity!"
    ],
    gradient: "from-rose-600 via-pink-600 to-amber-700",
    cardBg: "bg-gradient-to-br from-rose-600 via-pink-600 to-amber-700",
    glowColor: "rgba(251, 113, 133, 0.35)",
    accentText: "text-pink-300",
    accentBg: "bg-pink-600",
    cardBorder: "border-pink-400/30",
    tagLabel: "Compliment",
    themeStyle: "sunset",
    publicBg: "from-slate-950 via-rose-950/40 to-amber-950/30",
    successTitle: "Compliment Sent!",
    successMessage: (username: string) => `Your kind compliment is on its way to brighten @${username}'s day! ✨`,
    msgBorder: "border-amber-200/80 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700",
    msgUnreadBg: "bg-amber-50/70 dark:bg-amber-950/25 border-amber-300/80 dark:border-amber-800/80",
    msgBadgeBg: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80",
    msgModalBorder: "from-amber-400 via-rose-500 to-pink-500",
    msgModalBadge: "from-amber-500/30 to-pink-500/30 border-amber-400/40 text-amber-200"
  },
  {
    id: "roast",
    name: "Roast Me",
    icon: "🔥",
    pathPrefix: "roast",
    badge: "No Filter",
    purpose: "Anonymous humorous roasts.",
    description: "Give me your funniest anonymous roast.",
    prompt: "Give me your funniest anonymous roast.",
    placeholder: "My best roast for you is...",
    examplePrompts: [
      "Give me your funniest anonymous roast.",
      "Don't hold back, roast me!",
      "What is my most roast-worthy habit?"
    ],
    gradient: "from-amber-600 via-orange-700 to-purple-900",
    cardBg: "bg-gradient-to-br from-amber-600 via-orange-700 to-purple-900",
    glowColor: "rgba(249, 115, 22, 0.35)",
    accentText: "text-orange-400",
    accentBg: "bg-orange-600",
    cardBorder: "border-orange-500/30",
    tagLabel: "Roast",
    themeStyle: "sunset",
    publicBg: "from-slate-950 via-orange-950/40 to-purple-950/40",
    successTitle: "Roast Fired!",
    successMessage: (username: string) => `Your spicy roast has been delivered anonymously to @${username} 🔥`,
    msgBorder: "border-orange-200/80 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-700",
    msgUnreadBg: "bg-orange-50/70 dark:bg-orange-950/25 border-orange-300/80 dark:border-orange-800/80",
    msgBadgeBg: "bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/80",
    msgModalBorder: "from-amber-500 via-orange-600 to-purple-600",
    msgModalBadge: "from-orange-500/30 to-amber-500/30 border-orange-400/40 text-orange-200"
  }
];

export function getModeByPathPrefix(pathPrefix: string): WhisperMode {
  const normalized = pathPrefix.toLowerCase().replace(/^\//, "").replace(/\/$/, "");
  const found = WHISPER_MODES.find(m => m.pathPrefix.toLowerCase() === normalized);
  return found || WHISPER_MODES[0];
}

export function getModeById(id: string): WhisperMode {
  const found = WHISPER_MODES.find(m => m.id === id);
  return found || WHISPER_MODES[0];
}

export function getMessageMode(msg: { mode?: string; tags?: string[]; category?: string } | null | undefined): WhisperMode {
  if (!msg) return WHISPER_MODES[0];
  
  if (msg.mode) {
    const byId = WHISPER_MODES.find(m => m.id === msg.mode || m.pathPrefix === msg.mode);
    if (byId) return byId;
  }
  
  if (Array.isArray(msg.tags)) {
    for (const tag of msg.tags) {
      const byTag = WHISPER_MODES.find(m => m.id === tag || m.tagLabel.toLowerCase() === tag.toLowerCase());
      if (byTag) return byTag;
    }
  }

  if (msg.category) {
    const byCategory = WHISPER_MODES.find(m => m.tagLabel.toLowerCase() === msg.category?.toLowerCase() || m.name.toLowerCase() === msg.category?.toLowerCase());
    if (byCategory) return byCategory;
  }
  
  return WHISPER_MODES[0];
}

export function getModeUrl(mode: WhisperMode, username: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/${mode.pathPrefix}/${encodeURIComponent(username)}`;
}

export function getModeDisplayPath(mode: WhisperMode, username: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.host : "whisper.runflix.name.ng");
  // Clean host (remove https:// or trailing slashes if present)
  const cleanHost = base.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${cleanHost}/${mode.pathPrefix}/${username}`;
}
