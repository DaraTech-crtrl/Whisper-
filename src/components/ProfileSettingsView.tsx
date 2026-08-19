import React, { useState } from "react";
import {
  User,
  Camera,
  Upload,
  Edit3,
  Clock,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Download,
  PlusSquare,
  RefreshCw,
  Bell,
  BellRing,
  BellOff,
  Radio,
  ShieldAlert,
  Hand,
  Check,
  Lock,
  Eye,
  Layers,
  HardDrive,
  Trash2,
  Mail,
  Database,
  AlertTriangle,
  Star
} from "lucide-react";
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import localforage from "localforage";
import { cn } from "../lib/utils";
import UserAvatar from "./UserAvatar";
import { isHapticsEnabled, setHapticsEnabled, triggerHaptic } from "../lib/haptics";

interface ProfileSettingsViewProps {
  user: any;
  dbUser: any;
  displayName: string;
  setDisplayName: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
  theme: string;
  setTheme: (val: string) => void;
  messageExpiryHours: number;
  setMessageExpiryHours: (val: number) => void;
  isUpdatingProfile: boolean;
  profileMessage: { text: string; type: string };
  handleUpdateProfile: (e: React.FormEvent) => void;
  isUploadingAvatar: boolean;
  handleAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowPauseModal: (show: boolean) => void;
  setShowAccountSettingsModal?: (show: boolean) => void;
  setShowIOSModal: (show: boolean) => void;
  pwa: any;
  pwaUpdate: any;
  notifPermission: string;
  isPushToggling: boolean;
  handleEnablePush: () => void;
  handleDisablePush: () => void;
  handleSendTestNotification: () => void;
  isTestingNotif: boolean;
  notifStatusMsg: { text: string; type: "success" | "error" } | null;
  onOpenRateModal?: () => void;
}

const THEME_OPTIONS = [
  {
    id: "default",
    name: "Default Minimal",
    desc: "Clean slate & crisp typography",
    bgClass: "from-slate-900 via-indigo-950 to-slate-900 text-white",
    swatch: ["bg-slate-900", "bg-indigo-600", "bg-slate-100"]
  },
  {
    id: "cosmic",
    name: "Cosmic Space",
    desc: "Deep violet & indigo galaxy",
    bgClass: "from-purple-950 via-indigo-950 to-slate-950 text-purple-100",
    swatch: ["bg-purple-950", "bg-indigo-600", "bg-fuchsia-500"]
  },
  {
    id: "sunset",
    name: "Sunset Vibes",
    desc: "Warm rose & radiant amber",
    bgClass: "from-rose-950 via-orange-950 to-slate-950 text-rose-100",
    swatch: ["bg-rose-900", "bg-orange-500", "bg-amber-400"]
  },
  {
    id: "forest",
    name: "Secret Forest",
    desc: "Lush emerald & dark teal mist",
    bgClass: "from-emerald-950 via-teal-950 to-slate-950 text-emerald-100",
    swatch: ["bg-emerald-950", "bg-teal-600", "bg-emerald-400"]
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    desc: "Midnight navy & cyan waves",
    bgClass: "from-slate-950 via-cyan-950 to-blue-950 text-cyan-100",
    swatch: ["bg-slate-950", "bg-cyan-600", "bg-blue-400"]
  }
];

const EXPIRY_OPTIONS = [
  { hours: 0, label: "Never", desc: "Never auto-archive" },
  { hours: 1, label: "1 Hour", desc: "Archive after 1 hour" },
  { hours: 24, label: "24 Hours", desc: "Archive after 24 hours" },
  { hours: 168, label: "7 Days", desc: "Archive after 7 days" },
  { hours: 720, label: "30 Days", desc: "Archive after 30 days" }
];

export default function ProfileSettingsView({
  user,
  dbUser,
  displayName,
  setDisplayName,
  bio,
  setBio,
  avatarUrl,
  theme,
  setTheme,
  messageExpiryHours,
  setMessageExpiryHours,
  isUpdatingProfile,
  profileMessage,
  handleUpdateProfile,
  isUploadingAvatar,
  handleAvatarFileChange,
  handleRemoveAvatar,
  fileInputRef,
  setShowPauseModal,
  setShowIOSModal,
  pwa,
  pwaUpdate,
  notifPermission,
  isPushToggling,
  handleEnablePush,
  handleDisablePush,
  handleSendTestNotification,
  isTestingNotif,
  notifStatusMsg,
  onOpenRateModal
}: ProfileSettingsViewProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "profile" | "link" | "app" | "account">("all");

  // Haptic feedback preference state
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => isHapticsEnabled());

  const handleToggleHaptics = (enabled: boolean) => {
    setHapticsOn(enabled);
    setHapticsEnabled(enabled);
    if (enabled) {
      triggerHaptic("medium");
    }
  };

  // Account & Data State (Integrated directly into Profile Settings view)
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentTheme = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const isLinkPaused = dbUser?.isLinkPaused || (dbUser?.pauseUntil && new Date(dbUser.pauseUntil.seconds ? dbUser.pauseUntil.seconds * 1000 : dbUser.pauseUntil) > new Date());

  const showProfile = activeCategory === "all" || activeCategory === "profile";
  const showLink = activeCategory === "all" || activeCategory === "link";
  const showApp = activeCategory === "all" || activeCategory === "app";
  const showAccount = activeCategory === "all" || activeCategory === "account";

  const expectedConfirmText = dbUser?.username || "DELETE";

  // Data Export Handler
  const handleExportData = async () => {
    if (!user?.uid) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const messagesRef = collection(db, "users", user.uid, "messages");
      const messagesSnap = await getDocs(messagesRef);
      const exportedMessages = messagesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        profile: {
          uid: user.uid,
          username: dbUser?.username,
          displayName: dbUser?.displayName,
          email: user.email,
          bio: dbUser?.bio,
          createdAt: dbUser?.createdAt
        },
        stats: {
          totalMessagesCount: exportedMessages.length
        },
        messages: exportedMessages
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `whisper-data-export-${dbUser?.username || "user"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to export user data:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Clear Local Offline Cache Handler
  const handleClearCache = async () => {
    try {
      await localforage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error("Failed to clear local cache:", err);
    }
  };

  // Permanent Account Deletion Handler
  const handleDeleteAccount = async () => {
    if (confirmUsername.trim().toLowerCase() !== expectedConfirmText.trim().toLowerCase()) {
      setDeleteError(`Please type "${expectedConfirmText}" exactly to confirm account deletion.`);
      return;
    }

    if (!user?.uid) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Step 1: Delete all messages
      setDeleteStep("1/4: Deleting all messages & inbox history...");
      const messagesRef = collection(db, "users", user.uid, "messages");
      const messagesSnap = await getDocs(messagesRef);

      for (const msgDoc of messagesSnap.docs) {
        try {
          await deleteDoc(doc(db, "users", user.uid, "messages", msgDoc.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/messages/${msgDoc.id}`);
        }
      }

      // Step 2: Delete user profile document
      setDeleteStep("2/4: Deleting user profile & public link...");
      try {
        await deleteDoc(doc(db, "users", user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
      }

      // Step 3: Clear local caches
      setDeleteStep("3/4: Clearing local cache & keys...");
      try {
        await localforage.clear();
        localStorage.clear();
        useAuthStore.getState().clear();
      } catch (err) {
        console.warn("Failed to clear local cache:", err);
      }

      // Step 4: Delete Firebase Auth User
      setDeleteStep("4/4: Deleting authentication account...");
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (authErr: any) {
          console.warn("Firebase deleteUser error:", authErr);
          if (authErr?.code === "auth/requires-recent-login") {
            try {
              setDeleteStep("Re-authenticating to complete deletion...");
              const provider = new GoogleAuthProvider();
              await reauthenticateWithPopup(auth.currentUser, provider);
              await deleteUser(auth.currentUser);
            } catch (reauthErr: any) {
              console.error("Re-authentication failed:", reauthErr);
            }
          }
        }
      }

      setDeleteStep("Account deleted successfully. Redirecting...");
      await auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error during account deletion:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300 max-w-xl mx-auto">
      {/* Category Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1 shadow-2xs sticky top-2 z-30 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-0.5">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeCategory === "all"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("profile")}
            className={cn(
              "py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeCategory === "profile"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("link")}
            className={cn(
              "py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeCategory === "link"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Link & Expiry</span>
            {isLinkPaused && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("app")}
            className={cn(
              "py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeCategory === "app"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("account")}
            className={cn(
              "py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeCategory === "account"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PROFILE & APPEARANCE */}
      {showProfile && (
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Live Card Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Eye className="w-3.5 h-3.5" />
                Live Card Preview
              </span>
              <span className="font-mono text-[10px] opacity-70">
                /u/{dbUser?.username || "username"}
              </span>
            </div>

            <div className={cn(
              "rounded-xl p-4 bg-gradient-to-br border border-white/10 shadow-md space-y-2.5 text-center relative overflow-hidden transition-all duration-300",
              currentTheme.bgClass
            )}>
              <div className="flex flex-col items-center">
                <UserAvatar
                  photoURL={avatarUrl}
                  avatarUrl={avatarUrl}
                  name={displayName || dbUser?.displayName}
                  username={dbUser?.username}
                  size="lg"
                  showBorder
                />
                <h3 className="font-bold text-sm mt-2 text-white">
                  {displayName.trim() || dbUser?.displayName || "Your Name"}
                </h3>
                <p className="text-[10px] opacity-70 font-mono">
                  @{dbUser?.username || "username"}
                </p>
                {bio && (
                  <p className="text-[11px] opacity-90 mt-1 max-w-xs leading-tight italic">
                    "{bio}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[10px] opacity-80">
                <Lock className="w-3 h-3" />
                <span>Send anonymous encrypted whisper</span>
              </div>
            </div>
          </div>

          {/* Profile Inputs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Customize your public whisper page.
              </p>
            </div>

            {/* Profile Avatar Upload */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
              <div className="relative group shrink-0">
                <UserAvatar
                  photoURL={avatarUrl}
                  avatarUrl={avatarUrl}
                  name={displayName || dbUser?.displayName}
                  username={dbUser?.username}
                  size="lg"
                  showBorder
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  title="Change Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Profile Photo
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Custom avatar for your page and share cards.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-60 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    {isUploadingAvatar ? "Uploading..." : avatarUrl ? "Change" : "Upload"}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-400 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="E.g. Alex Smith"
                  maxLength={30}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-8 pr-3 outline-none focus:border-indigo-500 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Bio / Public Prompt
              </label>
              <div className="relative">
                <Edit3 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ask me anything anonymously! Send your thoughts..."
                  maxLength={150}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-8 pr-3 outline-none focus:border-indigo-500 transition-colors resize-none min-h-[70px] font-medium"
                />
                <div className="absolute right-2.5 bottom-2 text-[9px] text-slate-400 font-mono">
                  {bio.length}/150
                </div>
              </div>
            </div>

            {/* Theme Picker */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Page Theme</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentTheme.name}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEME_OPTIONS.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-400 shadow-2xs"
                          : "bg-slate-50/80 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          {t.swatch.map((sw, i) => (
                            <div
                              key={i}
                              className={cn("w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 shadow-2xs", sw)}
                            />
                          ))}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {t.name}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {t.desc}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {profileMessage.text && (
              <div className={cn(
                "p-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5",
                profileMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-500/20"
              )}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{profileMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingProfile || !displayName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUpdatingProfile ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 2: LINK & PRIVACY TIMERS */}
      {showLink && (
        <div className="space-y-4">
          {/* Pause My Link Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                ✋
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pause Link</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Temporarily or permanently pause new incoming messages.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                {isLinkPaused ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Paused
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPauseModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>Manage Pause</span>
                <span>✋</span>
              </button>
            </div>
          </div>

          {/* Auto-Archive Messages Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Auto-Archive Messages
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Auto-archive new messages after a chosen time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXPIRY_OPTIONS.map((opt) => {
                const isSelected = messageExpiryHours === opt.hours;
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setMessageExpiryHours(opt.hours)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-400 shadow-2xs"
                        : "bg-slate-50/80 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>{opt.label}</span>
                        {opt.hours > 0 && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            {opt.hours}h
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {Number(dbUser?.messageExpiryHours || 0) > 0 && dbUser?.messageExpiryActivatedAt && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  Active: archiving new messages after {dbUser.messageExpiryHours}h
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isUpdatingProfile ? "Saving..." : "Save Auto-Archive Settings"}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: ALERTS & APP UPDATES */}
      {showApp && (
        <div className="space-y-4">
          {/* PWA & App Version Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">App & Updates</h2>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded uppercase">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Install Whisper to your home screen for quick access.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
              <div className="text-[11px]">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {pwa?.isInstalled ? "App Installed" : "Home Screen App"}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {pwa?.isInstalled
                    ? "Active on your device."
                    : pwa?.isIOSDevice
                    ? "iOS requires adding to Home Screen."
                    : "Add for 1-tap encrypted messaging."}
                </p>
              </div>

              {pwa?.isInstalled ? (
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Installed
                </div>
              ) : pwa?.isIOSDevice ? (
                <button
                  type="button"
                  onClick={() => setShowIOSModal(true)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  Add (iOS)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => pwa?.triggerInstall()}
                  disabled={!pwa?.isInstallable}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  {pwa?.isInstallable ? "Install" : "Ready"}
                </button>
              )}
            </div>

            {/* Version & Auto-Update Controls */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <RefreshCw className={`w-4 h-4 ${pwaUpdate?.isChecking ? "animate-spin" : ""}`} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      App Version
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                      <span>{pwaUpdate?.currentVersion || "Whisper v1.0.1"}</span>
                      {pwaUpdate?.updateAvailable ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                          Update Ready
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {pwaUpdate?.updateAvailable ? (
                    <button
                      type="button"
                      onClick={() => pwaUpdate?.applyUpdate()}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Update Now
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pwaUpdate?.checkForUpdate()}
                      disabled={pwaUpdate?.isChecking}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${pwaUpdate?.isChecking ? "animate-spin text-indigo-600" : ""}`} />
                      {pwaUpdate?.isChecking ? "Checking..." : "Check Updates"}
                    </button>
                  )}
                </div>
              </div>

              {/* Working Auto-Update Toggle */}
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Auto-install updates in background
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pwaUpdate?.autoUpdate ?? true}
                    onChange={(e) => pwaUpdate?.toggleAutoUpdate?.(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Haptic Feedback Vibration Toggle */}
              <div className="flex items-center justify-between px-1 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Haptic Vibration Feedback
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapticsOn}
                    onChange={(e) => handleToggleHaptics(e.target.checked)}
                    className="sr-only peer"
                    id="toggle-haptic-feedback-switch"
                  />
                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Rate App & Feedback Row */}
              <div className="flex items-center justify-between px-1 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Rate Whisper & Feedback
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenRateModal}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>Rate Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Push Notifications Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Push Notifications</h2>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded uppercase">
                  Alerts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Get instant device alerts for new anonymous whispers.
              </p>
            </div>

            {/* Notification Status Banner */}
            <div className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-2 transition-all",
              (notifPermission === "granted" && dbUser?.notificationsEnabled !== false)
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                : notifPermission === "denied"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                  (notifPermission === "granted" && dbUser?.notificationsEnabled !== false)
                    ? "bg-emerald-500 text-white"
                    : notifPermission === "denied"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                )}>
                  {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false) ? (
                    <BellRing className="w-4 h-4 animate-pulse" />
                  ) : notifPermission === "denied" ? (
                    <BellOff className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>
                      {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false)
                        ? "Active"
                        : notifPermission === "denied"
                        ? "Blocked"
                        : "Disabled"}
                    </span>
                    {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false)
                      ? "Ready for incoming whisper alerts."
                      : notifPermission === "denied"
                      ? "Allow notifications in browser site settings."
                      : "Enable to get notified of new whispers."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false) ? (
                  <button
                    type="button"
                    onClick={handleDisablePush}
                    disabled={isPushToggling}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPushToggling ? "Updating..." : "Disable"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={isPushToggling || notifPermission === "denied"}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Radio className="w-3 h-3" />
                    {isPushToggling ? "Enabling..." : "Enable"}
                  </button>
                )}
              </div>
            </div>

            {/* Test Notification */}
            {(notifPermission === "granted" && dbUser?.notificationsEnabled !== false) && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Test Notification
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Test notification sound and alert display.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    disabled={isTestingNotif}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-indigo-200/50 dark:border-indigo-800/50"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    {isTestingNotif ? "Sending..." : "Test"}
                  </button>
                </div>
              </div>
            )}

            {notifStatusMsg && (
              <div className={cn(
                "p-2.5 rounded-lg text-[10px] font-medium",
                notifStatusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20"
              )}>
                {notifStatusMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: MERGED ACCOUNT, SECURITY & DATA MANAGEMENT */}
      {showAccount && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account & Security</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Account information, data export, cache, and account deletion.
                </p>
              </div>
            </div>

            {/* Account Info Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Account Handle
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                  @{dbUser?.username || "username"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Linked Email
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                  {user?.email || "No email linked"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Encryption
                </span>
                <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-3 h-3" />
                  <span>E2EE Active</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  User ID
                </span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate block">
                  {user?.uid}
                </span>
              </div>
            </div>

            {/* Export & Clear Cache Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Data Management & Backup</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Export Data */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Export Data JSON</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Download full archive of profile & messages.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isExporting ? "Exporting..." : "Export Data"}</span>
                  </button>

                  {exportSuccess && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Export downloaded!</span>
                    </div>
                  )}
                </div>

                {/* Clear Cache */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Clear Offline Cache</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Flush local decryption cache from browser storage.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Clear Cache</span>
                  </button>

                  {cacheCleared && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cache cleared!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Permanent Account Deletion Section */}
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 space-y-3">
              <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Permanently Delete Account</span>
                </div>

                <p className="text-[11px] text-rose-800 dark:text-rose-200 leading-tight">
                  This will permanently delete your profile page (<strong>@{dbUser?.username}</strong>), all whispers, encryption keys, and account authentication data.
                </p>

                <div className="space-y-2 pt-1">
                  <label className="block text-[10px] font-bold text-rose-900 dark:text-rose-200">
                    Type username <span className="font-mono underline">{expectedConfirmText}</span> to confirm:
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={confirmUsername}
                      onChange={(e) => setConfirmUsername(e.target.value)}
                      disabled={isDeleting}
                      placeholder={`Type ${expectedConfirmText}...`}
                      className="flex-1 text-xs bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900 rounded-xl py-2 px-3 outline-none focus:border-rose-500 font-mono"
                    />

                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || confirmUsername.trim().toLowerCase() !== expectedConfirmText.trim().toLowerCase()}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? "Deleting..." : "Delete Account"}</span>
                    </button>
                  </div>

                  {deleteError && (
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  {isDeleting && deleteStep && (
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{deleteStep}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
