import React, { useState, useEffect, useRef, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
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
  ShieldAlert,
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
  Info,
  Camera,
  Upload,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Share,
  PlusSquare,
  RefreshCw
} from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import { uploadToCloudinary } from "../lib/cloudinary";
import { SenderHint, getFallbackSenderHint, formatDisplayDevice } from "../lib/senderHint";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { generateShareImageBlob } from "../lib/canvasImage";
import EmptyState from "../components/EmptyState";
import ShareCardModal from "../components/ShareCardModal";
import IOSInstallGuideModal from "../components/IOSInstallGuideModal";
import PauseLinkModal from "../components/PauseLinkModal";
import AccountSettingsModal from "../components/AccountSettingsModal";
import ProfileSettingsView from "../components/ProfileSettingsView";
import WhisperCarousel from "../components/WhisperCarousel";
import { WhisperMode, WHISPER_MODES, getModeUrl, getMessageMode } from "../lib/whisperModes";
import localforage from "localforage";
import { 
  enablePushNotifications, 
  disablePushNotifications, 
  triggerTestNotification, 
  displayIncomingWhisperNotification, 
  getNotificationPermissionStatus, 
  checkNotificationSupport, 
  subscribeToForegroundFCM,
  NotificationPermissionState,
  isIOS,
  isStandalonePWA
} from "../lib/notifications";
import { usePWAInstall } from "../lib/usePWAInstall";
import { usePWAUpdate } from "../lib/usePWAUpdate";

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
  mode?: string;
  category?: string;
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
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>("ALL"); // ALL | anonymous | confess | about | ask | opinion | crush | compliment | roast
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL"); // ALL | UNREAD | tag_name
  const [sortBy, setSortBy] = useState<SortOption>("newest"); // newest | oldest | most_rated
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagMenuOpen, setBulkTagMenuOpen] = useState(false);
  const [activeTagPickerMsgId, setActiveTagPickerMsgId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(dbUser?.displayName || "");
  const [bio, setBio] = useState(dbUser?.bio || "");
  const [theme, setTheme] = useState(dbUser?.theme || "default");
  const [avatarUrl, setAvatarUrl] = useState<string>(dbUser?.photoURL || dbUser?.avatarUrl || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [messageExpiryHours, setMessageExpiryHours] = useState<number>(dbUser?.messageExpiryHours || 0);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dbUser) {
      if (!displayName && dbUser.displayName) setDisplayName(dbUser.displayName);
      if (!bio && dbUser.bio) setBio(dbUser.bio);
      if (!avatarUrl && (dbUser.photoURL || dbUser.avatarUrl)) setAvatarUrl(dbUser.photoURL || dbUser.avatarUrl || "");
    }
  }, [dbUser]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage({ text: "Please select a valid image file (PNG, JPG, WEBP).", type: "error" });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setProfileMessage({ text: "Image file size must be less than 8MB.", type: "error" });
      return;
    }

    setIsUploadingAvatar(true);
    setProfileMessage({ text: "Processing & uploading profile picture...", type: "info" });

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      setAvatarUrl(uploadedUrl);

      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: uploadedUrl,
          avatarUrl: uploadedUrl,
          updatedAt: serverTimestamp()
        });
      }

      setProfileMessage({ text: "Profile picture updated successfully!", type: "success" });
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      setProfileMessage({ text: err.message || "Failed to upload image. Please try again.", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl("");
    setProfileMessage({ text: "Removing profile picture...", type: "info" });
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: null,
          avatarUrl: null,
          updatedAt: serverTimestamp()
        });
      }
      setProfileMessage({ text: "Profile picture removed.", type: "success" });
    } catch (err: any) {
      console.error("Failed to remove avatar:", err);
      setProfileMessage({ text: getFriendlyErrorMessage(err), type: "error" });
    }
  };
  
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeHintMsg, setActiveHintMsg] = useState<Message | null>(null);
  const [restrictSenderHints, setRestrictSenderHints] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedQRMode, setSelectedQRMode] = useState<WhisperMode>(WHISPER_MODES[0]);
  const [selectedQRUrl, setSelectedQRUrl] = useState<string>("");
  const [selectedShareMode, setSelectedShareMode] = useState<WhisperMode>(WHISPER_MODES[0]);
  const [selectedShareUrl, setSelectedShareUrl] = useState<string>("");
  const [activeFeaturedModeId, setActiveFeaturedModeId] = useState<string>("anonymous");
  const [showOnboarding, setShowOnboarding] = useState(dbUser?.onboardingCompleted !== true);

  // PWA and iOS Install state
  const pwa = usePWAInstall();
  const pwaUpdate = usePWAUpdate();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);

  // Firebase Cloud Messaging & Push Notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermissionStatus());
  const [isPushToggling, setIsPushToggling] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [notifStatusMsg, setNotifStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [foregroundToast, setForegroundToast] = useState<{ show: boolean; title: string; body: string; messageId?: string; mode?: string } | null>(null);
  const hasLoadedInitialMsgsRef = useRef(false);
  const prevMsgIdsRef = useRef<Set<string>>(new Set());

  // Listen for permission updates and foreground FCM messages
  useEffect(() => {
    setNotifPermission(getNotificationPermissionStatus());

    const unsubForeground = subscribeToForegroundFCM((payload) => {
      const title = payload.notification?.title || payload.data?.title || "New Whisper Alert! 🤫";
      const body = payload.notification?.body || payload.data?.body || "You just received a new anonymous whisper!";
      setForegroundToast({
        show: true,
        title,
        body,
        mode: payload.data?.mode
      });
    });

    return () => {
      if (typeof unsubForeground === "function") unsubForeground();
    };
  }, []);

  // Global settings listener (for restricting sender hints display)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "systemSettings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRestrictSenderHints(!!data.restrictSenderHints);
      }
    }, (err) => {
      console.warn("Could not fetch global settings for hints:", err);
    });
    return () => unsub();
  }, []);
  
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

      // Realtime incoming whisper alert
      if (hasLoadedInitialMsgsRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const msgId = change.doc.id;
            if (!prevMsgIdsRef.current.has(msgId) && !data.read) {
              const msgMode = getMessageMode({ id: msgId, ...data } as any);
              if (dbUser?.notificationsEnabled !== false) {
                displayIncomingWhisperNotification(msgMode.name, msgMode.icon);
              }
              setForegroundToast({
                show: true,
                title: `New ${msgMode.name} Received! ${msgMode.icon}`,
                body: "Someone sent you a secret anonymous whisper. Tap to open and read it.",
                messageId: msgId,
                mode: msgMode.name
              });
            }
          }
        });
      } else {
        hasLoadedInitialMsgsRef.current = true;
      }

      const idSet = new Set<string>();
      msgs.forEach(m => idSet.add(m.id));
      prevMsgIdsRef.current = idSet;

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

  // Auto-sync Web Push subscription if permission is granted and notifications are enabled
  useEffect(() => {
    if (!user?.uid || dbUser?.notificationsEnabled === false) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const hasSyncedKey = `whisper_pwa_synced_${user.uid}`;
      const lastSynced = sessionStorage.getItem(hasSyncedKey);
      if (!lastSynced) {
        enablePushNotifications(user.uid)
          .then(() => sessionStorage.setItem(hasSyncedKey, "true"))
          .catch(() => {});
      }
    }
  }, [user?.uid, dbUser?.notificationsEnabled]);

  // Filter messages based on Active vs Archived, Mode / Version filter, and Tag filter
  const displayedMessages = useMemo(() => {
    return messages.filter(msg => {
      // 1. Archive filter
      const isArchived = Boolean(msg.archived);
      if (inboxView === "active" && isArchived) return false;
      if (inboxView === "archived" && !isArchived) return false;

      // 2. Version / Mode filter
      if (selectedModeFilter !== "ALL") {
        const msgMode = getMessageMode(msg);
        if (msgMode.id !== selectedModeFilter) return false;
      }

      // 3. Tag / Read filter
      if (selectedTagFilter === "ALL") return true;
      if (selectedTagFilter === "UNREAD") return !msg.read;
      return msg.tags && msg.tags.includes(selectedTagFilter);
    });
  }, [messages, inboxView, selectedModeFilter, selectedTagFilter]);

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

  // Version / Mode Counts for current inbox view (Active or Archived)
  const modeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    WHISPER_MODES.forEach(m => { counts[m.id] = 0; });
    messages.forEach(msg => {
      const isArchived = Boolean(msg.archived);
      if (inboxView === "active" && isArchived) return;
      if (inboxView === "archived" && !isArchived) return;
      counts.ALL = (counts.ALL || 0) + 1;
      const m = getMessageMode(msg);
      counts[m.id] = (counts[m.id] || 0) + 1;
    });
    return counts;
  }, [messages, inboxView]);

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

  const handleShare = () => {
    setShowShareModal(true);
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
        photoURL: avatarUrl || null,
        avatarUrl: avatarUrl || null,
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
      const mode = getMessageMode(selectedMessage);
      const { blob, dataUrl } = await generateShareImageBlob({
        text,
        reaction: selectedMessage.reaction,
        mood: selectedMessage.mood,
        publicUrl,
        username: dbUser?.username,
        mode
      });

      const file = new File([blob], `whisper-${mode.id}-story.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${mode.badge} on Whisper`,
          text: `Send me an anonymous message! ${publicUrl}`
        });
      } else {
        const link = document.createElement("a");
        link.download = `whisper-${mode.id}-message.png`;
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
      const mode = getMessageMode(selectedMessage);
      const { dataUrl } = await generateShareImageBlob({
        text,
        reaction: selectedMessage.reaction,
        mood: selectedMessage.mood,
        publicUrl,
        username: dbUser?.username,
        mode
      });
      const link = document.createElement("a");
      link.download = `whisper-${mode.id}-message.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnablePush = async () => {
    if (!user?.uid) return;
    setIsPushToggling(true);
    setNotifStatusMsg(null);
    try {
      const res = await enablePushNotifications(user.uid);
      setNotifPermission(getNotificationPermissionStatus());
      if (res.success) {
        setNotifStatusMsg({
          text: "Push notifications successfully enabled! You will receive alerts when new whispers arrive.",
          type: "success"
        });
      } else if (res.needsIOSInstall) {
        setShowIOSModal(true);
        setNotifStatusMsg({
          text: "iPhone / iPad requires adding Whisper to your Home Screen to receive push notifications.",
          type: "error"
        });
      } else {
        setNotifStatusMsg({
          text: res.error || "Failed to enable notifications. Please grant notification permission in your browser.",
          type: "error"
        });
      }
    } catch (err: any) {
      setNotifStatusMsg({ text: err.message || "Failed to enable push notifications.", type: "error" });
    } finally {
      setIsPushToggling(false);
    }
  };

  const handleDisablePush = async () => {
    if (!user?.uid) return;
    setIsPushToggling(true);
    setNotifStatusMsg(null);
    try {
      const res = await disablePushNotifications(user.uid, dbUser?.fcmToken);
      if (res.success) {
        setNotifStatusMsg({
          text: "Push notifications disabled on this account.",
          type: "success"
        });
      } else {
        setNotifStatusMsg({
          text: res.error || "Failed to disable push notifications.",
          type: "error"
        });
      }
    } catch (err: any) {
      setNotifStatusMsg({ text: err.message || "Failed to disable push notifications.", type: "error" });
    } finally {
      setIsPushToggling(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotif(true);
    setNotifStatusMsg(null);
    try {
      await triggerTestNotification(dbUser?.username || "friend");
      setNotifStatusMsg({
        text: "Test notification dispatched! Tap the banner or browser alert to jump right into your dashboard.",
        type: "success"
      });
    } catch (err: any) {
      setNotifStatusMsg({
        text: "Failed to dispatch test notification. Ensure browser notifications are allowed.",
        type: "error"
      });
    } finally {
      setIsTestingNotif(false);
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
      {/* Realtime In-App Incoming Whisper Notification Toast */}
      <AnimatePresence>
        {foregroundToast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 pointer-events-auto"
          >
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-xl shadow-xs">
                  🤫
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {foregroundToast.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {foregroundToast.body}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setActiveTab("inbox");
                    setInboxView("active");
                    const targetId = foregroundToast.messageId;
                    setForegroundToast(null);
                    if (targetId) {
                      const found = messages.find(m => m.id === targetId);
                      if (found) handleMessageClick(found);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  View
                </button>
                <button
                  onClick={() => setForegroundToast(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
          {/* Upgrade: Whisper Version Carousel Deck */}
          <WhisperCarousel
            username={dbUser.username}
            activeModeId={activeFeaturedModeId}
            onSelectMode={(mode) => {
              setActiveFeaturedModeId(mode.id);
            }}
            onOpenQR={(mode, url) => {
              setSelectedQRMode(mode);
              setSelectedQRUrl(url);
              setShowQR(true);
            }}
            onOpenShare={(mode, url) => {
              setSelectedShareMode(mode);
              setSelectedShareUrl(url);
              setShowShareModal(true);
            }}
          />

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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <span className="text-base">{selectedQRMode.icon}</span>
                    <span>{selectedQRMode.name}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Scan for {selectedQRMode.name}</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Let friends scan this QR code to open your dedicated <strong>{selectedQRMode.name}</strong> page directly.
                  </p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <QRCodeSVG value={selectedQRUrl || getModeUrl(selectedQRMode, dbUser.username)} size={180} fgColor="#4f46e5" level="H" />
                  </div>
                  <div className="font-mono text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl max-w-full truncate select-all">
                    {selectedQRUrl || getModeUrl(selectedQRMode, dbUser.username)}
                  </div>
                  <button 
                    onClick={() => setShowQR(false)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
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
              {/* Inbox View Switcher & Sort Dropdown combined in the same bar */}
              <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 gap-1">
                <button
                  onClick={() => { setInboxView("active"); setSelectedIds(new Set()); }}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                    inboxView === "active"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Main</span>
                  <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full", inboxView === "active" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400")}>
                    {activeCount}
                  </span>
                </button>

                <button
                  onClick={() => { setInboxView("archived"); setSelectedIds(new Set()); }}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
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

                {/* Divider */}
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

                {/* Sort Dropdown in the same line */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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

            {/* Version Mode Filter Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <span>Version Mode:</span>
                </span>
                {(selectedModeFilter !== "ALL" || selectedTagFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSelectedModeFilter("ALL");
                      setSelectedTagFilter("ALL");
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide py-0.5">
                <button
                  onClick={() => setSelectedModeFilter("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5",
                    selectedModeFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <span>✨</span>
                  <span>All Versions ({modeCounts.ALL || 0})</span>
                </button>

                {WHISPER_MODES.map(mode => {
                  const count = modeCounts[mode.id] || 0;
                  const isSelected = selectedModeFilter === mode.id;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedModeFilter(isSelected ? "ALL" : mode.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5",
                        isSelected
                          ? `${mode.msgBadgeBg} ring-2 ring-indigo-500/30 scale-105 shadow-sm`
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      )}
                    >
                      <span>{mode.icon}</span>
                      <span>{mode.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] opacity-75 font-mono">({count})</span>
                      )}
                    </button>
                  );
                })}
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
                All Statuses ({inboxView === "active" ? activeCount : archivedCount})
              </button>
              
              {inboxView === "active" && (
                <button
                  onClick={() => setSelectedTagFilter(selectedTagFilter === "UNREAD" ? "ALL" : "UNREAD")}
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
                  const matchesMode = selectedModeFilter === "ALL" || getMessageMode(m).id === selectedModeFilter;
                  return matchesView && matchesMode && m.tags && m.tags.includes(key);
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
                      : (selectedTagFilter !== "ALL" || selectedModeFilter !== "ALL")
                        ? "filter"
                        : "inbox"
                  }
                  selectedTag={selectedTagFilter}
                  selectedMode={selectedModeFilter}
                  filterLabel={
                    selectedModeFilter !== "ALL" && selectedTagFilter !== "ALL"
                      ? `${WHISPER_MODES.find(m => m.id === selectedModeFilter)?.name || selectedModeFilter} + ${selectedTagFilter}`
                      : selectedModeFilter !== "ALL"
                        ? (WHISPER_MODES.find(m => m.id === selectedModeFilter)?.name || selectedModeFilter)
                        : selectedTagFilter
                  }
                  username={dbUser?.username}
                  onResetFilter={() => {
                    setSelectedTagFilter("ALL");
                    setSelectedModeFilter("ALL");
                  }}
                  onSwitchToActive={() => {
                    setInboxView("active");
                    setSelectedTagFilter("ALL");
                    setSelectedModeFilter("ALL");
                  }}
                />
              )}

              {sortedMessages.map(msg => {
                const rep = msg.senderId && senderReputations[msg.senderId];
                const isSelected = selectedIds.has(msg.id);
                const msgTags = msg.tags || [];
                const msgMode = getMessageMode(msg);

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
                          ? `bg-white dark:bg-slate-950 ${msgMode.msgBorder}` 
                          : `${msgMode.msgUnreadBg} ${msgMode.msgBorder} shadow-sm`
                    )}
                    onClick={() => handleMessageClick(msg)}
                  >
                    {/* Header Row: Checkbox, Timestamp, Version Mode Badge, Reputation & Action Buttons */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
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

                        {/* Version / Mode Pill Badge */}
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs", msgMode.msgBadgeBg)}>
                          <span>{msgMode.icon}</span>
                          <span>{msgMode.name}</span>
                        </span>

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

                        {/* Hint Action Button (Hidden when restricted by Admin) */}
                        {!restrictSenderHints && (
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
                        )}

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
      
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (() => {
          const selectedMode = getMessageMode(selectedMessage);
          return (
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
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs", selectedMode.msgBadgeBg)}>
                    <span>{selectedMode.icon}</span>
                    <span>{selectedMode.name}</span>
                  </span>
                  {selectedMessage.archived && (
                    <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      Archived
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Version Themed Story Preview Card */}
              <div className={cn("rounded-3xl overflow-hidden shadow-2xl p-[2.5px] bg-gradient-to-br transition-all", selectedMode.msgModalBorder)}>
                <div className="rounded-[22px] bg-slate-950/95 p-5 text-white flex flex-col min-h-[220px] backdrop-blur-xl relative overflow-hidden">
                  {/* Top Glowing Header Badge */}
                  <div className="flex items-center justify-center mb-3">
                    <span className={cn("bg-gradient-to-r text-[11px] font-bold tracking-wider px-3.5 py-1 rounded-full shadow-lg inline-flex items-center gap-1.5", selectedMode.msgModalBadge)}>
                      <span>{selectedMode.icon}</span>
                      <span>{selectedMode.badge.toUpperCase()} • 100% ANONYMOUS</span>
                    </span>
                  </div>

                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-1"></div>

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
                      /// END-TO-END ENCRYPTED {selectedMode.tagLabel.toUpperCase()} ///
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
          );
        })()}
      </AnimatePresence>

      {/* Sender Hint Details Modal (Suppressed if restricted globally) */}
      <AnimatePresence>
        {activeHintMsg && !restrictSenderHints && (() => {
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
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{formatDisplayDevice(hint)}</div>
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

      {/* Share Profile Link Card Modal */}
      <ShareCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        username={dbUser.username}
        displayName={dbUser.displayName}
        photoURL={dbUser.photoURL || avatarUrl}
        avatarUrl={dbUser.avatarUrl || avatarUrl}
        publicUrl={selectedShareUrl || publicUrl}
        mode={selectedShareMode}
        modeTitle={selectedShareMode?.name}
        modePrompt={selectedShareMode?.prompt}
        modeIcon={selectedShareMode?.icon}
      />

      {/* iOS PWA Installation & Push Notification Modal */}
      <IOSInstallGuideModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

      {/* Pause My Link Modal */}
      <PauseLinkModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        userUid={user?.uid || ""}
        dbUser={dbUser}
      />

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettingsModal}
        onClose={() => setShowAccountSettingsModal(false)}
        user={user}
        dbUser={dbUser}
        messagesCount={messages.length}
      />
    </div>
  );
}
