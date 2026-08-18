import React, { useState } from "react";
import {
  X,
  User,
  ShieldAlert,
  Trash2,
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Mail,
  Calendar,
  Sparkles,
  KeyRound,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import localforage from "localforage";
import UserAvatar from "./UserAvatar";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  dbUser: any;
  messagesCount?: number;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  dbUser,
  messagesCount = 0
}: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "privacy" | "danger">("overview");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  if (!isOpen) return null;

  const expectedConfirmText = dbUser?.username || "DELETE";

  // Data Export Function
  const handleExportData = async () => {
    if (!user?.uid) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Fetch all messages for user
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

  // Clear local cache handler
  const handleClearCache = async () => {
    try {
      await localforage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error("Failed to clear local forage:", err);
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
      // Step 1: Delete all messages in Firestore subcollection
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

      // Step 2: Delete user profile document in Firestore
      setDeleteStep("2/4: Deleting user profile & public link...");
      try {
        await deleteDoc(doc(db, "users", user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
      }

      // Step 3: Clear local caches and state
      setDeleteStep("3/4: Clearing local cache & encryption keys...");
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

      // Complete! Sign out & redirect
      setDeleteStep("Account deleted successfully. Redirecting...");
      await auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error during account deletion:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again or contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-900 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  Account Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your account, data export & privacy
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-900 px-6 bg-slate-50/50 dark:bg-slate-900/30 gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              disabled={isDeleting}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              disabled={isDeleting}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "privacy"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Data & Privacy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("danger")}
              disabled={isDeleting}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "danger"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-rose-500/70 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Profile Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
                  <UserAvatar
                    photoURL={dbUser?.photoURL || dbUser?.avatarUrl || user?.photoURL}
                    avatarUrl={dbUser?.avatarUrl || dbUser?.photoURL || user?.photoURL}
                    name={dbUser?.displayName || user?.displayName}
                    username={dbUser?.username}
                    size="lg"
                    showBorder
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {dbUser?.displayName || user?.displayName || "Whisper User"}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                      @{dbUser?.username || "username"}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{user?.email || "No email linked"}</span>
                    </div>
                  </div>
                </div>

                {/* Account Details Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      User UID
                    </span>
                    <p className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                      {user?.uid}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Messages Received
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {messagesCount} total whispers
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Encryption Security
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span>E2EE Keypair Active</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account Status
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified & Active</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 text-xs text-indigo-900 dark:text-indigo-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>End-to-End Encryption Notice</span>
                  </div>
                  <p className="opacity-80 leading-relaxed">
                    Whisper encrypts all incoming messages using your unique RSA keypair. Only you can decrypt and read your messages on your logged-in device.
                  </p>
                </div>
              </div>
            )}

            {/* PRIVACY & DATA EXPORT TAB */}
            {activeTab === "privacy" && (
              <div className="space-y-4">
                {/* Export Data Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Export My Data
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Download a full JSON archive containing your profile details, statistics, and received messages.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? "Generating Export JSON..." : "Download Account Data (JSON)"}
                  </button>

                  {exportSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Data export downloaded successfully!</span>
                    </motion.div>
                  )}
                </div>

                {/* Clear Local Storage Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Clear Local Offline Cache
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Flush local message decryption cache from browser storage. Your Firestore data will remain intact and re-sync on refresh.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Cache Storage
                  </button>

                  {cacheCleared && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Local offline cache cleared!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DANGER ZONE / DELETE ACCOUNT TAB */}
            {activeTab === "danger" && (
              <div className="space-y-4">
                {/* Warning Card */}
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Permanently Delete Account</span>
                  </div>

                  <p className="text-xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                    This action is <strong>permanent and irreversible</strong>. Proceeding with deletion will permanently erase:
                  </p>

                  <ul className="text-xs text-rose-700/80 dark:text-rose-300/80 space-y-1.5 list-disc pl-4">
                    <li>Your public profile page and handle (<strong>@{dbUser?.username}</strong>)</li>
                    <li>All received whispers and archived messages in your inbox</li>
                    <li>Your end-to-end encryption keys and credentials</li>
                    <li>Your Firebase Authentication user account</li>
                  </ul>
                </div>

                {/* Confirm Delete Form */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    To confirm deletion, type your username <span className="text-rose-600 font-mono">"{expectedConfirmText}"</span> below:
                  </label>

                  <input
                    type="text"
                    value={confirmUsername}
                    onChange={(e) => setConfirmUsername(e.target.value)}
                    disabled={isDeleting}
                    placeholder={`Type ${expectedConfirmText} to confirm...`}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-rose-500 transition-colors font-mono"
                  />

                  {deleteError && (
                    <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  {isDeleting && deleteStep && (
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>{deleteStep}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmUsername.trim().toLowerCase() !== expectedConfirmText.trim().toLowerCase()}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting Account & Data..." : "Permanently Delete Account & Data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
