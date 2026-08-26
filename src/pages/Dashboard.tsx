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
  Lock,
  ShieldAlert,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  CheckCheck,
  Mail,
  Filter,
  Plus,
  ArrowUpDown,
  ArrowLeft,
  ChevronLeft,
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
  RefreshCw,
  ChevronRight,
  MessageSquare,
  Home,
  Send,
  ExternalLink,
  Shuffle,
  Pencil,
  RotateCcw
} from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import { uploadToCloudinary } from "../lib/cloudinary";
import { SenderHint, getFallbackSenderHint, formatDisplayDevice } from "../lib/senderHint";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { generateShareImageBlob, ProfileCardTheme } from "../lib/canvasImage";
import EmptyState from "../components/EmptyState";
import ShareCardModal from "../components/ShareCardModal";
import IOSInstallGuideModal from "../components/IOSInstallGuideModal";
import PauseLinkModal from "../components/PauseLinkModal";
import AccountSettingsModal from "../components/AccountSettingsModal";
import ProfileSettingsView from "../components/ProfileSettingsView";
import RateAppModal, { shouldShowRatingPrompt, snoozeRatingPrompt } from "../components/RateAppModal";
import WhisperCarousel from "../components/WhisperCarousel";
import UnifiedWhisperHub from "../components/UnifiedWhisperHub";
import { WhisperMode, WHISPER_MODES, getModeUrl, getMessageMode } from "../lib/whisperModes";
import { getNextPromptForMode, getRandomPromptForMode, buildModeShareUrl } from "../lib/modeTemplates";
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
import FormattedMessageText from "../components/FormattedMessageText";
import LinkPreviewCard from "../components/LinkPreviewCard";
import { extractUrls } from "../lib/linkPreview";
import { usePWAInstall } from "../lib/usePWAInstall";
import { usePWAUpdate } from "../lib/usePWAUpdate";
import InboxHeader, { InboxViewType, LayoutDensity, SortOption as InboxSortOption } from "../components/inbox/InboxHeader";
import { QuickFilterType } from "../components/inbox/InboxFilterBar";
import InboxBulkActions from "../components/inbox/InboxBulkActions";
import InboxMessageCard from "../components/inbox/InboxMessageCard";
import MessageReaderModal from "../components/inbox/MessageReaderModal";
import SenderHintModal from "../components/inbox/SenderHintModal";

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

export type SortOption = "newest" | "oldest" | "most_rated" | "longest";

export default function Dashboard() {
  const { user, dbUser, privateKey } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [senderReputations, setSenderReputations] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"home" | "inbox">("home");
  
  // Sub-inbox view, sorting, search & filters
  const [inboxView, setInboxView] = useState<InboxViewType>("active");
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>("ALL"); // ALL | anonymous | confess | about | ask | opinion | crush | compliment | roast
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>("compact");
  const [sortBy, setSortBy] = useState<SortOption>("newest"); // newest | oldest | most_rated | longest
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareMode, setSelectedShareMode] = useState<WhisperMode>(WHISPER_MODES[0]);
  const [selectedShareUrl, setSelectedShareUrl] = useState<string>("");
  const [activeFeaturedModeId, setActiveFeaturedModeId] = useState<string>("anonymous");
  const [modeCustomPrompts, setModeCustomPrompts] = useState<Record<string, string>>({});
  const [isEditingSharePrompt, setIsEditingSharePrompt] = useState(false);
  const [editedSharePromptText, setEditedSharePromptText] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(dbUser?.onboardingCompleted !== true);

  // PWA and iOS Install state
  const pwa = usePWAInstall();
  const pwaUpdate = usePWAUpdate();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  // Auto-spawn Rating Prompt after 12 seconds time spawn delay if eligible
  useEffect(() => {
    if (dbUser && shouldShowRatingPrompt(dbUser)) {
      const timer = setTimeout(() => {
        if (shouldShowRatingPrompt(dbUser)) {
          setShowRateModal(true);
        }
      }, 12000); // 12s delay allows user to inspect dashboard before prompting
      return () => clearTimeout(timer);
    }
  }, [dbUser]);

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

  // Filter messages based on Active vs Archived, Mode / Version filter, Quick filter, and Search Query
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

      // 3. Quick Filter
      if (quickFilter === "UNREAD" && msg.read) return false;
      if (quickFilter === "HAS_REACTION" && !msg.reaction) return false;
      if (quickFilter === "TIME_CAPSULE" && !(msg.unlocksAt && msg.unlocksAt.seconds * 1000 > Date.now())) return false;
      if (quickFilter === "HAS_LINK") {
        const text = decryptedCache[msg.id] || "";
        if (extractUrls(text).length === 0) return false;
      }

      // 4. Real-time Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = (decryptedCache[msg.id] || "").toLowerCase();
        const mode = getMessageMode(msg);
        const modeName = mode.name.toLowerCase();
        const mood = (msg.mood || "").toLowerCase();
        const hintLoc = (msg.senderHint?.location || "").toLowerCase();
        const hintDev = (msg.senderHint?.device || "").toLowerCase();
        
        const matches = text.includes(q) || 
                        modeName.includes(q) || 
                        mood.includes(q) || 
                        hintLoc.includes(q) || 
                        hintDev.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [messages, inboxView, selectedModeFilter, quickFilter, searchQuery, decryptedCache]);

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

      if (sortBy === "longest") {
        const lenA = (decryptedCache[a.id] || "").length;
        const lenB = (decryptedCache[b.id] || "").length;
        if (lenA !== lenB) return lenB - lenA;
        return getMsgTime(b) - getMsgTime(a);
      }

      // Default "newest"
      const timeA = getMsgTime(a);
      const timeB = getMsgTime(b);
      return timeB - timeA;
    });
  }, [displayedMessages, sortBy, senderReputations, decryptedCache]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedModeFilter("ALL");
    setQuickFilter("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedModeFilter !== "ALL" || quickFilter !== "ALL" || Boolean(searchQuery.trim());

  // Mark all unread in active inbox
  const handleMarkAllRead = async () => {
    if (!user) return;
    const unreadActiveMsgs = messages.filter(m => !m.archived && !m.read);
    if (unreadActiveMsgs.length === 0) return;
    setIsMarkingAllRead(true);
    try {
      const batch = writeBatch(db);
      unreadActiveMsgs.forEach(m => {
        const ref = doc(db, "users", user.uid, "messages", m.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

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

  const handleCopy = async (textToCopy?: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy || publicUrl);
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
    setSelectedMessage({ ...msg, read: true });
    markRead(msg.id, msg.read);
  };

  const shareToStatus = async (customTheme?: ProfileCardTheme) => {
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
        mode,
        theme: customTheme
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

  const downloadCardImage = async (customTheme?: ProfileCardTheme) => {
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
        mode,
        theme: customTheme
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
                    setDashboardTab("inbox");
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

      {/* Top Segmented Navigation Tabs: Home vs Inbox */}
      <div className="w-full flex items-center justify-center">
        <div className="w-full grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            id="dashboard-tab-home-btn"
            onClick={() => setDashboardTab("home")}
            className={cn(
              "relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer select-none",
              dashboardTab === "home"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            id="dashboard-tab-inbox-btn"
            onClick={() => setDashboardTab("inbox")}
            className={cn(
              "relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer select-none",
              dashboardTab === "inbox"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-600 text-white shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: HOME (Choose Whisper, Link Sharing, Social, Profile) */}
      {dashboardTab === "home" && (
        <div className="space-y-6 animate-in slide-in-from-left-2 fade-in duration-300">
          
          {/* Unread Whispers Quick Alert Banner */}
          {unreadCount > 0 && (
            <div 
              onClick={() => {
                setDashboardTab("inbox");
                setInboxView("active");
                setQuickFilter("UNREAD");
              }}
              className="cursor-pointer p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-indigo-500/15 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-500 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  📬
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>You have {unreadCount} unread whisper{unreadCount > 1 ? "s" : ""}</span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tap to open your inbox and decrypt them
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>View</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Unified Whisper & Quick Share Studio Hub */}
          <UnifiedWhisperHub
            username={dbUser.username}
            displayName={dbUser.displayName}
            photoURL={dbUser.photoURL || avatarUrl}
            avatarUrl={dbUser.avatarUrl || avatarUrl}
            isLinkPaused={dbUser.isLinkPaused}
            onOpenPauseModal={() => setShowPauseModal(true)}
            activeModeId={activeFeaturedModeId}
            onSelectModeId={(modeId) => {
              setActiveFeaturedModeId(modeId);
              setIsEditingSharePrompt(false);
            }}
            customPrompts={modeCustomPrompts}
            onPromptChange={(modeId, newPrompt, newUrl) => {
              setModeCustomPrompts(prev => ({ ...prev, [modeId]: newPrompt }));
            }}
            onGenerateStoryCard={(mode, url, prompt) => {
              setSelectedShareMode(mode);
              setSelectedShareUrl(url);
              setShowShareModal(true);
            }}
          />

          {/* Notifications Quick Access Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Push Notifications</h4>
                  <p className="text-xs text-slate-500">Receive alerts when new whispers arrive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={notifPermission === "granted" ? handleDisablePush : handleEnablePush}
                disabled={isPushToggling}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                  notifPermission === "granted"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                    : "bg-indigo-600 text-white border-transparent hover:bg-indigo-700"
                )}
              >
                {isPushToggling ? "Saving..." : notifPermission === "granted" ? "Enabled" : "Enable"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: REDESIGNED INBOX (Messages Only Section) */}
      {dashboardTab === "inbox" && (
        <div className="space-y-4 animate-in slide-in-from-right-2 fade-in duration-300 pb-12">
          {/* Header Controls: Search, Mode Filter, Sort, Density, Unread Filter & Select All */}
          <InboxHeader
            inboxView={inboxView}
            setInboxView={(view) => {
              setInboxView(view);
              setSelectedIds(new Set());
            }}
            activeCount={activeCount}
            archivedCount={archivedCount}
            unreadCount={unreadCount}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            layoutDensity={layoutDensity}
            setLayoutDensity={setLayoutDensity}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedModeFilter={selectedModeFilter}
            setSelectedModeFilter={setSelectedModeFilter}
            modeCounts={modeCounts}
            totalFilteredCount={sortedMessages.length}
            isAllSelected={isAllSelected}
            toggleSelectAll={toggleSelectAll}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            onMarkAllRead={handleMarkAllRead}
            isMarkingAllRead={isMarkingAllRead}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
          />

          {/* Floating Bulk Operations Toolbar */}
          <InboxBulkActions
            selectedCount={selectedIds.size}
            inboxView={inboxView}
            onMarkRead={handleBulkMarkRead}
            onArchive={handleBulkArchive}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
          />

          {/* Empty State or Message List */}
          {sortedMessages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-sm my-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center text-3xl">
                {searchQuery ? "🔍" : quickFilter === "UNREAD" ? "✨" : inboxView === "archived" ? "📦" : "💌"}
              </div>
              <div className="max-w-sm mx-auto space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {searchQuery
                    ? "No matches found"
                    : quickFilter === "UNREAD"
                    ? "You're all caught up!"
                    : quickFilter === "TIME_CAPSULE"
                    ? "No locked time capsules"
                    : quickFilter === "HAS_LINK"
                    ? "No whispers with link previews"
                    : quickFilter === "HAS_REACTION"
                    ? "No reacted whispers found"
                    : inboxView === "archived"
                    ? "Archive is empty"
                    : "No whispers received yet"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `No messages matched "${searchQuery}". Try a different keyword or clear search.`
                    : quickFilter !== "ALL"
                    ? "There are no messages matching the currently applied quick filter."
                    : inboxView === "archived"
                    ? "Messages you archive will safely rest here for 30 days before auto-cleanup."
                    : "Share your Whisper link on your WhatsApp Status, Instagram Story, or bio to start receiving secrets!"}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
                {inboxView === "active" && !hasActiveFilters && (
                  <button
                    onClick={() => {
                      setDashboardTab("home");
                      setShowShareModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                  >
                    Share My Link Now
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative z-10 grid gap-3 transition-all",
                layoutDensity === "compact"
                  ? "grid-cols-1"
                  : "grid-cols-1 md:grid-cols-2"
              )}
            >
              <AnimatePresence mode="popLayout">
                {sortedMessages.map((msg) => (
                  <InboxMessageCard
                    key={msg.id}
                    msg={msg}
                    decryptedText={decryptedCache[msg.id]}
                    isSelected={selectedIds.has(msg.id)}
                    layoutDensity={layoutDensity}
                    restrictSenderHints={restrictSenderHints}
                    senderReputation={msg.senderId ? senderReputations[msg.senderId] : msg.rating}
                    onSelect={toggleSelectMessage}
                    onClick={handleMessageClick}
                    onDelete={deleteMsg}
                    onArchiveToggle={handleToggleArchive}
                    onReport={(id, e) => reportMsg(id, e)}
                    onReaction={handleReact}
                    onOpenHint={(m, e) => {
                      e?.stopPropagation();
                      setActiveHintMsg(m);
                    }}
                    onQuickShare={(m, e) => {
                      e?.stopPropagation();
                      handleMessageClick(m);
                    }}
                    archiveDaysRemaining={getArchiveDaysRemaining(msg)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
      
      {/* Redesigned Full-Screen Message Reader Modal */}
      <MessageReaderModal
        message={selectedMessage}
        decryptedText={selectedMessage ? decryptedCache[selectedMessage.id] || "" : ""}
        allMessages={sortedMessages}
        onClose={() => setSelectedMessage(null)}
        onSelectMessage={(msg) => handleMessageClick(msg)}
        onShareToStory={shareToStatus}
        onDownloadPNG={downloadCardImage}
        isExporting={isExporting}
        onOpenHint={(msg) => setActiveHintMsg(msg)}
        restrictSenderHints={restrictSenderHints}
        onReaction={(msgId, reaction, e) => handleReact(msgId, reaction, e)}
        onToggleArchive={(msgId, isArchived, e) => handleToggleArchive(msgId, isArchived, e)}
        onDeleteMessage={(msgId, e) => deleteMsg(msgId, e)}
        onReportMessage={(msgId, e) => reportMsg(msgId, e)}
      />

      {/* Redesigned Sender Hint Fingerprint Modal */}
      <SenderHintModal
        message={activeHintMsg}
        onClose={() => setActiveHintMsg(null)}
      />

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
        modePrompt={modeCustomPrompts[selectedShareMode?.id] || selectedShareMode?.prompt}
        modeIcon={selectedShareMode?.icon}
        onPromptChange={(modeId, newPrompt, newUrl) => {
          setModeCustomPrompts(prev => ({ ...prev, [modeId]: newPrompt }));
          setSelectedShareUrl(newUrl);
        }}
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

      {/* Rate App & Feedback Modal */}
      <RateAppModal
        isOpen={showRateModal}
        onClose={() => {
          setShowRateModal(false);
          snoozeRatingPrompt(3); // Snooze for 3 days if dismissed without rating
        }}
        user={user}
        dbUser={dbUser}
        onRatedSuccess={() => setShowRateModal(false)}
      />
    </div>
  );
}
