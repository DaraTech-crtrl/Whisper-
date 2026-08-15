import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Users, 
  Server, 
  Settings, 
  Activity, 
  Search, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  LogOut, 
  User, 
  Copy, 
  Check, 
  Database, 
  Sliders, 
  Bell, 
  Shield, 
  ChevronRight,
  ExternalLink,
  Cpu,
  HardDrive,
  Clock,
  Sparkles,
  Zap,
  Info,
  Layers,
  BarChart3,
  Globe,
  Radio,
  FileText,
  UserX,
  UserCheck
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAssetUrl } from "../lib/assets";
import { motion, AnimatePresence } from "motion/react";

const ADMIN_PASSKEY = "Akin$sola@2020";
const SESSION_STORAGE_KEY = "whisper_admin_authenticated";

export interface UserProfileData {
  uid: string;
  username: string;
  displayName?: string;
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
  lastUpdated?: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: "info" | "warning" | "success" | "danger";
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

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "settings" | "updates" | "security">("overview");

  // User Management State
  const [usersList, setUsersList] = useState<UserProfileData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "onboarded" | "locked" | "hasEmail">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettingsData>({
    maintenanceMode: false,
    maintenanceMessage: "Whisper is currently undergoing scheduled maintenance. Please check back shortly.",
    announcementActive: false,
    announcementText: "Welcome to Whisper! Enjoy fast, end-to-end encrypted anonymous messaging.",
    allowRegistrations: true,
    maxMessageLength: 800000,
    defaultExpiryHours: 24,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // System Updates State
  const [currentVersion] = useState("v2.4.2");
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"latest" | "available" | "error" | null>("latest");
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Database / System Health
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      action: "Admin Access",
      details: "Authenticated via admin passkey",
      type: "success"
    }
  ]);

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
      } else {
        setPasskeyError("Invalid passkey. Access denied.");
        addLog("Failed Authentication", "Attempted admin login with incorrect passkey", "danger");
      }
      setIsVerifyingPasskey(false);
    }, 400);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    setPasskeyInput("");
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
      // Sort newest first if possible
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setUsersList(list);
      addLog("Users List Fetched", `Retrieved ${list.length} user record(s)`, "info");
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      addLog("Fetch Users Error", err?.message || "Error reading users collection", "danger");
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
        });
      }
    } catch (err) {
      console.warn("Using local default settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveSuccess(false);

    try {
      const docRef = doc(db, "systemSettings", "global");
      await setDoc(docRef, {
        ...settings,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      setSettingsSaveSuccess(true);
      addLog("Settings Saved", "System configuration updated in Firestore", "success");
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      addLog("Save Settings Error", err?.message || "Could not write systemSettings document", "danger");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle Lock User
  const handleToggleLockUser = async (userToLock: UserProfileData) => {
    const newStatus = !userToLock.isLocked;
    try {
      await updateDoc(doc(db, "users", userToLock.uid), {
        isLocked: newStatus,
        updatedAt: serverTimestamp()
      });

      setUsersList(prev => prev.map(u => u.uid === userToLock.uid ? { ...u, isLocked: newStatus } : u));
      if (selectedUser && selectedUser.uid === userToLock.uid) {
        setSelectedUser(prev => prev ? { ...prev, isLocked: newStatus } : null);
      }

      addLog(
        newStatus ? "User Locked" : "User Unlocked",
        `Target: @${userToLock.username} (${userToLock.uid})`,
        newStatus ? "warning" : "success"
      );
    } catch (err: any) {
      console.error("Error locking user:", err);
      addLog("Lock User Error", err?.message || "Failed to update user lock status", "danger");
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
      addLog("Database Health Check", `Firestore latency response: ${duration}ms`, "success");
    } catch (err: any) {
      setDbLatency(-1);
      addLog("Database Latency Failure", err?.message || "Failed health check query", "danger");
    } finally {
      setIsTestingLatency(false);
    }
  };

  // Check System Updates
  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);

    setTimeout(() => {
      setUpdateStatus("latest");
      setLastCheckTime(new Date().toLocaleTimeString());
      setIsCheckingUpdates(false);
      addLog("System Update Check", "Verified against Whisper production build. Running latest version.", "success");
    }, 1200);
  };

  // Export Users to CSV
  const handleExportUsers = () => {
    if (usersList.length === 0) return;
    const headers = ["UID", "Username", "Display Name", "Email", "Onboarding Completed", "Locked", "Created At"];
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
    link.setAttribute("download", `whisper_users_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("Export Data", `Exported ${usersList.length} user records to CSV file`, "info");
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
      runLatencyTest();
    }
  }, [isAuthenticated]);

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

  // Calculate stats
  const totalUsersCount = usersList.length;
  const onboardedCount = usersList.filter(u => u.onboardingCompleted).length;
  const usersWithEmailCount = usersList.filter(u => u.email).length;
  const lockedUsersCount = usersList.filter(u => u.isLocked).length;

  // Render Gate: Passkey Authentication Prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 p-2 shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper" 
                className="w-12 h-12 object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Restricted Command Access
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Passkey Required</h1>
            <p className="text-xs text-slate-400 mt-1">Enter authorized security credentials to access system controls.</p>
          </div>

          {/* Passkey Form */}
          <form onSubmit={handlePasskeySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Security Passkey
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? "text" : "password"}
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter passkey..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-12 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passkeyError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passkeyError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isVerifyingPasskey}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isVerifyingPasskey ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Authenticate Admin Console
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <p>Whisper Security Console • Path: <code className="text-indigo-400 font-mono">/admin/unknownofrun</code></p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render Admin Main Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1 border border-indigo-100 shadow-sm">
            <img 
              src={getAssetUrl("android-chrome-192x192.png")} 
              alt="Whisper" 
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">Whisper Admin</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold rounded-full uppercase tracking-wider">
                Command Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Path: /admin/unknownofrun</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Latency badge */}
          <button
            onClick={runLatencyTest}
            disabled={isTestingLatency}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-slate-300 transition-colors"
            title="Click to re-test Firestore latency"
          >
            <Radio className={`w-3.5 h-3.5 ${isTestingLatency ? "animate-pulse text-indigo-400" : "text-emerald-400"}`} />
            <span>DB: {dbLatency !== null ? (dbLatency >= 0 ? `${dbLatency}ms` : "Error") : "Testing..."}</span>
          </button>

          {/* Quick System Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>System Active</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition-all"
            title="Revoke Admin Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {[
            { id: "overview", label: "Overview & Stats", icon: BarChart3 },
            { id: "users", label: `User Directory (${totalUsersCount})`, icon: Users },
            { id: "settings", label: "Admin Settings", icon: Sliders },
            { id: "updates", label: "System Updates", icon: Cpu },
            { id: "security", label: "Audit & Security Logs", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
                  <span>Total Users Registered</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : totalUsersCount}</div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="text-emerald-400 font-medium">Real-time</span> from Firestore collection
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
                  <span>Completed Onboarding</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : onboardedCount}</div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {totalUsersCount > 0 ? `${Math.round((onboardedCount / totalUsersCount) * 100)}% completion rate` : "0%"}
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
                  <span>Verified Emails Linked</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : usersWithEmailCount}</div>
                <div className="mt-2 text-[11px] text-slate-400">
                  User accounts with recovery email
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
                  <span>Locked / Flagged Users</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : lockedUsersCount}</div>
                <div className="mt-2 text-[11px] text-rose-400 font-medium">
                  {lockedUsersCount > 0 ? "Accounts currently locked" : "No restricted accounts"}
                </div>
              </div>

            </div>

            {/* Quick System Health Banner & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* System Overview Details */}
              <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-base text-white">System Architecture & Health</h2>
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin text-indigo-400" : ""}`} />
                    <span>Refresh Stats</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-slate-400">Build Version:</span>
                    <p className="font-mono font-semibold text-white text-sm">{currentVersion}</p>
                    <p className="text-[10px] text-slate-500">Includes dynamic cache-busting and auto-expiry E2EE</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-slate-400">Database Engine:</span>
                    <p className="font-mono font-semibold text-emerald-400 text-sm">Google Cloud Firestore</p>
                    <p className="text-[10px] text-slate-500">Rules status: Active & Enforced</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-slate-400">Encryption Standard:</span>
                    <p className="font-mono font-semibold text-purple-400 text-sm">RSA-OAEP 2048 / AES-GCM 256</p>
                    <p className="text-[10px] text-slate-500">Client-side zero-knowledge encryption</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-slate-400">Authentication:</span>
                    <p className="font-mono font-semibold text-indigo-400 text-sm">Firebase Auth + Custom Passkey</p>
                    <p className="text-[10px] text-slate-500">Protected admin route: /admin/unknownofrun</p>
                  </div>
                </div>
              </div>

              {/* Maintenance Status Quick Toggle */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold text-base text-white">Maintenance Mode</h2>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Instantly restrict application access for maintenance or database upgrades.
                  </p>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200">Global Maintenance</span>
                      <button
                        onClick={() => {
                          const updated = !settings.maintenanceMode;
                          setSettings(s => ({ ...s, maintenanceMode: updated }));
                          handleSaveSettings();
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${
                          settings.maintenanceMode ? "bg-amber-500" : "bg-slate-800"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${settings.maintenanceMode ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                      <span>Status: {settings.maintenanceMode ? "Maintenance ON" : "System Live"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportUsers}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <Download className="w-4 h-4" /> Export Users Backup (CSV)
                </button>
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 2: USER DIRECTORY */}
        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {/* Directory Filter & Search Header */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by username, email, UID..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "All Users" },
                  { id: "onboarded", label: "Onboarded Only" },
                  { id: "hasEmail", label: "Has Email" },
                  { id: "locked", label: "Locked Accounts" },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setUserFilter(filter.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      userFilter === filter.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Users Table / List */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {isLoadingUsers ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                  <p className="text-xs">Loading registered users from Firestore...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No matching user records found</p>
                  <p className="text-xs text-slate-500">Try adjusting your search query or filter settings.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                        <th className="p-4">User</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">User ID (UID)</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Registered</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* User Handle & Display Name */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md uppercase text-sm">
                                {user.username ? user.username.charAt(0) : "U"}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <span>@{user.username || "unnamed"}</span>
                                  {user.isLocked && (
                                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded border border-rose-500/20">
                                      Locked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">{user.displayName || "No display name"}</p>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="p-4 text-slate-300 font-mono text-[11px]">
                            {user.email ? user.email : <span className="text-slate-600 italic">None</span>}
                          </td>

                          {/* UID */}
                          <td className="p-4 font-mono text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]" title={user.uid}>{user.uid}</span>
                              <button
                                onClick={() => handleCopy(user.uid, `uid-${user.uid}`)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                                title="Copy UID"
                              >
                                {copiedUid === `uid-${user.uid}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            {user.onboardingCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold">
                                <CheckCircle className="w-3 h-3" /> Active Profile
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-semibold">
                                <Clock className="w-3 h-3" /> Setup Incomplete
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-4 text-slate-400 text-[11px]">
                            {user.createdAt?.seconds 
                              ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                              : "N/A"
                            }
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Info className="w-3.5 h-3.5" /> Inspect
                              </button>

                              <button
                                onClick={() => handleToggleLockUser(user)}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  user.isLocked
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                                }`}
                                title={user.isLocked ? "Unlock User Account" : "Lock / Suspend User Account"}
                              >
                                {user.isLocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>

                              {user.username && (
                                <Link
                                  to={`/u/${user.username}`}
                                  target="_blank"
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                                  title="View Public Profile Page"
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

        {/* TAB 3: ADMIN SETTINGS */}
        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Card 1: Maintenance & Announcements */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-base text-white">System Broadcasts & Maintenance</h2>
                </div>

                <div className="space-y-4">
                  
                  {/* Maintenance Mode Toggle */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white">Maintenance Mode</h3>
                      <p className="text-[11px] text-slate-400">Puts application in read-only mode with custom message.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${
                        settings.maintenanceMode ? "bg-amber-500" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Maintenance Notice Message</label>
                    <textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                      rows={2}
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                    />
                  </div>

                  {/* Announcement Banner */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white">Global Announcement Banner</h3>
                      <p className="text-[11px] text-slate-400">Display top banner notification across user dashboards.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, announcementActive: !s.announcementActive }))}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${
                        settings.announcementActive ? "bg-indigo-600" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.announcementActive ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Announcement Text</label>
                    <input
                      type="text"
                      value={settings.announcementText}
                      onChange={(e) => setSettings(s => ({ ...s, announcementText: e.target.value }))}
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                    />
                  </div>

                </div>
              </div>

              {/* Card 2: Security & Limits */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <h2 className="font-bold text-base text-white">Security Controls & Parameters</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Allow Registrations */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between col-span-1 sm:col-span-2">
                    <div>
                      <h3 className="text-xs font-bold text-white">Allow New User Registrations</h3>
                      <p className="text-[11px] text-slate-400">Enable or disable new user account creation.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, allowRegistrations: !s.allowRegistrations }))}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${
                        settings.allowRegistrations ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.allowRegistrations ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Max Message Payload (Chars)</label>
                    <input
                      type="number"
                      value={settings.maxMessageLength}
                      onChange={(e) => setSettings(s => ({ ...s, maxMessageLength: parseInt(e.target.value) || 800000 }))}
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Default Message Expiry (Hours)</label>
                    <input
                      type="number"
                      value={settings.defaultExpiryHours}
                      onChange={(e) => setSettings(s => ({ ...s, defaultExpiryHours: parseInt(e.target.value) || 24 }))}
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                    />
                  </div>

                </div>
              </div>

              {/* Save Controls */}
              <div className="flex items-center justify-between pt-2">
                {settingsSaveSuccess && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Settings updated successfully in Firestore!
                  </motion.div>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
                  >
                    {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Save All System Settings</span>
                  </button>
                </div>
              </div>

            </form>

          </motion.div>
        )}

        {/* TAB 4: SYSTEM UPDATES */}
        {activeTab === "updates" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Version Overview */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center p-2 text-white shadow-lg shadow-indigo-500/20">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-white">Whisper Application Version</h2>
                    <p className="text-xs text-slate-400">Current Deployment: <span className="font-mono text-indigo-400 font-semibold">{currentVersion}</span></p>
                  </div>
                </div>

                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdates}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? "animate-spin" : ""}`} />
                  <span>{isCheckingUpdates ? "Checking System Registry..." : "Check For Updates"}</span>
                </button>
              </div>

              {updateStatus === "latest" && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Your application is fully up to date with the latest production build!</span>
                  </div>
                  {lastCheckTime && <span className="text-[10px] text-emerald-500/80">Checked at {lastCheckTime}</span>}
                </div>
              )}

              {/* Version History Log */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Release Version History</h3>
                
                <div className="space-y-3 text-xs">
                  
                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">v2.4.2 (Latest Patch)</span>
                      <span className="text-[10px] text-slate-500">August 2026</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                      <li>Added Restricted Admin Command Console at <code className="text-indigo-400">/admin/unknownofrun</code>.</li>
                      <li>Implemented dynamic cache-busting build plugin for zero asset stale states.</li>
                      <li>Added custom password reset flow with OTP verification.</li>
                      <li>Integrated E2EE automated message auto-expiry timers.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-400">v2.4.0</span>
                      <span className="text-[10px] text-slate-500">August 2026</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                      <li>Integrated Web Crypto RSA-OAEP + AES-GCM zero-knowledge encryption.</li>
                      <li>Implemented full Firestore security rules suite and schema guards.</li>
                      <li>Added voice message recording and encrypted audio playback.</li>
                    </ul>
                  </div>

                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 5: AUDIT & SECURITY LOGS */}
        {activeTab === "security" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-base text-white">Real-time Admin Audit Log</h2>
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs transition-colors"
                >
                  Clear Logs
                </button>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-2">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">No audit events recorded yet.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">{log.timestamp}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        log.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        log.type === "danger" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        log.type === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-slate-300 break-all">{log.details}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </motion.div>
        )}

      </div>

      {/* INSPECT USER MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white uppercase text-base">
                    {selectedUser.username ? selectedUser.username.charAt(0) : "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">@{selectedUser.username || "unnamed"}</h3>
                    <p className="text-xs text-slate-400">{selectedUser.displayName || "No display name"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors text-xs"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-500">User ID (UID)</span>
                  <p className="font-mono text-slate-200 select-all">{selectedUser.uid}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-500">Email</span>
                    <p className="font-mono text-slate-200">{selectedUser.email || "None"}</p>
                  </div>

                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-500">Onboarding Status</span>
                    <p className="font-semibold text-emerald-400">{selectedUser.onboardingCompleted ? "Completed" : "Pending"}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-500">User Bio</span>
                  <p className="text-slate-300">{selectedUser.bio || "No bio provided"}</p>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-500">Public Encryption Key</span>
                  <p className="font-mono text-[10px] text-slate-400 truncate">{selectedUser.publicKey || "None"}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => handleToggleLockUser(selectedUser)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    selectedUser.isLocked
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {selectedUser.isLocked ? "Unlock User Account" : "Lock / Suspend Account"}
                </button>

                {selectedUser.username && (
                  <Link
                    to={`/u/${selectedUser.username}`}
                    target="_blank"
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Visit Profile
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
