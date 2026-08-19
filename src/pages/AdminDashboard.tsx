import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Users, 
  Server, 
  Sliders, 
  Activity, 
  Search, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  LogOut, 
  User, 
  Copy, 
  Check, 
  Database, 
  Bell, 
  Shield, 
  ChevronRight, 
  ExternalLink, 
  Cpu, 
  Clock, 
  Sparkles, 
  Zap, 
  Info, 
  BarChart3, 
  Globe, 
  Radio, 
  UserX, 
  UserCheck, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Menu, 
  X, 
  Wrench, 
  ShieldAlert, 
  ArrowUpRight, 
  Filter,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Mail,
  Sun,
  Moon,
  Star,
  Trash2,
  Heart,
  MessageSquare,
  Terminal,
  Bug,
  FileText
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAssetUrl } from "../lib/assets";
import { motion, AnimatePresence } from "motion/react";
import UserAvatar from "../components/UserAvatar";
import { usePWAUpdate } from "../lib/usePWAUpdate";
import { usePWAInstall } from "../lib/usePWAInstall";
import AppUpdateBanner from "../components/AppUpdateBanner";

const ADMIN_PASSKEY = "Akin$sola@2020";
const SESSION_STORAGE_KEY = "whisper_admin_authenticated";

export interface UserProfileData {
  uid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
  avatarUrl?: string;
  email?: string;
  emailLower?: string;
  bio?: string;
  publicKey?: string;
  createdAt?: any;
  onboardingCompleted?: boolean;
  isLocked?: boolean;
  messageExpiryHours?: number;
}

export interface SystemSettingsData {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementActive: boolean;
  announcementText: string;
  allowRegistrations: boolean;
  maxMessageLength: number;
  defaultExpiryHours: number;
  restrictSenderHints?: boolean;
  lastUpdated?: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: "info" | "warning" | "success" | "danger";
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "danger" | "info" | "warning";
}

export interface RatingData {
  id: string;
  rating: number;
  feedback?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  createdAt?: any;
  deviceInfo?: string;
}

export interface SystemLogRecord {
  id: string;
  message: string;
  stack?: string;
  type: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  username?: string;
  timestamp?: any;
  metadata?: string;
}

export default function AdminDashboard() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
  });
  const [passkeyInput, setPasskeyInput] = useState("");
  const [showPasskey, setShowPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);

  // Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Layout Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ratings" | "system-logs" | "settings" | "updates" | "security">("overview");

  // User Management State
  const [usersList, setUsersList] = useState<UserProfileData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "onboarded" | "locked" | "hasEmail">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [actionUserUid, setActionUserUid] = useState<string | null>(null);

  // Ratings & Feedback State
  const [ratingsList, setRatingsList] = useState<RatingData[]>([]);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<"all" | "5star" | "4star" | "3star" | "low">("all");
  const [ratingSearchQuery, setRatingSearchQuery] = useState("");

  // Remote System Error Logs State
  const [systemLogsList, setSystemLogsList] = useState<SystemLogRecord[]>([]);
  const [isLoadingSystemLogs, setIsLoadingSystemLogs] = useState(false);
  const [systemLogFilter, setSystemLogFilter] = useState<"all" | "runtime-error" | "unhandledrejection" | "react-boundary" | "pwa-error">("all");
  const [systemLogQuery, setSystemLogQuery] = useState("");
  const [selectedSystemLog, setSelectedSystemLog] = useState<SystemLogRecord | null>(null);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettingsData>({
    maintenanceMode: false,
    maintenanceMessage: "Whisper is currently undergoing scheduled infrastructure upgrades. Please check back shortly.",
    announcementActive: false,
    announcementText: "Welcome to Whisper! Enjoy fast, end-to-end encrypted anonymous messaging.",
    allowRegistrations: true,
    maxMessageLength: 800000,
    defaultExpiryHours: 24,
    restrictSenderHints: false,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // PWA Support & Auto-Update Hooks for Admin
  const pwaUpdate = usePWAUpdate();
  const pwaInstall = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  // System Version & Health
  const currentVersion = pwaUpdate.currentVersion || "Whisper v1.0.0";
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      action: "Admin Session Authenticated",
      details: "Passkey verification successful",
      type: "success"
    }
  ]);

  const showToast = (title: string, message: string, type: ToastNotification["type"] = "success") => {
    const newToast: ToastNotification = { id: Date.now().toString(), title, message, type };
    setToasts(prev => [newToast, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4000);
  };

  const addLog = (action: string, details: string, type: AuditLog["type"] = "info") => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      action,
      details,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Check Passkey
  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError("");
    setIsVerifyingPasskey(true);

    setTimeout(() => {
      if (passkeyInput === ADMIN_PASSKEY) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
        setIsAuthenticated(true);
        addLog("Passkey Verified", "Granted access to Whisper Admin Command Center", "success");
        showToast("Access Granted", "Welcome to the Whisper Admin Console", "success");
      } else {
        setPasskeyError("Invalid security passkey. Access denied.");
        addLog("Failed Authentication", "Attempted admin login with incorrect passkey", "danger");
        showToast("Authentication Failed", "Incorrect security passkey provided", "danger");
      }
      setIsVerifyingPasskey(false);
    }, 300);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    setPasskeyInput("");
  };

  // Fetch Ratings
  const fetchRatings = async () => {
    setIsLoadingRatings(true);
    try {
      const snap = await getDocs(collection(db, "ratings"));
      const list: RatingData[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RatingData);
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setRatingsList(list);
      addLog("Ratings Sync", `Retrieved ${list.length} rating & feedback record(s)`, "info");
    } catch (err: any) {
      console.error("Failed to fetch ratings:", err);
      addLog("Fetch Ratings Failure", err?.message || "Error reading ratings collection", "danger");
      showToast("Sync Error", "Could not fetch ratings from Firestore", "danger");
    } finally {
      setIsLoadingRatings(false);
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    if (!window.confirm("Are you sure you want to delete this user rating?")) return;
    try {
      await deleteDoc(doc(db, "ratings", ratingId));
      setRatingsList(prev => prev.filter(r => r.id !== ratingId));
      showToast("Rating Deleted", "Feedback entry removed successfully.", "info");
      addLog("Delete Rating", `Deleted rating record ${ratingId}`, "info");
    } catch (err: any) {
      showToast("Delete Failed", err?.message || "Could not delete rating document.", "danger");
    }
  };

  const handleExportRatings = () => {
    if (ratingsList.length === 0) return;
    const headers = ["ID", "Rating", "Username", "Display Name", "Feedback", "Device Info", "Date"];
    const rows = ratingsList.map(r => [
      r.id,
      r.rating,
      r.username || "Anonymous",
      r.displayName || "",
      (r.feedback || "").replace(/"/g, '""'),
      r.deviceInfo || "",
      r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whisper_ratings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export Complete", `Exported ${ratingsList.length} rating records to CSV`, "success");
  };

  // Fetch Remote System Error Logs
  const fetchSystemLogs = async () => {
    setIsLoadingSystemLogs(true);
    try {
      const snap = await getDocs(collection(db, "system-logs"));
      const list: SystemLogRecord[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SystemLogRecord);
      });
      list.sort((a, b) => {
        const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (typeof a.timestamp === "number" ? a.timestamp : 0);
        const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (typeof b.timestamp === "number" ? b.timestamp : 0);
        return tB - tA;
      });
      setSystemLogsList(list);
      addLog("System Logs Sync", `Retrieved ${list.length} remote client error log(s)`, "info");
    } catch (err: any) {
      console.error("Failed to fetch system logs:", err);
      addLog("Fetch System Logs Failure", err?.message || "Error reading system-logs collection", "danger");
      showToast("Sync Error", "Could not fetch system error logs from Firestore", "danger");
    } finally {
      setIsLoadingSystemLogs(false);
    }
  };

  const handleDeleteSystemLog = async (logId: string) => {
    if (!window.confirm("Are you sure you want to delete this system error record?")) return;
    try {
      await deleteDoc(doc(db, "system-logs", logId));
      setSystemLogsList(prev => prev.filter(l => l.id !== logId));
      if (selectedSystemLog?.id === logId) setSelectedSystemLog(null);
      showToast("Log Record Removed", "Error log deleted from Firestore.", "info");
      addLog("Delete Error Log", `Deleted system log ${logId}`, "info");
    } catch (err: any) {
      showToast("Delete Failed", err?.message || "Could not delete log document.", "danger");
    }
  };

  const handleExportSystemLogs = () => {
    if (systemLogsList.length === 0) return;
    const headers = ["ID", "Type", "Error Message", "User ID", "Username", "URL", "User Agent", "Timestamp"];
    const rows = systemLogsList.map(l => [
      l.id,
      l.type,
      (l.message || "").replace(/"/g, '""'),
      l.userId || "",
      l.username || "",
      l.url || "",
      (l.userAgent || "").replace(/"/g, '""'),
      l.timestamp?.seconds ? new Date(l.timestamp.seconds * 1000).toISOString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whisper_system_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export Complete", `Exported ${systemLogsList.length} system log records to CSV`, "success");
  };

  const handleClearAllSystemLogs = async () => {
    if (systemLogsList.length === 0) return;
    if (!window.confirm(`Are you sure you want to purge ALL ${systemLogsList.length} system error log records?`)) return;
    try {
      const promises = systemLogsList.map(l => deleteDoc(doc(db, "system-logs", l.id)));
      await Promise.all(promises);
      setSystemLogsList([]);
      setSelectedSystemLog(null);
      showToast("Logs Purged", "All remote client error logs cleared.", "success");
      addLog("Purge System Logs", "Cleared system-logs collection in Firestore", "warning");
    } catch (err: any) {
      showToast("Purge Failed", err?.message || "Error purging system logs", "danger");
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: UserProfileData[] = [];
      snap.forEach(docSnap => {
        list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfileData);
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setUsersList(list);
      addLog("Users Directory Sync", `Retrieved ${list.length} user record(s)`, "info");
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      addLog("Fetch Users Failure", err?.message || "Error reading users collection", "danger");
      showToast("Sync Error", "Could not fetch user directory from Firestore", "danger");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch System Settings
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const docRef = doc(db, "systemSettings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettingsData;
        setSettings({
          maintenanceMode: !!data.maintenanceMode,
          maintenanceMessage: data.maintenanceMessage || settings.maintenanceMessage,
          announcementActive: !!data.announcementActive,
          announcementText: data.announcementText || settings.announcementText,
          allowRegistrations: data.allowRegistrations !== false,
          maxMessageLength: data.maxMessageLength || 800000,
          defaultExpiryHours: data.defaultExpiryHours || 24,
          restrictSenderHints: !!data.restrictSenderHints,
        });
      }
    } catch (err) {
      console.warn("Using default system settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);

    try {
      const docRef = doc(db, "systemSettings", "global");
      await setDoc(docRef, {
        ...settings,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      addLog("Settings Saved", "System configuration updated in Firestore", "success");
      showToast("Settings Updated", "Global system parameters synchronized successfully", "success");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      addLog("Save Settings Error", err?.message || "Could not write systemSettings document", "danger");
      showToast("Save Failed", err?.message || "Failed to update system settings", "danger");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle Lock / Suspend User
  const handleToggleLockUser = async (userToLock: UserProfileData) => {
    setActionUserUid(userToLock.uid);
    const newStatus = !userToLock.isLocked;

    try {
      await updateDoc(doc(db, "users", userToLock.uid), {
        isLocked: newStatus,
        updatedAt: serverTimestamp()
      });

      // Optimistic update local state
      setUsersList(prev => prev.map(u => u.uid === userToLock.uid ? { ...u, isLocked: newStatus } : u));
      if (selectedUser && selectedUser.uid === userToLock.uid) {
        setSelectedUser(prev => prev ? { ...prev, isLocked: newStatus } : null);
      }

      const actionText = newStatus ? "suspended" : "reactivated";
      showToast(
        newStatus ? "Account Suspended" : "Account Reactivated",
        `User @${userToLock.username || userToLock.uid} has been ${actionText}.`,
        newStatus ? "warning" : "success"
      );

      addLog(
        newStatus ? "Account Suspended" : "Account Reactivated",
        `User: @${userToLock.username || "unnamed"} (${userToLock.uid})`,
        newStatus ? "warning" : "success"
      );
    } catch (err: any) {
      console.error("Error updating user lock status:", err);
      showToast("Operation Failed", err?.message || "Failed to update account status in Firestore", "danger");
      addLog("Lock User Error", err?.message || "Failed to toggle user lock state", "danger");
    } finally {
      setActionUserUid(null);
    }
  };

  // Database Latency Test
  const runLatencyTest = async () => {
    setIsTestingLatency(true);
    const start = performance.now();
    try {
      await getDoc(doc(db, "systemSettings", "global"));
      const end = performance.now();
      const duration = Math.round(end - start);
      setDbLatency(duration);
    } catch (err: any) {
      setDbLatency(-1);
    } finally {
      setIsTestingLatency(false);
    }
  };

  // Check System & PWA Updates
  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const found = await pwaUpdate.checkForUpdate();
      if (found) {
        showToast("Update Ready", "A new production build has been downloaded and is ready to install!", "warning");
        addLog("Update Check", "New production release detected and staged for installation.", "warning");
      } else {
        showToast("System Up to Date", `Whisper Admin ${currentVersion} is running the latest production build.`, "info");
        addLog("Update Check", "Build version verified against production release channel.", "info");
      }
    } catch (err: any) {
      showToast("Update Check", "Build check completed against live service worker.", "info");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Hard Purge Stale Cache & Resync
  const handlePurgeCache = async () => {
    setIsPurgingCache(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      showToast("Cache Purged", "All cached assets cleared. Reloading with fresh production files...", "success");
      addLog("Cache Purge", "Admin triggered manual cache clear and service worker resync.", "info");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast("Cache Purge Error", err.message || "Failed to purge cache.", "danger");
      setIsPurgingCache(false);
    }
  };

  // Install Admin PWA Handler
  const handleInstallAdmin = async () => {
    if (pwaInstall.isInstallable) {
      const accepted = await pwaInstall.triggerInstall();
      if (accepted) {
        showToast("App Installed", "Whisper Admin Console added to your home screen / desktop.", "success");
      }
    } else if (pwaInstall.isIOSDevice) {
      setShowIOSGuide(true);
    } else {
      showToast("Install Info", "Admin console is ready to install from your browser menu ('Add to Home screen' or 'Install app').", "info");
    }
  };

  // Export Users CSV
  const handleExportUsers = () => {
    if (usersList.length === 0) return;
    const headers = ["UID", "Username", "Display Name", "Email", "Onboarding Completed", "Locked / Suspended", "Created At"];
    const rows = usersList.map(u => [
      u.uid,
      u.username || "",
      u.displayName || "",
      u.email || "",
      u.onboardingCompleted ? "Yes" : "No",
      u.isLocked ? "Yes" : "No",
      u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toISOString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whisper_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export Complete", `Exported ${usersList.length} user records to CSV`, "success");
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(id);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Load Initial Admin Data
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchSettings();
      fetchRatings();
      fetchSystemLogs();
      runLatencyTest();
    }
  }, [isAuthenticated]);

  // Filtered System Error Logs
  const filteredSystemLogs = systemLogsList.filter(l => {
    const q = systemLogQuery.toLowerCase().trim();
    const matchesQuery = 
      !q ||
      l.message?.toLowerCase().includes(q) ||
      l.type?.toLowerCase().includes(q) ||
      l.url?.toLowerCase().includes(q) ||
      l.username?.toLowerCase().includes(q) ||
      l.userId?.toLowerCase().includes(q) ||
      l.id?.toLowerCase().includes(q) ||
      (l.stack && l.stack.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (systemLogFilter === "runtime-error") return l.type === "runtime-error";
    if (systemLogFilter === "unhandledrejection") return l.type === "unhandledrejection";
    if (systemLogFilter === "react-boundary") return l.type === "react-boundary";
    if (systemLogFilter === "pwa-error") return l.type === "pwa-error";
    return true;
  });

  // Filtered Users
  const filteredUsers = usersList.filter(u => {
    const queryLower = userSearchQuery.toLowerCase().trim();
    const matchesSearch = 
      !queryLower ||
      u.username?.toLowerCase().includes(queryLower) ||
      u.displayName?.toLowerCase().includes(queryLower) ||
      u.email?.toLowerCase().includes(queryLower) ||
      u.uid?.toLowerCase().includes(queryLower);

    if (!matchesSearch) return false;

    if (userFilter === "onboarded") return u.onboardingCompleted;
    if (userFilter === "locked") return u.isLocked;
    if (userFilter === "hasEmail") return !!u.email;
    return true;
  });

  // Filtered Ratings
  const filteredRatings = ratingsList.filter(r => {
    const queryLower = ratingSearchQuery.toLowerCase().trim();
    const matchesSearch = 
      !queryLower ||
      r.username?.toLowerCase().includes(queryLower) ||
      r.displayName?.toLowerCase().includes(queryLower) ||
      r.feedback?.toLowerCase().includes(queryLower) ||
      r.deviceInfo?.toLowerCase().includes(queryLower);

    if (!matchesSearch) return false;

    if (ratingFilter === "5star") return r.rating === 5;
    if (ratingFilter === "4star") return r.rating === 4;
    if (ratingFilter === "3star") return r.rating === 3;
    if (ratingFilter === "low") return r.rating <= 2;
    return true;
  });

  // Stats
  const totalUsersCount = usersList.length;
  const onboardedCount = usersList.filter(u => u.onboardingCompleted).length;
  const usersWithEmailCount = usersList.filter(u => u.email).length;
  const lockedUsersCount = usersList.filter(u => u.isLocked).length;

  // Rating Metrics
  const avgRatingScore = ratingsList.length > 0 
    ? (ratingsList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratingsList.length).toFixed(1)
    : "0.0";
  const count5Star = ratingsList.filter(r => r.rating === 5).length;
  const count4Star = ratingsList.filter(r => r.rating === 4).length;
  const count3Star = ratingsList.filter(r => r.rating === 3).length;
  const count2Star = ratingsList.filter(r => r.rating === 2).length;
  const count1Star = ratingsList.filter(r => r.rating === 1).length;
  const feedbackTextCount = ratingsList.filter(r => r.feedback && r.feedback.trim().length > 0).length;

  // Passkey Login View (Light/Dark Clean Theme)
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 pt-[max(2rem,calc(1.5rem+env(safe-area-inset-top,0px)))] pb-[max(2rem,calc(1.5rem+env(safe-area-inset-bottom,0px)))] font-sans ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl relative overflow-hidden space-y-6 ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-white border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto p-2 shadow-lg shadow-indigo-500/10">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Security Gateway
              </span>
              <h1 className="text-2xl font-black tracking-tight">Whisper Admin Console</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Authorized access route: <code className="text-indigo-600 dark:text-indigo-400 font-mono">/admin/unknownofrun</code></p>
            </div>
          </div>

          <form onSubmit={handlePasskeySubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Passkey Credential
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? "text" : "password"}
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter security passkey..."
                  required
                  autoFocus
                  className={`w-full pl-10 pr-12 py-3.5 border focus:border-indigo-600 rounded-2xl text-sm font-mono outline-none transition-all ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passkeyError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passkeyError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingPasskey}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isVerifyingPasskey ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Passkey...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Access Admin Console
                </>
              )}
            </button>
          </form>

          {/* Optional Quick PWA Install button on Login Screen */}
          {pwaInstall.isInstallable && (
            <button
              onClick={handleInstallAdmin}
              className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Whisper Admin PWA</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-between">
            <span>Whisper Security Suite</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Sidebar Items
  const navigationItems = [
    { id: "overview", label: "Dashboard Overview", icon: BarChart3, badge: null },
    { id: "users", label: "User Directory", icon: Users, badge: totalUsersCount },
    { id: "ratings", label: "Ratings & Feedback", icon: Star, badge: ratingsList.length },
    { id: "system-logs", label: "System Error Logs", icon: Bug, badge: systemLogsList.length > 0 ? systemLogsList.length : null },
    { id: "settings", label: "System Controls", icon: Sliders, badge: settings.maintenanceMode ? "MAINT" : null },
    { id: "updates", label: "Platform & Builds", icon: Cpu, badge: currentVersion },
    { id: "security", label: "Audit & Event Logs", icon: Shield, badge: logs.length },
  ];

  const mainContainerClasses = isDarkMode 
    ? "bg-slate-950 text-slate-100" 
    : "bg-slate-50/70 text-slate-900";

  const cardClasses = isDarkMode 
    ? "bg-slate-900 border-slate-800" 
    : "bg-white border-slate-200/90 shadow-sm";

  return (
    <div className={`min-h-screen flex font-sans selection:bg-indigo-600 selection:text-white ${mainContainerClasses}`}>
      
      {/* FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed top-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`p-4 rounded-2xl border shadow-xl pointer-events-auto flex items-start gap-3 backdrop-blur-xl ${
                toast.type === "success" 
                  ? "bg-emerald-500/95 text-white border-emerald-400" 
                  : toast.type === "warning"
                  ? "bg-amber-500/95 text-white border-amber-400"
                  : toast.type === "danger"
                  ? "bg-rose-500/95 text-white border-rose-400"
                  : "bg-indigo-600/95 text-white border-indigo-400"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
              {toast.type === "warning" && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              {toast.type === "danger" && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              {toast.type === "info" && <Info className="w-5 h-5 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className="font-bold text-xs">{toast.title}</div>
                <div className="text-[11px] opacity-90 leading-tight mt-0.5">{toast.message}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden md:flex flex-col border-r backdrop-blur-xl transition-all duration-300 z-30 relative shrink-0 ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200/90"
        } ${sidebarOpen ? "w-64" : "w-20"}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-white rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0 shadow-sm">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {sidebarOpen && (
              <div className="truncate">
                <div className="font-bold text-sm tracking-tight leading-none text-slate-900 dark:text-white">Whisper Admin</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-1 font-semibold">Console Control</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Maintenance Banner */}
        {settings.maintenanceMode && sidebarOpen && (
          <div className="mx-3 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
            <Wrench className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="font-bold text-[11px]">Maintenance Mode Active</span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : isDarkMode 
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600"}`} />
                {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                {sidebarOpen && item.badge !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : item.badge === "MAINT" 
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${
            isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200/80"
          }`}>
            {sidebarOpen && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  A
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold truncate text-slate-900 dark:text-white">Admin Session</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Akin$sola@2020</div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed left-0 top-0 bottom-0 w-72 border-r z-50 md:hidden flex flex-col pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))] pb-[max(0.5rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] ${
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl p-1 border border-slate-200 dark:border-slate-800">
                    <img src={getAssetUrl("android-chrome-192x192.png")} alt="Whisper" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-sm">Whisper Admin</span>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                        isActive ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out Session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top App Header */}
        <header className={`sticky top-0 z-20 border-b px-4 sm:px-8 pb-3.5 pt-[max(0.875rem,calc(0.875rem+env(safe-area-inset-top,0px)))] flex items-center justify-between backdrop-blur-xl transition-all ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200/90 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Whisper</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              <span className="font-bold capitalize text-slate-900 dark:text-white">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "users" && "User Directory & Account Locks"}
                {activeTab === "ratings" && "Ratings, Feedback & User Satisfaction"}
                {activeTab === "settings" && "System Controls & Maintenance"}
                {activeTab === "updates" && "Platform, PWA & Builds"}
                {activeTab === "security" && "Audit Logs & Security"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick PWA Install Header Button */}
            {(pwaInstall.isInstallable || (!pwaInstall.isInstalled && pwaInstall.isIOSDevice)) && (
              <button
                onClick={handleInstallAdmin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Install Whisper Admin PWA App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Admin App</span>
              </button>
            )}

            {/* PWA Update Ready Action */}
            {pwaUpdate.updateAvailable && (
              <button
                onClick={pwaUpdate.applyUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold animate-pulse shadow-md cursor-pointer transition-colors"
                title="A new website update is ready! Click to apply now"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update Ready</span>
              </button>
            )}

            {/* DB Health Badge */}
            <button
              onClick={runLatencyTest}
              disabled={isTestingLatency}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300"
              title="Click to ping Firestore"
            >
              <Radio className={`w-3.5 h-3.5 ${isTestingLatency ? "animate-pulse text-indigo-600" : "text-emerald-500"}`} />
              <span>{dbLatency !== null ? (dbLatency >= 0 ? `${dbLatency}ms` : "Error") : "Ping..."}</span>
            </button>

            {/* Maintenance Mode Status Pill */}
            {settings.maintenanceMode ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl">
                <Wrench className="w-3.5 h-3.5 animate-pulse" /> Maintenance
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> System Live
              </span>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              title="Toggle Light / Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Refresh Data */}
            <button
              onClick={() => {
                fetchUsers();
                fetchSettings();
                fetchRatings();
                runLatencyTest();
                showToast("Refreshed", "Dashboard data synchronized", "info");
              }}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              title="Refresh All Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Total Registered Users</span>
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{isLoadingUsers ? "..." : totalUsersCount}</div>
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Live</span> Firestore records
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Active Profile Setups</span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{isLoadingUsers ? "..." : onboardedCount}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {totalUsersCount > 0 ? `${Math.round((onboardedCount / totalUsersCount) * 100)}% onboarding completed` : "0%"}
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Recovery Emails</span>
                    <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{isLoadingUsers ? "..." : usersWithEmailCount}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Accounts with linked email
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Suspended Accounts</span>
                    <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
                      <UserX className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{isLoadingUsers ? "..." : lockedUsersCount}</div>
                  <div className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {lockedUsersCount > 0 ? `${lockedUsersCount} locked by admin` : "Zero suspended accounts"}
                  </div>
                </div>

              </div>

              {/* Engine Status & Maintenance Quick Switch */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="font-bold text-base text-slate-900 dark:text-white">Engine Health & Infrastructure</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                      Build {currentVersion}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-slate-500">Database Backend</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">Firestore (default)</p>
                      <p className="text-[10px] text-slate-400">Security rules deployed & verified</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-slate-500">End-to-End Encryption</span>
                      <p className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">RSA-OAEP 2048 / AES-256</p>
                      <p className="text-[10px] text-slate-400">Zero-knowledge client payloads</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-slate-500">New Registrations</span>
                      <p className={`font-mono font-bold text-sm ${settings.allowRegistrations ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {settings.allowRegistrations ? "Allowed" : "Disabled"}
                      </p>
                      <p className="text-[10px] text-slate-400">Controlled in System Controls tab</p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 text-slate-100">
                      <span className="text-slate-400">Admin Security</span>
                      <p className="font-mono font-bold text-indigo-400 text-sm">Passkey Auth Active</p>
                      <p className="text-[10px] text-slate-500">Session storage persistence</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${cardClasses}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h2 className="font-bold text-base text-slate-900 dark:text-white">Maintenance Switch</h2>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Toggle maintenance mode to redirect all non-admin visitors to the dedicated Maintenance screen.
                    </p>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Maintenance Mode</span>
                        <button
                          onClick={() => {
                            const updated = !settings.maintenanceMode;
                            setSettings(s => ({ ...s, maintenanceMode: updated }));
                            handleSaveSettings();
                          }}
                          className={`w-12 h-6 rounded-full p-1 transition-colors ${
                            settings.maintenanceMode ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-800"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            settings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${settings.maintenanceMode ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
                        <span>Status: {settings.maintenanceMode ? "Redirect Active" : "Live Normal Browsing"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExportUsers}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" /> Export Users Backup (CSV)
                  </button>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: USER DIRECTORY & LOCKS */}
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              {/* Search & Filter Header */}
              <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cardClasses}`}>
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search handle, email, UID..."
                    className={`w-full pl-10 pr-4 py-2 border focus:border-indigo-600 rounded-2xl text-xs outline-none transition-all ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: `All (${totalUsersCount})` },
                    { id: "onboarded", label: `Onboarded (${onboardedCount})` },
                    { id: "hasEmail", label: `Has Email (${usersWithEmailCount})` },
                    { id: "locked", label: `Suspended (${lockedUsersCount})` },
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setUserFilter(filter.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        userFilter === filter.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Users Table */}
              <div className={`rounded-3xl border overflow-hidden ${cardClasses}`}>
                {isLoadingUsers ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Fetching users from Firestore...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No matching user records found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold">
                          <th className="p-4">User Handle & Name</th>
                          <th className="p-4">Email Address</th>
                          <th className="p-4">User ID (UID)</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Registered</th>
                          <th className="p-4 text-right">Suspend / Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredUsers.map((user) => (
                          <tr key={user.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  photoURL={user.photoURL}
                                  avatarUrl={user.avatarUrl}
                                  name={user.displayName}
                                  username={user.username}
                                  size="sm"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>@{user.username || "unnamed"}</span>
                                    {user.isLocked && (
                                      <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] rounded-full border border-rose-200 dark:border-rose-500/20 font-bold">
                                        Suspended
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400">{user.displayName || "No display name"}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              {user.email ? user.email : <span className="text-slate-400 italic">None</span>}
                            </td>

                            <td className="p-4 font-mono text-[11px] text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[110px]" title={user.uid}>{user.uid}</span>
                                <button
                                  onClick={() => handleCopy(user.uid, `uid-${user.uid}`)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                                  title="Copy UID"
                                >
                                  {copiedUid === `uid-${user.uid}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            <td className="p-4">
                              {user.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full text-[10px] font-bold">
                                  <Lock className="w-3 h-3" /> Locked
                                </span>
                              ) : user.onboardingCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-[10px] font-bold">
                                  <CheckCircle className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full text-[10px] font-bold">
                                  <Clock className="w-3 h-3" /> Pending Setup
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-slate-400 text-[11px]">
                              {user.createdAt?.seconds 
                                ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                                : "N/A"
                              }
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                                >
                                  <Info className="w-3.5 h-3.5" /> Inspect
                                </button>

                                {/* EXPLICIT SUSPEND / UNLOCK TOGGLE BUTTON WITH SPINNER */}
                                <button
                                  onClick={() => handleToggleLockUser(user)}
                                  disabled={actionUserUid === user.uid}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                                    user.isLocked
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                                      : "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                                  }`}
                                  title={user.isLocked ? "Unlock and Reactivate Account" : "Lock and Suspend Account"}
                                >
                                  {actionUserUid === user.uid ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : user.isLocked ? (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" /> Reactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-3.5 h-3.5" /> Suspend
                                    </>
                                  )}
                                </button>

                                {user.username && (
                                  <Link
                                    to={`/u/${user.username}`}
                                    target="_blank"
                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                                    title="View Public Profile"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* TAB: RATINGS & FEEDBACK */}
          {activeTab === "ratings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Ratings KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Average Rating Score</span>
                    <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-200 dark:border-amber-500/20">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{avgRatingScore}</span>
                    <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star 
                        key={s} 
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(Number(avgRatingScore)) 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-slate-300 dark:text-slate-700"
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Total Rating Responses</span>
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{ratingsList.length}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    User ratings recorded in Firestore
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>5-Star Loved Ratings</span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{count5Star}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {ratingsList.length > 0 ? `${Math.round((count5Star / ratingsList.length) * 100)}% 5-star score` : "0%"}
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${cardClasses}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
                    <span>Written Comments</span>
                    <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{feedbackTextCount}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Detailed user feedback entries
                  </div>
                </div>

              </div>

              {/* Star Rating Breakdown Bar */}
              <div className={`p-6 rounded-3xl border ${cardClasses}`}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span>Rating Breakdown Distribution</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  {[
                    { stars: 5, count: count5Star, color: "bg-amber-400" },
                    { stars: 4, count: count4Star, color: "bg-indigo-500" },
                    { stars: 3, count: count3Star, color: "bg-purple-500" },
                    { stars: 2, count: count2Star, color: "bg-rose-400" },
                    { stars: 1, count: count1Star, color: "bg-rose-600" },
                  ].map((row) => {
                    const pct = ratingsList.length > 0 ? Math.round((row.count / ratingsList.length) * 100) : 0;
                    return (
                      <div key={row.stars} className="flex items-center gap-3">
                        <span className="w-16 font-bold flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <span>{row.stars}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${row.color} transition-all duration-500`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                        <span className="w-16 text-right font-mono text-slate-500">
                          {row.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Search, Filter & Export */}
              <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cardClasses}`}>
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={ratingSearchQuery}
                    onChange={(e) => setRatingSearchQuery(e.target.value)}
                    placeholder="Search feedback comment, handle, device..."
                    className={`w-full pl-10 pr-4 py-2 border focus:border-indigo-600 rounded-2xl text-xs outline-none transition-all ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: `All (${ratingsList.length})` },
                    { id: "5star", label: `5 Stars (${count5Star})` },
                    { id: "4star", label: `4 Stars (${count4Star})` },
                    { id: "3star", label: `3 Stars (${count3Star})` },
                    { id: "low", label: `Low Ratings (${count2Star + count1Star})` },
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setRatingFilter(filter.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        ratingFilter === filter.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}

                  <button
                    onClick={handleExportRatings}
                    disabled={ratingsList.length === 0}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-indigo-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>

              </div>

              {/* Ratings List Table */}
              <div className={`rounded-3xl border overflow-hidden ${cardClasses}`}>
                {isLoadingRatings ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Fetching ratings & feedback from Firestore...</p>
                  </div>
                ) : filteredRatings.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Star className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No ratings match your filter</p>
                    <p className="text-xs text-slate-400">Users will see rating prompts as they interact with Whisper.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold">
                          <th className="p-4">User</th>
                          <th className="p-4">Rating</th>
                          <th className="p-4">Feedback Comment</th>
                          <th className="p-4">Device</th>
                          <th className="p-4">Submitted At</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredRatings.map((ratingDoc) => (
                          <tr key={ratingDoc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20">
                                  {ratingDoc.username?.[0]?.toUpperCase() || "A"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    @{ratingDoc.username || "Anonymous"}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {ratingDoc.displayName || "Whisper User"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star 
                                    key={s} 
                                    className={`w-3.5 h-3.5 ${
                                      s <= ratingDoc.rating 
                                        ? "fill-amber-400 text-amber-400" 
                                        : "text-slate-300 dark:text-slate-700"
                                    }`} 
                                  />
                                ))}
                                <span className="ml-1 font-bold text-slate-700 dark:text-slate-300">{ratingDoc.rating}/5</span>
                              </div>
                            </td>

                            <td className="p-4 max-w-xs">
                              {ratingDoc.feedback ? (
                                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 italic text-[11px] leading-relaxed">
                                  "{ratingDoc.feedback}"
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No written feedback</span>
                              )}
                            </td>

                            <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px]">
                              {ratingDoc.deviceInfo || "Web App"}
                            </td>

                            <td className="p-4 text-slate-400 text-[11px]">
                              {ratingDoc.createdAt?.seconds 
                                ? new Date(ratingDoc.createdAt.seconds * 1000).toLocaleString()
                                : "Just now"
                              }
                            </td>

                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteRating(ratingDoc.id)}
                                className="p-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                                title="Delete rating entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* TAB: SYSTEM ERROR LOGS */}
          {activeTab === "system-logs" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Header & Controls */}
              <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardClasses}`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Remote System Error Logs</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                        {systemLogsList.length} captured
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">Automated client-side runtime errors and PWA diagnostics sent to Firestore</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={fetchSystemLogs}
                    disabled={isLoadingSystemLogs}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Refresh logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSystemLogs ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleExportSystemLogs}
                    disabled={systemLogsList.length === 0}
                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleClearAllSystemLogs}
                    disabled={systemLogsList.length === 0}
                    className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge All</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cardClasses}`}>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={systemLogQuery}
                    onChange={(e) => setSystemLogQuery(e.target.value)}
                    placeholder="Search error message, stack, URL, UID..."
                    className={`w-full pl-10 pr-4 py-2 border focus:border-indigo-600 rounded-2xl text-xs outline-none transition-all ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: `All (${systemLogsList.length})` },
                    { id: "runtime-error", label: `Runtime (${systemLogsList.filter(l => l.type === "runtime-error").length})` },
                    { id: "unhandledrejection", label: `Rejections (${systemLogsList.filter(l => l.type === "unhandledrejection").length})` },
                    { id: "react-boundary", label: `React Boundary (${systemLogsList.filter(l => l.type === "react-boundary").length})` },
                    { id: "pwa-error", label: `PWA/Worker (${systemLogsList.filter(l => l.type === "pwa-error").length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSystemLogFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        systemLogFilter === f.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Logs Table */}
              <div className={`rounded-3xl border overflow-hidden ${cardClasses}`}>
                {isLoadingSystemLogs ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Reading system logs from Firestore...</p>
                  </div>
                ) : filteredSystemLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Bug className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No system error logs found</p>
                    <p className="text-xs text-slate-400">Client-side runtime errors and rejections will automatically be logged here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold">
                          <th className="p-4">Log ID & Type</th>
                          <th className="p-4">Error Message</th>
                          <th className="p-4">Trigger User</th>
                          <th className="p-4">URL Origin</th>
                          <th className="p-4">Logged At</th>
                          <th className="p-4 text-right">Inspect & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredSystemLogs.map((logItem) => {
                          let typeBadgeColor = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
                          if (logItem.type === "runtime-error") typeBadgeColor = "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800";
                          if (logItem.type === "unhandledrejection") typeBadgeColor = "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800";
                          if (logItem.type === "react-boundary") typeBadgeColor = "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800";
                          if (logItem.type === "pwa-error") typeBadgeColor = "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800";

                          return (
                            <tr key={logItem.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="p-4">
                                <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono inline-block ${typeBadgeColor}`}>
                                    {logItem.type}
                                  </span>
                                  <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={logItem.id}>
                                    {logItem.id}
                                  </div>
                                </div>
                              </td>

                              <td className="p-4 max-w-xs">
                                <p className="font-semibold text-slate-900 dark:text-white line-clamp-2 break-all text-[11px]">
                                  {logItem.message}
                                </p>
                              </td>

                              <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                <div>@{logItem.username || "anonymous"}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{logItem.userId || "N/A"}</div>
                              </td>

                              <td className="p-4 text-slate-500 text-[11px] max-w-[160px] truncate" title={logItem.url}>
                                {logItem.url ? logItem.url.replace(/^https?:\/\/[^\/]+/, '') : "N/A"}
                              </td>

                              <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">
                                {logItem.timestamp?.seconds
                                  ? new Date(logItem.timestamp.seconds * 1000).toLocaleString()
                                  : "Just now"}
                              </td>

                              <td className="p-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedSystemLog(logItem)}
                                    className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Terminal className="w-3.5 h-3.5" /> Inspect
                                  </button>

                                  <button
                                    onClick={() => handleDeleteSystemLog(logItem.id)}
                                    className="p-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
                                    title="Delete error log record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* TAB 3: SYSTEM CONTROLS & SETTINGS */}
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Global Maintenance Mode */}
                <div className={`p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">Global Maintenance Redirect</h2>
                        <p className="text-xs text-slate-500">Redirects all non-admin traffic to the standalone Maintenance screen.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        settings.maintenanceMode ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.maintenanceMode ? "translate-x-7" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Maintenance Notice Message
                    </label>
                    <textarea
                      rows={3}
                      value={settings.maintenanceMessage}
                      onChange={(e) => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                      placeholder="Message shown to visitors when maintenance mode is active..."
                      className={`w-full p-3.5 border focus:border-indigo-600 rounded-2xl text-xs outline-none transition-all ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Announcement Banner */}
                <div className={`p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">Global Announcement Banner</h2>
                        <p className="text-xs text-slate-500">Broadcasts a notification banner across the top header for all users.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, announcementActive: !s.announcementActive }))}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        settings.announcementActive ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.announcementActive ? "translate-x-7" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Announcement Banner Text
                    </label>
                    <input
                      type="text"
                      value={settings.announcementText}
                      onChange={(e) => setSettings(s => ({ ...s, announcementText: e.target.value }))}
                      placeholder="e.g. Welcome to Whisper! E2E encryption is active."
                      className={`w-full px-4 py-3 border focus:border-indigo-600 rounded-2xl text-xs outline-none transition-all ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Restrict Sender Hints & Digital Fingerprints */}
                <div className={`p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <EyeOff className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">Restrict Sender Hints & Info</h2>
                        <p className="text-xs text-slate-500">Hide the "Hint" button and digital fingerprint popup across user dashboards.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, restrictSenderHints: !s.restrictSenderHints }))}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        settings.restrictSenderHints ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.restrictSenderHints ? "translate-x-7" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Feature Status:</span>
                    {settings.restrictSenderHints ? (
                      <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5" /> Hints Restricted (Hidden)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Hints Active & Visible
                      </span>
                    )}
                  </div>
                </div>

                {/* Sign-ups & Limits */}
                <div className={`p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white mb-2">Registration & Message Limits</h2>

                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">Allow New User Sign-ups</div>
                      <div className="text-[11px] text-slate-500">Enable or disable new user account creation.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, allowRegistrations: !s.allowRegistrations }))}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${
                        settings.allowRegistrations ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.allowRegistrations ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Max Message Character Limit
                      </label>
                      <input
                        type="number"
                        value={settings.maxMessageLength}
                        onChange={(e) => setSettings(s => ({ ...s, maxMessageLength: parseInt(e.target.value) || 800000 }))}
                        className={`w-full px-4 py-3 border focus:border-indigo-600 rounded-2xl text-xs outline-none font-mono ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Default Message Expiry (Hours)
                      </label>
                      <input
                        type="number"
                        value={settings.defaultExpiryHours}
                        onChange={(e) => setSettings(s => ({ ...s, defaultExpiryHours: parseInt(e.target.value) || 24 }))}
                        className={`w-full px-4 py-3 border focus:border-indigo-600 rounded-2xl text-xs outline-none font-mono ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving Settings...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Synchronize System Controls
                      </>
                    )}
                  </button>
                </div>

              </form>

            </motion.div>
          )}

          {/* TAB 4: PLATFORM, PWA & BUILDS */}
          {activeTab === "updates" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* ADMIN PWA APPLICATION CARD */}
              <div className={`p-6 rounded-3xl border space-y-6 ${cardClasses}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">Admin Console PWA App</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Separate Admin Manifest
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Standalone progressive web app installation and auto-update control.</p>
                    </div>
                  </div>

                  <div>
                    {pwaInstall.isInstalled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Standalone App Installed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold">
                        <Globe className="w-3.5 h-3.5" /> Running in Web Browser
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status & Install Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">PWA Status</span>
                      <span className="text-[11px] font-mono text-slate-500">manifest-admin.json</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Install Whisper Admin Console as a standalone, distraction-free desktop or mobile application with dedicated full-screen access.
                    </p>
                    <div className="pt-1">
                      {pwaInstall.isInstalled ? (
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> This admin console is already installed on this device.
                        </div>
                      ) : pwaInstall.isInstallable ? (
                        <button
                          onClick={handleInstallAdmin}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" /> Install Admin Console App
                        </button>
                      ) : pwaInstall.isIOSDevice ? (
                        <button
                          onClick={() => setShowIOSGuide(true)}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" /> iOS Add to Home Screen Guide
                        </button>
                      ) : (
                        <div className="text-xs text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          💡 You can install this admin app anytime via your browser's menu (<strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>).
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-Update & Sync Settings */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Auto-Update Mode</span>
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {pwaUpdate.autoUpdate ? "Auto-Apply" : "Prompt First"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">Auto-Install Updates</div>
                        <div className="text-[11px] text-slate-500">Automatically apply new website changes seamlessly in background.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pwaUpdate.toggleAutoUpdate(!pwaUpdate.autoUpdate)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${
                          pwaUpdate.autoUpdate ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          pwaUpdate.autoUpdate ? "translate-x-6" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {pwaUpdate.updateStatusText && (
                      <div className="text-xs p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
                        {pwaUpdate.updateStatusText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions & Update Triggers */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">
                    {pwaUpdate.lastChecked ? (
                      <span>Last checked: {pwaUpdate.lastChecked.toLocaleTimeString()}</span>
                    ) : (
                      <span>Background service worker polling active (every 60s)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {pwaUpdate.updateAvailable && (
                      <button
                        onClick={pwaUpdate.applyUpdate}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md animate-pulse cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Update App Now</span>
                      </button>
                    )}

                    <button
                      onClick={handleCheckUpdates}
                      disabled={isCheckingUpdates || pwaUpdate.isChecking}
                      className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${(isCheckingUpdates || pwaUpdate.isChecking) ? "animate-spin" : ""}`} />
                      <span>{(isCheckingUpdates || pwaUpdate.isChecking) ? "Checking for Updates..." : "Check for Updates"}</span>
                    </button>

                    <button
                      onClick={handlePurgeCache}
                      disabled={isPurgingCache}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      title="Clear CacheStorage and reload fresh assets from cPanel/server"
                    >
                      <RefreshCw className={`w-4 h-4 ${isPurgingCache ? "animate-spin text-rose-600" : ""}`} />
                      <span>{isPurgingCache ? "Purging Cache..." : "Purge Stale Cache & Hard Resync"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BUILD CHANNEL CARD */}
              <div className={`p-6 rounded-3xl border space-y-6 ${cardClasses}`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-slate-900 dark:text-white">Whisper Build Version</h2>
                      <p className="text-xs text-slate-500">Production compilation and channel updates.</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-bold font-mono">
                    {currentVersion}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Release Channel Information</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Release Tag:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{currentVersion}-prod</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Environment:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">Cloud Run / Vite React 18</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Key Manager:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">Client RSA-OAEP Key Pairs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Admin Manifest Target:</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">/manifest-admin.json</span>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === "security" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              <div className={`p-6 rounded-3xl border space-y-4 ${cardClasses}`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-bold text-base text-slate-900 dark:text-white">Administrative Audit Event Log</h2>
                  </div>
                  <span className="text-xs text-slate-400">{logs.length} events logged</span>
                </div>

                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                        log.type === "success" 
                          ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                          : log.type === "danger"
                          ? "bg-rose-50/50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20 text-rose-800 dark:text-rose-300"
                          : log.type === "warning"
                          ? "bg-amber-50/50 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20 text-amber-800 dark:text-amber-300"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] opacity-75 shrink-0">{log.timestamp}</span>
                        <div>
                          <div className="font-bold">{log.action}</div>
                          <div className="text-[11px] opacity-90">{log.details}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </main>
      </div>

      {/* USER INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 relative ${cardClasses}`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    photoURL={selectedUser.photoURL}
                    avatarUrl={selectedUser.avatarUrl}
                    name={selectedUser.displayName}
                    username={selectedUser.username}
                    size="md"
                  />
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">@{selectedUser.username || "unnamed"}</h3>
                    <p className="text-xs text-slate-400">{selectedUser.displayName || "No Display Name"}</p>
                  </div>
                </div>

                <button onClick={() => setSelectedUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 font-mono">
                  <span className="text-slate-400 text-[10px] block">UID</span>
                  <div className="text-slate-900 dark:text-slate-200 font-bold select-all">{selectedUser.uid}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[10px] block">Email Recovery Address</span>
                  <div className="text-slate-900 dark:text-slate-200 font-semibold">{selectedUser.email || "None Linked"}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 font-mono">
                  <span className="text-slate-400 text-[10px] block">RSA Public Key Snippet</span>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                    {selectedUser.publicKey ? selectedUser.publicKey : "No key pair generated"}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggleLockUser(selectedUser)}
                  disabled={actionUserUid === selectedUser.uid}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 transition-all ${
                    selectedUser.isLocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {selectedUser.isLocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  <span>{selectedUser.isLocked ? "Reactivate Account" : "Suspend Account"}</span>
                </button>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* System Log Details Inspector Modal */}
      <AnimatePresence>
        {selectedSystemLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSystemLog(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1, y: 0 }}
              className={`w-full max-w-2xl max-h-[85vh] p-6 rounded-3xl border shadow-2xl relative z-10 overflow-y-auto space-y-4 ${
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Error Log Inspector</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                        {selectedSystemLog.type}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">ID: {selectedSystemLog.id}</p>
                  </div>
                </div>

                <button onClick={() => setSelectedSystemLog(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Error Message</span>
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 break-words">{selectedSystemLog.message}</p>
              </div>

              {/* Stack Trace Box */}
              {selectedSystemLog.stack && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stack Trace</span>
                    <button
                      onClick={() => handleCopy(selectedSystemLog.stack || "", "stack-trace")}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUid === "stack-trace" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Stack</span>
                    </button>
                  </div>
                  <pre className="p-3.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap break-all">
                    {selectedSystemLog.stack}
                  </pre>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[10px] block">Page URL</span>
                  <div className="text-slate-900 dark:text-slate-200 font-mono text-[11px] break-all">{selectedSystemLog.url || "N/A"}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[10px] block">User Context</span>
                  <div className="text-slate-900 dark:text-slate-200 font-semibold text-[11px]">
                    @{selectedSystemLog.username || "anonymous"} ({selectedSystemLog.userId || "anon"})
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 sm:col-span-2">
                  <span className="text-slate-400 text-[10px] block">User Agent (Client Device / Browser)</span>
                  <div className="text-slate-600 dark:text-slate-400 font-mono text-[10px] break-all">{selectedSystemLog.userAgent || "N/A"}</div>
                </div>

                {selectedSystemLog.metadata && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 sm:col-span-2 font-mono">
                    <span className="text-slate-400 text-[10px] block">Additional Metadata</span>
                    <pre className="text-slate-700 dark:text-slate-300 text-[10px] whitespace-pre-wrap break-all">
                      {selectedSystemLog.metadata}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleDeleteSystemLog(selectedSystemLog.id)}
                  className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Error Record</span>
                </button>

                <button
                  onClick={() => setSelectedSystemLog(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* iOS Safari PWA Install Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSGuide(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl relative z-10 space-y-4 ${
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Install on iOS Safari</span>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button (box with an upward arrow) in Safari's bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner to launch Whisper Admin as a standalone app.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating PWA Update Available Banner for Admin */}
      <AppUpdateBanner updateState={pwaUpdate} />

    </div>
  );
}
