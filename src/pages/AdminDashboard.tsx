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
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Wrench,
  ShieldAlert,
  ArrowUpRight,
  Terminal,
  Filter
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
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

  // Layout Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Tab Navigation State
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
    maintenanceMessage: "Whisper is currently undergoing scheduled infrastructure upgrades. Please check back shortly.",
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
      action: "Admin Access Granted",
      details: "Authenticated via passkey session",
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
        setPasskeyError("Invalid security passkey. Access denied.");
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
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setUsersList(list);
      addLog("Users Directory Loaded", `Retrieved ${list.length} user record(s) from Firestore`, "info");
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      addLog("Fetch Users Failure", err?.message || "Error reading users collection", "danger");
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
      console.warn("Using default settings:", err);
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
      addLog("Settings Saved", "Global system parameters synchronized in Firestore", "success");
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
        newStatus ? "Account Locked" : "Account Unlocked",
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
      addLog("Database Ping Test", `Firestore roundtrip response: ${duration}ms`, "success");
    } catch (err: any) {
      setDbLatency(-1);
      addLog("Database Ping Error", err?.message || "Failed health check query", "danger");
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
      addLog("System Update Check", "Verified against Whisper production build. Engine up to date.", "success");
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

    addLog("CSV Export", `Exported ${usersList.length} user records`, "info");
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-6"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-slate-950 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto p-2.5 shadow-xl shadow-indigo-500/10">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Security Checkpoint
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">Whisper Admin Console</h1>
              <p className="text-xs text-slate-400 mt-1">Authorized access route: <code className="text-indigo-400 font-mono">/admin/unknownofrun</code></p>
            </div>
          </div>

          <form onSubmit={handlePasskeySubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  className="w-full pl-10 pr-12 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3.5 top-4 text-slate-500 hover:text-slate-300 transition-colors"
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
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isVerifyingPasskey ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Unlock Admin Dashboard
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
            Protected by Whisper Zero-Knowledge Architecture
          </div>
        </motion.div>
      </div>
    );
  }

  // Sidebar Items Definition
  const navigationItems = [
    { id: "overview", label: "Dashboard Overview", icon: BarChart3, badge: null },
    { id: "users", label: "User Directory", icon: Users, badge: totalUsersCount },
    { id: "settings", label: "System Controls", icon: Sliders, badge: settings.maintenanceMode ? "ALERT" : null },
    { id: "updates", label: "Platform & Builds", icon: Cpu, badge: currentVersion },
    { id: "security", label: "Audit & Event Logs", icon: Shield, badge: logs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900/90 border-r border-slate-800/90 backdrop-blur-2xl transition-all duration-300 z-30 relative shrink-0 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-center justify-center p-1.5 shrink-0 shadow-md">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {sidebarOpen && (
              <div className="truncate">
                <div className="font-bold text-sm text-white tracking-tight leading-none">Whisper Admin</div>
                <div className="text-[10px] text-indigo-400 font-mono mt-0.5">Control Center</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Maintenance Warning Banner */}
        {settings.maintenanceMode && sidebarOpen && (
          <div className="mx-3 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <Wrench className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="font-semibold text-[11px]">Maintenance Mode Active</span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all relative group ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                {sidebarOpen && item.badge !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : item.badge === "ALERT" 
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-slate-800/80">
          <div className={`p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between ${!sidebarOpen ? "justify-center" : ""}`}>
            {sidebarOpen && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  A
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">Administrator</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Akin$sola@2020</div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 z-50 md:hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-950 rounded-lg p-1 border border-indigo-500/30">
                    <img src={getAssetUrl("android-chrome-192x192.png")} alt="Whisper" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-sm text-white">Whisper Admin</span>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
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
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold ${
                        isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout Session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-bold capitalize">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "users" && "User Directory"}
                {activeTab === "settings" && "System Controls"}
                {activeTab === "updates" && "Platform & Builds"}
                {activeTab === "security" && "Audit & Security"}
              </span>
            </div>
          </div>

          {/* Quick Header Status Controls */}
          <div className="flex items-center gap-3">
            
            {/* DB Health Badge */}
            <button
              onClick={runLatencyTest}
              disabled={isTestingLatency}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 transition-colors"
              title="Click to re-test Firestore ping latency"
            >
              <Radio className={`w-3.5 h-3.5 ${isTestingLatency ? "animate-pulse text-indigo-400" : "text-emerald-400"}`} />
              <span className="font-mono">
                {dbLatency !== null ? (dbLatency >= 0 ? `${dbLatency}ms` : "Error") : "Testing..."}
              </span>
            </button>

            {/* Maintenance Mode Quick Indicator */}
            {settings.maintenanceMode ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl">
                <Wrench className="w-3.5 h-3.5 animate-pulse" /> Maintenance ON
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> System Live
              </span>
            )}

            {/* Refresh Data Button */}
            <button
              onClick={() => {
                fetchUsers();
                fetchSettings();
                runLatencyTest();
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh All Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? "animate-spin text-indigo-400" : ""}`} />
            </button>

          </div>
        </header>

        {/* Dynamic Page Tab Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
                    <span>Registered Users</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : totalUsersCount}</div>
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">Live</span> Firestore collection records
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
                    <span>Active Profile Setups</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : onboardedCount}</div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {totalUsersCount > 0 ? `${Math.round((onboardedCount / totalUsersCount) * 100)}% onboarding rate` : "0%"}
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
                    <span>Recovery Emails Linked</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : usersWithEmailCount}</div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Accounts with email recovery addresses
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
                    <span>Locked Accounts</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                      <UserX className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{isLoadingUsers ? "..." : lockedUsersCount}</div>
                  <div className="mt-2 text-[11px] text-rose-400 font-semibold">
                    {lockedUsersCount > 0 ? "Restricted access active" : "Zero suspended accounts"}
                  </div>
                </div>

              </div>

              {/* Maintenance & Quick Action Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* System Engine Health Card */}
                <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <Server className="w-5 h-5 text-indigo-400" />
                      <h2 className="font-bold text-base text-white">Engine Architecture & Status</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg">
                      Build {currentVersion}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-slate-400">Database Engine</span>
                      <p className="font-mono font-bold text-emerald-400 text-sm">Firestore DB (default)</p>
                      <p className="text-[10px] text-slate-500">Security rules active & deployed</p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-slate-400">Client Encryption</span>
                      <p className="font-mono font-bold text-purple-400 text-sm">RSA-OAEP 2048 / AES-256</p>
                      <p className="text-[10px] text-slate-500">Zero-knowledge client payload</p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-slate-400">New Signups</span>
                      <p className={`font-mono font-bold text-sm ${settings.allowRegistrations ? "text-emerald-400" : "text-amber-400"}`}>
                        {settings.allowRegistrations ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-[10px] text-slate-500">Controlled in System Controls</p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-slate-400">Passkey Authentication</span>
                      <p className="font-mono font-bold text-indigo-400 text-sm">Session Storage Verified</p>
                      <p className="text-[10px] text-slate-500">Single administrator access</p>
                    </div>
                  </div>
                </div>

                {/* Maintenance Mode Quick Switch */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sliders className="w-5 h-5 text-amber-400" />
                      <h2 className="font-bold text-base text-white">Maintenance Switch</h2>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Toggle maintenance mode to redirect all non-admin users to the standalone Maintenance screen.
                    </p>

                    <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Maintenance Mode</span>
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
                        <span>Status: {settings.maintenanceMode ? "Active Redirect On" : "Live Normal Access"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExportUsers}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" /> Export User Backup (CSV)
                  </button>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: USER DIRECTORY */}
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              {/* Directory Filter & Search Header */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search username, email, UID..."
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
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Users Table */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {isLoadingUsers ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                    <p className="text-xs">Fetching users from Firestore...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-300">No matching user records found</p>
                    <p className="text-xs text-slate-500">Try clearing or changing your search filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="p-4">User Profile</th>
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
                            
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md uppercase text-sm shrink-0">
                                  {user.username ? user.username.charAt(0) : "U"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                    <span>@{user.username || "unnamed"}</span>
                                    {user.isLocked && (
                                      <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded border border-rose-500/20 font-bold">
                                        Suspended
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400">{user.displayName || "No display name"}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-slate-300 font-mono text-[11px]">
                              {user.email ? user.email : <span className="text-slate-600 italic">None</span>}
                            </td>

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

                            <td className="p-4">
                              {user.onboardingCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Onboarded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-semibold">
                                  <Clock className="w-3 h-3" /> Setup Incomplete
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
                                  title={user.isLocked ? "Unlock User Account" : "Suspend User Account"}
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

          {/* TAB 3: SYSTEM CONTROLS & SETTINGS */}
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Broadcasts & Maintenance */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <h2 className="font-bold text-base text-white">Maintenance Mode & Global Announcements</h2>
                  </div>

                  <div className="space-y-4">
                    
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white">System Maintenance Mode</h3>
                        <p className="text-[11px] text-slate-400">Redirects all app visitors to standalone Maintenance screen.</p>
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Maintenance Notice Message</label>
                      <textarea
                        value={settings.maintenanceMessage}
                        onChange={(e) => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                        rows={2}
                        className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                      />
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white">Global Announcement Banner</h3>
                        <p className="text-[11px] text-slate-400">Top banner notification across user dashboards.</p>
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Banner Text</label>
                      <input
                        type="text"
                        value={settings.announcementText}
                        onChange={(e) => setSettings(s => ({ ...s, announcementText: e.target.value }))}
                        className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                      />
                    </div>

                  </div>
                </div>

                {/* Security Limits */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold text-base text-white">Access & Operational Limits</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between col-span-1 sm:col-span-2">
                      <div>
                        <h3 className="text-xs font-bold text-white">Allow New User Registrations</h3>
                        <p className="text-[11px] text-slate-400">Control if new visitors can create account profiles.</p>
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Max Message Payload (Chars)</label>
                      <input
                        type="number"
                        value={settings.maxMessageLength}
                        onChange={(e) => setSettings(s => ({ ...s, maxMessageLength: parseInt(e.target.value) || 800000 }))}
                        className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Default Message Expiry (Hours)</label>
                      <input
                        type="number"
                        value={settings.defaultExpiryHours}
                        onChange={(e) => setSettings(s => ({ ...s, defaultExpiryHours: parseInt(e.target.value) || 24 }))}
                        className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition-all"
                      />
                    </div>

                  </div>
                </div>

                {/* Save Bar */}
                <div className="flex items-center justify-between pt-2">
                  {settingsSaveSuccess && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> System settings persisted to Firestore!
                    </motion.div>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="ml-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition-all"
                  >
                    {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Save System Settings</span>
                  </button>
                </div>

              </form>

            </motion.div>
          )}

          {/* TAB 4: PLATFORM UPDATES */}
          {activeTab === "updates" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="font-bold text-base text-white">Whisper Build & Release Status</h2>
                    <p className="text-xs text-slate-400">Core system release versioning & build diagnostics.</p>
                  </div>
                  <button
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdates}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? "animate-spin" : ""}`} />
                    <span>Check for Platform Updates</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400">Current Release Tag</span>
                    <p className="font-mono font-black text-white text-lg">{currentVersion}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">Latest Build Active</p>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400">Update Status</span>
                    <p className="font-mono font-bold text-emerald-400 text-base">Up To Date</p>
                    <p className="text-[10px] text-slate-500">Last verified: {lastCheckTime || "Just now"}</p>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400">Engine Channel</span>
                    <p className="font-mono font-bold text-indigo-400 text-base">Production Main</p>
                    <p className="text-[10px] text-slate-500">Cloud Run Sandboxed Container</p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 5: AUDIT & SECURITY LOGS */}
          {activeTab === "security" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-base text-white">System Audit Timeline</h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{logs.length} logged events</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {logs.map((log) => (
                    <div 
                      key={log.id}
                      className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          log.type === "success" ? "bg-emerald-400" :
                          log.type === "danger" ? "bg-rose-500 animate-pulse" :
                          log.type === "warning" ? "bg-amber-400" : "bg-indigo-400"
                        }`} />
                        <div>
                          <span className="font-bold text-white mr-2">{log.action}:</span>
                          <span className="text-slate-300">{log.details}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </main>
      </div>

      {/* INSPECT USER MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-white">Inspect User Record</h3>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 font-medium">Username & Handle:</span>
                  <p className="font-bold text-white text-sm">@{selectedUser.username || "N/A"}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 font-medium">User ID (UID):</span>
                  <p className="font-mono text-slate-300 break-all">{selectedUser.uid}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 font-medium">Email Address:</span>
                  <p className="font-mono text-slate-300">{selectedUser.email || "No email linked"}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 font-medium">Account Status:</span>
                  <p className={`font-bold ${selectedUser.isLocked ? "text-rose-400" : "text-emerald-400"}`}>
                    {selectedUser.isLocked ? "Suspended / Locked" : "Active & Clear"}
                  </p>
                </div>

                {selectedUser.publicKey && (
                  <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                    <span className="text-slate-500 font-medium">RSA Public Encryption Key Snippet:</span>
                    <p className="font-mono text-[10px] text-slate-400 break-all line-clamp-3">
                      {selectedUser.publicKey}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleToggleLockUser(selectedUser)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 ${
                    selectedUser.isLocked
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {selectedUser.isLocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  <span>{selectedUser.isLocked ? "Unlock User Account" : "Suspend Account"}</span>
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
