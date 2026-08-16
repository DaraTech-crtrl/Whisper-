import React, { useState, useEffect, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { decryptMessage } from "../lib/crypto";
import { 
  Copy, 
  Share2, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Edit3, 
  Settings, 
  Inbox, 
  X, 
  Download, 
  Image as ImageIcon, 
  QrCode, 
  Clock, 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  Award, 
  Lock,
  Archive,
  ArchiveRestore,
  Tag as TagIcon,
  CheckSquare,
  Square,
  CheckCheck,
  Mail,
  Filter,
  Plus,
  ArrowUpDown,
  HelpCircle,
  Globe,
  MapPin,
  Smartphone,
  Monitor,
  Search,
  Info
} from "lucide-react";
import { SenderHint, getFallbackSenderHint } from "../lib/senderHint";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { generateShareImageBlob } from "../lib/canvasImage";
import EmptyState from "../components/EmptyState";
import localforage from "localforage";

export interface Message {
  id: string;
  senderId?: string;
  receiverId?: string;
  encryptedContent: string;
  createdAt: any;
  read: boolean;
  isFlagged: boolean;
  reaction?: string;
  rating?: number;
  mood?: string;
  unlocksAt?: any;
  archived?: boolean;
  archivedAt?: any;
  tags?: string[];
  senderHint?: SenderHint;
}

export type SortOption = "newest" | "oldest" | "most_rated";

export const PRESET_TAGS: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  Favorites: { label: "Favorites", icon: "⭐", bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  Urgent: { label: "Urgent", icon: "🚨", bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  Personal: { label: "Personal", icon: "💜", bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  Ideas: { label: "Ideas", icon: "💡", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  Compliments: { label: "Compliments", icon: "✨", bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/30" },
  Work: { label: "Work", icon: "💼", bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
};

export default function Dashboard() {
  const { user, dbUser, privateKey } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [senderReputations, setSenderReputations] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  
  // Sub-inbox view, sorting & filters
  const [inboxView, setInboxView] = useState<"active" | "archived">("active");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL"); // ALL | UNREAD | tag_name
  const [sortBy, setSortBy] = useState<SortOption>("newest"); // newest | oldest | most_rated
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagMenuOpen, setBulkTagMenuOpen] = useState(false);
  const [activeTagPickerMsgId, setActiveTagPickerMsgId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(dbUser?.displayName || "");
  const [bio, setBio] = useState(dbUser?.bio || "");
  const [theme, setTheme] = useState(dbUser?.theme || "default");
  const [messageExpiryHours, setMessageExpiryHours] = useState<number>(dbUser?.messageExpiryHours || 0);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeHintMsg, setActiveHintMsg] = useState<Message | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(dbUser?.onboardingCompleted !== true);
  
  const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😲', '🥺', '🙏'];

  // Helper to calculate days remaining before 30-day permanent deletion in Archive
  const getArchiveDaysRemaining = (msg: Message) => {
    const archiveTimeMs = msg.archivedAt?.seconds 
      ? msg.archivedAt.seconds * 1000 
      : (msg.archivedAt?.toDate ? msg.archivedAt.toDate().getTime() : (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now()));
    const elapsedMs = Date.now() - archiveTimeMs;
    const remainingMs = (30 * 24 * 60 * 60 * 1000) - elapsedMs;
    const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };
  
  // Re-run check every minute to auto-archive, delete, or decrypt time-capsules
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(m => [...m]); // trigger re-render
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.title = "Inbox & Dashboard — Whisper";
    if (!user) return;
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const msgCol = collection(db, "users", user.uid, "messages");
    const cacheKey = `whisper_msgs_${user.uid}`;

    // 1. Load from cache immediately for instant display
    localforage.getItem<Message[]>(cacheKey).then((cachedMsgs) => {
      if (cachedMsgs && cachedMsgs.length > 0) {
        setMessages(cachedMsgs);
      }
    }).catch(console.error);

    // 2. Set up realtime listener
    const unsub = onSnapshot(msgCol, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });

      // Sort by newest first (handles pending server timestamps gracefully)
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now());
        return timeB - timeA;
      });

      const currentExpiry = Number(dbUser?.messageExpiryHours || 0);
      const activatedAtMs = dbUser?.messageExpiryActivatedAt?.seconds 
        ? dbUser.messageExpiryActivatedAt.seconds * 1000 
        : (dbUser?.messageExpiryActivatedAt?.toDate ? dbUser.messageExpiryActivatedAt.toDate().getTime() : null);

      const now = Date.now();
      const ARCHIVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days = 720 hours

      // Process messages:
      // 1. Archive Retention: Permanently delete messages that have spent 30+ days in Archive
      // 2. Self-Destruct / Auto-Archive: Move active messages to Archive only if received at/after activation
      msgs.forEach(m => {
        const msgCreatedAtMs = m.createdAt?.seconds 
          ? m.createdAt.seconds * 1000 
          : (m.createdAt?.toDate ? m.createdAt.toDate().getTime() : null);

        // 1. 30-Day Permanent Deletion for all archived messages
        if (m.archived) {
          const archiveTimeMs = m.archivedAt?.seconds 
            ? m.archivedAt.seconds * 1000 
            : (m.archivedAt?.toDate ? m.archivedAt.toDate().getTime() : (msgCreatedAtMs || now));
          
          if (now - archiveTimeMs >= ARCHIVE_RETENTION_MS) {
            deleteDoc(doc(db, "users", user.uid, "messages", m.id)).catch(console.error);
          }
          return;
        }

        // 2. Auto-Archive for Active messages under self-destruction rule
        // Rule: Only applies to messages received after the setting was activated!
        if (currentExpiry > 0 && activatedAtMs && msgCreatedAtMs) {
          // Only affect messages created at or after the activation timestamp
          if (msgCreatedAtMs >= activatedAtMs) {
            const hoursSinceCreation = (now - msgCreatedAtMs) / (1000 * 60 * 60);
            if (hoursSinceCreation >= currentExpiry) {
              // Automatically send to Archive with timestamp
              updateDoc(doc(db, "users", user.uid, "messages", m.id), {
                archived: true,
                archivedAt: serverTimestamp()
              }).catch(console.error);
            }
          }
        }
      });

      setMessages(msgs);
      localforage.setItem(cacheKey, msgs).catch(console.error);
    }, (error) => {
      console.error("Realtime message subscription error:", error);
    });

    return () => unsub();
  }, [user, dbUser?.messageExpiryHours, dbUser?.messageExpiryActivatedAt]);

  useEffect(() => {
    messages.forEach(msg => {
      const isLocked = msg.unlocksAt && msg.unlocksAt.seconds * 1000 > Date.now();
      if (!isLocked && !decryptedCache[msg.id] && privateKey && msg.encryptedContent) {
        decryptMessage(privateKey, msg.encryptedContent).then(pl => {
          setDecryptedCache(prev => ({ ...prev, [msg.id]: pl }));
        });
      }
    });

    // Fetch and populate sender reputations
    const unmetSenderIds = [...new Set(messages.map(m => m.senderId).filter(Boolean))]
      .filter(id => senderReputations[id as string] === undefined);

    if (unmetSenderIds.length > 0) {
      unmetSenderIds.forEach(async (id) => {
        try {
          const d = await getDoc(doc(db, "anonymousUsers", id as string));
          setSenderReputations(prev => ({ 
            ...prev, 
            [id as string]: d.exists() ? (d.data().reputation || 0) : 0 
          }));
        } catch(e) {}
      });
    }
  }, [messages, privateKey]);

  // Filter messages based on Active vs Archived and Tag filter
  const displayedMessages = useMemo(() => {
    return messages.filter(msg => {
      // 1. Archive filter
      const isArchived = Boolean(msg.archived);
      if (inboxView === "active" && isArchived) return false;
      if (inboxView === "archived" && !isArchived) return false;

      // 2. Tag / Read filter
      if (selectedTagFilter === "ALL") return true;
      if (selectedTagFilter === "UNREAD") return !msg.read;
      return msg.tags && msg.tags.includes(selectedTagFilter);
    });
  }, [messages, inboxView, selectedTagFilter]);

  const sortedMessages = useMemo(() => {
    const getMsgTime = (m: Message) => {
      if (m.createdAt?.seconds) return m.createdAt.seconds * 1000;
      if (m.createdAt?.toDate) return m.createdAt.toDate().getTime();
      if (typeof m.createdAt === 'number') return m.createdAt;
      return 0;
    };

    const getMsgReputationOrRating = (m: Message) => {
      if (m.senderId && senderReputations[m.senderId] !== undefined) {
        return senderReputations[m.senderId];
      }
      if (typeof m.rating === 'number') return m.rating;
      return 0;
    };

    return [...displayedMessages].sort((a, b) => {
      if (sortBy === "oldest") {
        const timeA = getMsgTime(a);
        const timeB = getMsgTime(b);
        return timeA - timeB;
      }

      if (sortBy === "most_rated") {
        const repA = getMsgReputationOrRating(a);
        const repB = getMsgReputationOrRating(b);
        if (repA !== repB) return repB - repA; // Highest rated first
        // Secondary tie-breaker by newest
        return getMsgTime(b) - getMsgTime(a);
      }

      // Default "newest"
      const timeA = getMsgTime(a);
      const timeB = getMsgTime(b);
      return timeB - timeA;
    });
  }, [displayedMessages, sortBy, senderReputations]);

  // Counts
  const activeCount = useMemo(() => messages.filter(m => !m.archived).length, [messages]);
  const archivedCount = useMemo(() => messages.filter(m => Boolean(m.archived)).length, [messages]);
  const unreadCount = useMemo(() => messages.filter(m => !m.archived && !m.read).length, [messages]);

  // Bulk Selection Helpers
  const isAllSelected = sortedMessages.length > 0 && sortedMessages.every(m => selectedIds.has(m.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMessages.map(m => m.id)));
    }
  };

  const toggleSelectMessage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk Actions
  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedIds.size === 0 || !user) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, "users", user.uid, "messages", id);
        batch.update(ref, { read: isRead });
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk mark read failed", err);
    }
  };

  const handleBulkArchive = async (archiveState: boolean) => {
    if (selectedIds.size === 0 || !user) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, "users", user.uid, "messages", id);
        batch.update(ref, { 
          archived: archiveState,
          archivedAt: archiveState ? serverTimestamp() : null
        });
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk archive failed", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !user) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected message(s)?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, "users", user.uid, "messages", id);
        batch.delete(ref);
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleBulkToggleTag = async (tagKey: string) => {
    if (selectedIds.size === 0 || !user) return;
    try {
      const batch = writeBatch(db);
      // Determine if majority has the tag or not to add/remove uniformly
      selectedIds.forEach(id => {
        const msg = messages.find(m => m.id === id);
        const existingTags = msg?.tags || [];
        const newTags = existingTags.includes(tagKey)
          ? existingTags.filter(t => t !== tagKey)
          : [...existingTags, tagKey];
        const ref = doc(db, "users", user.uid, "messages", id);
        batch.update(ref, { tags: newTags });
      });
      await batch.commit();
      setBulkTagMenuOpen(false);
    } catch (err) {
      console.error("Bulk tag failed", err);
    }
  };

  // Single Message Tag Toggle
  const handleToggleTag = async (msgId: string, tagKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    const msg = messages.find(m => m.id === msgId);
    const existingTags = msg?.tags || [];
    const newTags = existingTags.includes(tagKey)
      ? existingTags.filter(t => t !== tagKey)
      : [...existingTags, tagKey];

    try {
      await updateDoc(doc(db, "users", user.uid, "messages", msgId), { tags: newTags });
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(prev => prev ? { ...prev, tags: newTags } : null);
      }
    } catch (err) {
      console.error("Toggle tag error:", err);
    }
  };

  // Single Message Archive Toggle
  const handleToggleArchive = async (msgId: string, currentArchived: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    try {
      const newArchived = !currentArchived;
      await updateDoc(doc(db, "users", user.uid, "messages", msgId), { 
        archived: newArchived,
        archivedAt: newArchived ? serverTimestamp() : null
      });
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(prev => prev ? { ...prev, archived: newArchived, archivedAt: newArchived ? { seconds: Math.floor(Date.now() / 1000) } : null } : null);
      }
    } catch (err) {
      console.error("Toggle archive error:", err);
    }
  };

  if (!user || !dbUser || !privateKey) {
    return <Navigate to="/" replace />;
  }

  const publicUrl = `${window.location.origin}/u/${dbUser.username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {}
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Send me anonymous messages",
          text: "Send me an anonymous message! 🤫",
          url: publicUrl,
        });
      } else {
        handleCopy();
      }
    } catch(e) {}
  };

  const markRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // already read
    await updateDoc(doc(db, "users", user.uid, "messages", id), {
      read: true
    });
  };

  const deleteMsg = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Delete this message permanently?")) {
      await deleteDoc(doc(db, "users", user.uid, "messages", id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    }
  };

  const reportMsg = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to report this message for abusive behavior?")) {
      await updateDoc(doc(db, "users", user.uid, "messages", id), {
        isFlagged: true
      });
      alert("Message reported. Our team will review it.");
    }
  };

  const handleRate = async (msg: Message, e: React.MouseEvent, type: 'up' | 'down') => {
    e.stopPropagation();
    const newRating = type === 'up' ? 1 : -1;
    if (msg.rating === newRating) return; // already rated
    const diff = newRating - (msg.rating || 0);

    try {
      await updateDoc(doc(db, "users", user.uid, "messages", msg.id), { rating: newRating });
      if (msg.senderId) {
        const repRef = doc(db, "anonymousUsers", msg.senderId);
        const repDoc = await getDoc(repRef);
        const currentRep = repDoc.exists() ? (repDoc.data().reputation || 0) : 0;
        await setDoc(repRef, { reputation: currentRep + diff }, { merge: true });
        setSenderReputations(prev => ({
          ...prev,
          [msg.senderId as string]: currentRep + diff
        }));
      }
    } catch (err) {
      console.error("Failed to rate message", err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage({ text: "", type: "" });
    try {
      const newExpiry = Number(messageExpiryHours);
      const oldExpiry = Number(dbUser?.messageExpiryHours || 0);
      const updates: any = {
        displayName: displayName,
        bio: bio,
        theme: theme,
        messageExpiryHours: newExpiry,
        updatedAt: serverTimestamp()
      };

      // If expiry setting changed or activated:
      if (newExpiry !== oldExpiry) {
        if (newExpiry > 0) {
          updates.messageExpiryActivatedAt = serverTimestamp();
        } else {
          updates.messageExpiryActivatedAt = null;
        }
      } else if (newExpiry > 0 && !dbUser?.messageExpiryActivatedAt) {
        updates.messageExpiryActivatedAt = serverTimestamp();
      }

      await updateDoc(doc(db, "users", user.uid), updates);
      setProfileMessage({ text: "Profile updated successfully!", type: "success" });
    } catch (err: any) {
      setProfileMessage({ text: getFriendlyErrorMessage(err), type: "error" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleReact = async (msgId: string, reaction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "users", user.uid, "messages", msgId), { reaction });
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(prev => prev ? { ...prev, reaction } : null);
      }
    } catch (err) {
      console.error("Failed to add reaction", err);
    }
  };

  const completeOnboarding = async () => {
    try {
      setShowOnboarding(false);
      await updateDoc(doc(db, "users", user.uid), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  const handleMessageClick = (msg: Message) => {
    setSelectedMessage(msg);
    markRead(msg.id, msg.read);
  };

  const shareToStatus = async () => {
    if (!selectedMessage) return;
    setIsExporting(true);
    try {
      const text = decryptedCache[selectedMessage.id] || "";
      const { blob, dataUrl } = await generateShareImageBlob({
        text,
        reaction: selectedMessage.reaction,
        mood: selectedMessage.mood,
        publicUrl,
        username: dbUser?.username
      });

      const file = new File([blob], `whisper-story.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Anonymous Message on Whisper",
          text: `Send me an anonymous message! ${publicUrl}`
        });
      } else {
        const link = document.createElement("a");
        link.download = `whisper-anonymous-message.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to share image", err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCardImage = async () => {
    if (!selectedMessage) return;
    setIsExporting(true);
    try {
      const text = decryptedCache[selectedMessage.id] || "";
      const { dataUrl } = await generateShareImageBlob({
        text,
        reaction: selectedMessage.reaction,
        mood: selectedMessage.mood,
        publicUrl,
        username: dbUser?.username
      });
      const link = document.createElement("a");
      link.download = `whisper-message.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (dbUser?.isLocked) {
    return (
      <div className="p-6 py-12 max-w-md mx-auto min-h-screen flex flex-col justify-center items-center text-center">
        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Suspended</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Your account (@{dbUser.username}) has been locked or suspended by an administrator. Access to your inbox and settings is currently disabled.
        </p>
        <button
          onClick={() => auth.signOut()}
          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 py-8 max-w-md mx-auto space-y-6 min-h-screen pb-28">
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-3xl mb-4">
              ✨
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to your inbox!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              You are ready to receive anonymous messages. Here's how to get started:
            </p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">1</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Copy your link</span> from the dashboard.</div>
              </li>
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">2</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Share it</span> on your Instagram story, Twitter, or in your bios.</div>
              </li>
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">3</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Check back here</span> or wait for notifications when friends reply!</div>
              </li>
            </ul>

            <button 
              onClick={completeOnboarding}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Let's Go!
            </button>
          </motion.div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === "inbox" 
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Inbox className="w-4 h-4" /> Inbox
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === "settings" 
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Settings className="w-4 h-4" /> Profile Settings
        </button>
      </div>

      {activeTab === "inbox" ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
          {/* Secret Link Card */}
          <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Your Secret Link</h2>
              <p className="text-indigo-100 text-xs">Post this on your stories or bio to receive anonymous messages.</p>
            </div>
            
            <div className="bg-black/20 p-3 rounded-xl flex items-center gap-2 backdrop-blur-sm">
              <div className="flex-1 truncate font-mono text-xs sm:text-sm">{publicUrl}</div>
            </div>

            <div className="flex gap-2.5">
              <button 
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-xl font-medium text-sm"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300"/> : <Copy className="w-4 h-4"/>}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button 
                onClick={() => setShowQR(true)}
                className="w-11 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-xl"
                title="Show QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors py-2.5 rounded-xl font-bold text-sm shadow-sm"
              >
                <Share2 className="w-4 h-4"/>
                Share
              </button>
            </div>
          </div>

          {/* QR Code Modal / Drawer */}
          <AnimatePresence>
            {showQR && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center gap-4 text-center">
                  <h3 className="font-bold">Your Profile QR Code</h3>
                  <p className="text-xs text-slate-500 mb-2">Let friends scan this to send you anonymous messages offline.</p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <QRCodeSVG value={publicUrl} size={180} fgColor="#4f46e5" level="H" />
                  </div>
                  <button 
                    onClick={() => setShowQR(false)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Hide QR Code
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inbox View Switcher & Sorting Controls */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Inbox View Switcher: Active vs Archived */}
              <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <button
                  onClick={() => { setInboxView("active"); setSelectedIds(new Set()); }}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                    inboxView === "active"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Main Inbox</span>
                  <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full", inboxView === "active" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400")}>
                    {activeCount}
                  </span>
                </button>
                
                <button
                  onClick={() => { setInboxView("archived"); setSelectedIds(new Set()); }}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                    inboxView === "archived"
                      ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archived</span>
                  <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full", inboxView === "archived" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400")}>
                    {archivedCount}
                  </span>
                </button>
              </div>

              {/* Right Side: Sorting Dropdown & Select All */}
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500 mr-1.5 shrink-0" />
                  <span className="text-[11px] text-slate-400 mr-1.5 hidden sm:inline">Sort:</span>
                  <select
                    id="inbox-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
                    aria-label="Sort inbox messages"
                  >
                    <option value="newest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Newest</option>
                    <option value="oldest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Oldest</option>
                    <option value="most_rated" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Most Rated</option>
                  </select>
                </div>

                {/* Select All Toggle Button */}
                {sortedMessages.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isAllSelected ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="hidden sm:inline">Deselect</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Select All</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Tag / Category Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide py-1">
              <button
                onClick={() => setSelectedTagFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border",
                  selectedTagFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                All ({inboxView === "active" ? activeCount : archivedCount})
              </button>
              
              {inboxView === "active" && (
                <button
                  onClick={() => setSelectedTagFilter("UNREAD")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1",
                    selectedTagFilter === "UNREAD"
                      ? "bg-indigo-600 text-white border-transparent shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
                  Unread ({unreadCount})
                </button>
              )}

              {Object.entries(PRESET_TAGS).map(([key, tagDef]) => {
                const countForTag = messages.filter(m => {
                  const matchesView = inboxView === "active" ? !m.archived : Boolean(m.archived);
                  return matchesView && m.tags && m.tags.includes(key);
                }).length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === key ? "ALL" : key)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5",
                      selectedTagFilter === key
                        ? `${tagDef.bg} ${tagDef.text} ${tagDef.border} ring-2 ring-indigo-500/20`
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    )}
                  >
                    <span>{tagDef.icon}</span>
                    <span>{tagDef.label}</span>
                    {countForTag > 0 && (
                      <span className="text-[10px] opacity-75 font-mono">({countForTag})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky Floating Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-40 bg-slate-950/90 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl shadow-indigo-950/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-2.5 py-1 rounded-full">
                      {selectedIds.size} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Mark Read */}
                    <button
                      onClick={() => handleBulkMarkRead(true)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                      title="Mark as Read"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                    </button>

                    {/* Mark Unread */}
                    <button
                      onClick={() => handleBulkMarkRead(false)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                      title="Mark as Unread"
                    >
                      <Mail className="w-4 h-4 text-indigo-400" />
                    </button>

                    {/* Archive / Unarchive */}
                    {inboxView === "active" ? (
                      <button
                        onClick={() => handleBulkArchive(true)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                        title="Archive selected"
                      >
                        <Archive className="w-4 h-4 text-amber-400" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBulkArchive(false)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                        title="Restore to Inbox"
                      >
                        <ArchiveRestore className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {/* Bulk Tag Popover Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setBulkTagMenuOpen(!bulkTagMenuOpen)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1"
                        title="Add/Toggle Tag"
                      >
                        <TagIcon className="w-4 h-4 text-purple-400" />
                      </button>

                      {bulkTagMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 z-50">
                          <p className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                            Apply Tag
                          </p>
                          {Object.entries(PRESET_TAGS).map(([k, t]) => (
                            <button
                              key={k}
                              onClick={() => handleBulkToggleTag(k)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left hover:bg-slate-800 text-slate-200 transition-colors"
                            >
                              <span>{t.icon}</span>
                              <span className="font-semibold">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bulk Delete */}
                    <button
                      onClick={handleBulkDelete}
                      className="p-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-red-100 transition-colors"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Deselect All */}
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors ml-1"
                      title="Cancel selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages List Container */}
          <div className="space-y-3">
            {inboxView === "archived" && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                <Archive className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-900 dark:text-amber-100">30-Day Archive Safety Window</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                    Archived messages (including auto-expired messages) are preserved here for 30 days before being permanently deleted. You can restore messages to your main inbox at any time.
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {sortedMessages.length === 0 && (
                <EmptyState
                  variant={
                    inboxView === "archived"
                      ? "archived"
                      : selectedTagFilter !== "ALL"
                        ? "filter"
                        : "inbox"
                  }
                  selectedTag={selectedTagFilter}
                  username={dbUser?.username}
                  copied={copied}
                  onCopyLink={handleCopy}
                  onResetFilter={() => setSelectedTagFilter("ALL")}
                  onSwitchToActive={() => {
                    setInboxView("active");
                    setSelectedTagFilter("ALL");
                  }}
                />
              )}

              {sortedMessages.map(msg => {
                const rep = msg.senderId && senderReputations[msg.senderId];
                const isSelected = selectedIds.has(msg.id);
                const msgTags = msg.tags || [];

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col relative",
                      isSelected 
                        ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/30"
                        : msg.read 
                          ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700" 
                          : "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/90 dark:border-indigo-800/80 shadow-sm"
                    )}
                    onClick={() => handleMessageClick(msg)}
                  >
                    {/* Header Row: Checkbox, Timestamp, Reputation & Action Buttons */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Multi-select Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectMessage(msg.id, e)}
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all border shrink-0",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-transparent border-slate-300 dark:border-slate-700 hover:border-indigo-400 group-hover:opacity-100"
                          )}
                          title={isSelected ? "Deselect" : "Select"}
                        >
                          <CheckSquare className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "opacity-0")} />
                        </button>

                        <div className="text-xs font-medium text-slate-400">
                          {msg.createdAt?.seconds ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true }) : "Just now"}
                        </div>

                        {msg.archived && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Deletes in {getArchiveDaysRemaining(msg)}d
                          </span>
                        )}

                        {rep !== undefined && rep !== 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3" />
                            Rep {rep > 0 ? '+' : ''}{rep}
                          </span>
                        )}

                        {/* Hint Button Badge */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHintMsg(msg);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/90 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded-full transition-all shadow-2xs"
                          title="View Sender Hint (IP, Location, Phone Name, Browser)"
                        >
                          <HelpCircle className="w-3 h-3 text-indigo-500" />
                          <span>Hint</span>
                        </button>
                      </div>

                      {/* Card Action Icons */}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {msg.reaction && (
                          <span className="text-sm animate-in zoom-in mr-1">{msg.reaction}</span>
                        )}

                        {/* Hint Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHintMsg(msg);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1 font-bold text-xs"
                          title="View Sender Hint (IP, Location, Device)"
                        >
                          <Search className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="hidden sm:inline">Hint</span>
                        </button>

                        {/* Tag Menu Button on card */}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTagPickerMsgId(activeTagPickerMsgId === msg.id ? null : msg.id);
                            }}
                            className="text-slate-400 hover:text-purple-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Manage Tags"
                          >
                            <TagIcon className="w-4 h-4" />
                          </button>

                          {activeTagPickerMsgId === msg.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-xl space-y-1 z-30">
                              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                                Assign Tag
                              </p>
                              {Object.entries(PRESET_TAGS).map(([k, t]) => {
                                const hasTag = msgTags.includes(k);
                                return (
                                  <button
                                    key={k}
                                    onClick={(e) => handleToggleTag(msg.id, k, e)}
                                    className={cn(
                                      "w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs text-left transition-colors",
                                      hasTag 
                                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold" 
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    )}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span>{t.icon}</span>
                                      <span>{t.label}</span>
                                    </span>
                                    {hasTag && <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Archive / Unarchive Button */}
                        <button
                          onClick={(e) => handleToggleArchive(msg.id, Boolean(msg.archived), e)}
                          className={cn(
                            "p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                            msg.archived ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
                          )}
                          title={msg.archived ? "Restore to inbox" : "Archive message"}
                        >
                          {msg.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>

                        <button 
                          onClick={(e) => reportMsg(msg.id, e)}
                          className="text-slate-400 hover:text-amber-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Report Message"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={(e) => deleteMsg(msg.id, e)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Message Body Content */}
                    <div className={cn("text-base sm:text-lg font-medium break-words whitespace-pre-wrap font-sans mb-3 flex-1", !msg.read && "text-indigo-950 dark:text-indigo-100 font-semibold")}>
                      {(() => {
                        const isLocked = msg.unlocksAt && (msg.unlocksAt.seconds * 1000 > Date.now());
                        if (isLocked) {
                           return (
                             <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mt-2 border border-dashed border-slate-300 dark:border-slate-700">
                               <Lock className="w-6 h-6 text-slate-400 mb-2" />
                               <span className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-1">Time Capsule</span>
                               <span className="text-xs text-slate-400 font-mono">Unlocks {new Date(msg.unlocksAt.seconds * 1000).toLocaleString()}</span>
                             </div>
                           );
                        }

                        if (decryptedCache[msg.id] === undefined) {
                          return <span className="animate-pulse text-slate-400">Decrypting...</span>;
                        }

                        const decrypted = decryptedCache[msg.id];
                        return <>{msg.mood && <span className="mr-2 text-xl">{msg.mood}</span>}{decrypted}</>;
                      })()}
                    </div>

                    {/* Applied Tags List */}
                    {msgTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {msgTags.map(tagKey => {
                          const tagDef = PRESET_TAGS[tagKey] || { label: tagKey, icon: "🏷️", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200" };
                          return (
                            <span
                              key={tagKey}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                tagDef.bg,
                                tagDef.text,
                                tagDef.border
                              )}
                            >
                              <span>{tagDef.icon}</span>
                              <span>{tagDef.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Bottom Reaction & Rating Bar */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-1" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-1 items-center">
                        <span className="text-xs font-medium text-slate-400 self-center mr-1.5"><Heart className="w-3.5 h-3.5" /></span>
                        {QUICK_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => handleReact(msg.id, emoji === msg.reaction ? '' : emoji, e)}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center rounded-full text-sm transition-all shrink-0",
                              msg.reaction === emoji ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500/30 scale-110" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-70 hover:opacity-100 hover:scale-110"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      
                      {msg.senderId && (
                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2.5 ml-2">
                          <button
                            onClick={(e) => handleRate(msg, e, 'up')}
                            className={cn("p-1.5 rounded-full transition-colors", msg.rating === 1 ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400")}
                            title="Thumbs Up"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleRate(msg, e, 'down')}
                            className={cn("p-1.5 rounded-full transition-colors", msg.rating === -1 ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400")}
                            title="Thumbs Down"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Profile Details</h2>
              <p className="text-sm text-slate-500">Update how you appear to others on your public link.</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    id="settings-display-name-input"
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="E.g. Jane Doe"
                    maxLength={30}
                    className="w-full text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Bio (Optional)</label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <textarea 
                    id="settings-bio-input"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Write a short intro to prompt your friends..."
                    maxLength={150}
                    className="w-full text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors resize-none min-h-[100px]"
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-400">
                    {bio.length}/150
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Profile Theme</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <select 
                    id="settings-theme-select"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="w-full text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value="default">Default Minimal</option>
                    <option value="cosmic">Cosmic Space</option>
                    <option value="sunset">Sunset Vibes</option>
                    <option value="forest">Secret Forest</option>
                    <option value="ocean">Deep Ocean</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Auto-Archive Messages (Self-Destruct)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <select 
                    id="settings-expiry-select"
                    value={messageExpiryHours}
                    onChange={e => setMessageExpiryHours(Number(e.target.value))}
                    className="w-full text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value={0}>Never (Keep in main inbox)</option>
                    <option value={1}>Auto-Archive after 1 Hour</option>
                    <option value={24}>Auto-Archive after 24 Hours</option>
                    <option value={168}>Auto-Archive after 7 Days</option>
                    <option value={720}>Auto-Archive after 30 Days</option>
                  </select>
                </div>
                <div className="mt-2 space-y-1 pl-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    • <strong>Activation scope:</strong> Only applies to messages received after this timer is activated.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    • <strong>Archive safety:</strong> Expired messages are automatically moved to your Archive, where they are preserved for 30 days before permanent deletion.
                  </p>
                  {Number(dbUser?.messageExpiryHours || 0) > 0 && dbUser?.messageExpiryActivatedAt && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active: auto-archiving new messages after {dbUser.messageExpiryHours}h (since {dbUser.messageExpiryActivatedAt?.seconds ? new Date(dbUser.messageExpiryActivatedAt.seconds * 1000).toLocaleDateString() : "recently"})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {profileMessage.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${profileMessage.type === "success" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {profileMessage.text}
                </div>
              )}

              <button 
                type="submit"
                disabled={isUpdatingProfile || (!displayName.trim())}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                {isUpdatingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto"
            >
              {/* Top Modal Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Message Details</span>
                  {selectedMessage.archived && (
                    <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      Archived
                    </span>
                  )}
                </span>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Unique Whisper Signature Theme Story Preview Card */}
              <div className="rounded-3xl overflow-hidden shadow-2xl p-[2px] bg-gradient-to-br from-purple-400 via-indigo-500 to-sky-400">
                <div className="rounded-[22px] bg-slate-950/95 p-5 text-white flex flex-col min-h-[220px] backdrop-blur-xl relative overflow-hidden">
                  {/* Top Glowing Header Badge */}
                  <div className="flex items-center justify-center mb-3">
                    <span className="bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-purple-400/40 text-purple-200 text-[11px] font-bold tracking-wider px-3.5 py-1 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                      🔒 SECRET WHISPER • ANONYMOUS
                    </span>
                  </div>

                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent my-1"></div>

                  {/* Body with Message Content */}
                  <div className="py-4 flex-1 flex flex-col items-center justify-center text-center">
                    {selectedMessage.reaction && (
                      <div className="text-3xl mb-2 drop-shadow-md">{selectedMessage.reaction}</div>
                    )}
                    <p className="text-base sm:text-lg font-bold font-sans text-white leading-relaxed break-words whitespace-pre-wrap drop-shadow-lg">
                      {selectedMessage.mood && <span className="mr-1.5">{selectedMessage.mood}</span>}
                      {decryptedCache[selectedMessage.id] || "Decrypting..."}
                    </p>
                  </div>

                  {/* Cyber Security Seal */}
                  <div className="pt-2 text-center border-t border-slate-800/80">
                    <p className="text-[10px] font-mono tracking-widest text-slate-400">
                      /// END-TO-END ENCRYPTED ///
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Tags Management in Modal */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Categorize & Tag:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRESET_TAGS).map(([k, t]) => {
                    const hasTag = (selectedMessage.tags || []).includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={(e) => handleToggleTag(selectedMessage.id, k, e)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1",
                          hasTag
                            ? `${t.bg} ${t.text} ${t.border} ring-2 ring-indigo-500/30 scale-105`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300 opacity-60 hover:opacity-100"
                        )}
                      >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHintMsg(selectedMessage);
                  }}
                  className="w-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 font-semibold py-2.5 px-3 rounded-xl transition-colors border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center gap-1.5 text-xs shadow-xs"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  View Sender Hint (IP & Device)
                </button>

                <button 
                  onClick={shareToStatus}
                  disabled={isExporting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {isExporting ? (
                    <span className="animate-pulse">Generating Story Image...</span>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share to WhatsApp / Story
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={downloadCardImage}
                    disabled={isExporting}
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>

                  <button 
                    onClick={(e) => handleToggleArchive(selectedMessage.id, Boolean(selectedMessage.archived), e)}
                    className={cn(
                      "w-full font-medium py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs",
                      selectedMessage.archived
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    {selectedMessage.archived ? (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5 text-amber-500" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sender Hint Details Modal */}
      <AnimatePresence>
        {activeHintMsg && (() => {
          const hint: SenderHint = activeHintMsg.senderHint || getFallbackSenderHint(activeHintMsg.senderId, activeHintMsg.id);
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
              onClick={() => setActiveHintMsg(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Sender Hint & Info</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Captured digital fingerprint & config</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveHintMsg(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Hint Cards Grid */}
                <div className="space-y-2.5">
                  {/* Device IP Address */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device IP Address</div>
                        <div className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{hint.ip}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full shrink-0">Device IP</span>
                  </div>

                  {/* Approx. Location */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approx. Location</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{hint.location || "Unknown Location"}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full shrink-0">Location</span>
                  </div>

                  {/* Phone Name / Exact Model */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Name & Model</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{hint.device}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full shrink-0">Exact Phone</span>
                  </div>

                  {/* Browser Config */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Browser Config</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{hint.browser}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">OS: {hint.os}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full shrink-0">Software</span>
                  </div>

                  {/* Screen & Locale */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Screen Config</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px] mt-0.5 truncate">{hint.screen}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timezone / Lang</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 truncate">{hint.timezone}</div>
                    </div>
                  </div>
                </div>

                {hint.isEstimated && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Legacy message: Showing estimated hint fingerprint.</span>
                  </div>
                )}

                <button 
                  onClick={() => setActiveHintMsg(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm mt-1"
                >
                  Close Hint
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
