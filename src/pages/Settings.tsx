import React, { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import ProfileSettingsView from "../components/ProfileSettingsView";
import PauseLinkModal from "../components/PauseLinkModal";
import IOSInstallGuideModal from "../components/IOSInstallGuideModal";
import { uploadToCloudinary } from "../lib/cloudinary";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { usePWAInstall } from "../lib/usePWAInstall";
import { usePWAUpdate } from "../lib/usePWAUpdate";
import {
  enablePushNotifications,
  disablePushNotifications,
  triggerTestNotification,
  getNotificationPermissionStatus,
  NotificationPermissionState
} from "../lib/notifications";

export default function Settings() {
  const navigate = useNavigate();
  const { user, dbUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(dbUser?.displayName || "");
  const [bio, setBio] = useState(dbUser?.bio || "");
  const [theme, setTheme] = useState(dbUser?.theme || "default");
  const [avatarUrl, setAvatarUrl] = useState<string>(dbUser?.photoURL || dbUser?.avatarUrl || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [messageExpiryHours, setMessageExpiryHours] = useState<number>(dbUser?.messageExpiryHours || 0);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // PWA & Updates
  const pwa = usePWAInstall();
  const pwaUpdate = usePWAUpdate();

  // Push Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermissionStatus());
  const [isPushToggling, setIsPushToggling] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [notifStatusMsg, setNotifStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (dbUser) {
      if (!displayName && dbUser.displayName) setDisplayName(dbUser.displayName);
      if (!bio && dbUser.bio) setBio(dbUser.bio);
      if (!avatarUrl && (dbUser.photoURL || dbUser.avatarUrl)) setAvatarUrl(dbUser.photoURL || dbUser.avatarUrl || "");
      if (dbUser.theme && theme !== dbUser.theme) setTheme(dbUser.theme);
      if (dbUser.messageExpiryHours !== undefined && messageExpiryHours !== dbUser.messageExpiryHours) {
        setMessageExpiryHours(dbUser.messageExpiryHours);
      }
    }
  }, [dbUser]);

  useEffect(() => {
    setNotifPermission(getNotificationPermissionStatus());
  }, []);

  if (!user || !dbUser) {
    return <Navigate to="/" replace />;
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage({ text: "Please select a valid image (PNG, JPG, WEBP).", type: "error" });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setProfileMessage({ text: "Image file size must be less than 15MB.", type: "error" });
      return;
    }

    // Instant local preview for 0ms visual feedback
    const instantPreviewUrl = URL.createObjectURL(file);
    setAvatarUrl(instantPreviewUrl);

    setIsUploadingAvatar(true);
    setProfileMessage({ text: "Optimizing & uploading avatar...", type: "info" });

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

      setProfileMessage({ text: "Profile photo updated!", type: "success" });
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      setProfileMessage({ text: err.message || "Failed to upload image.", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl("");
    setProfileMessage({ text: "Removing avatar photo...", type: "info" });
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: null,
          avatarUrl: null,
          updatedAt: serverTimestamp()
        });
      }
      setProfileMessage({ text: "Avatar photo removed.", type: "success" });
    } catch (err: any) {
      console.error("Failed to remove avatar:", err);
      setProfileMessage({ text: getFriendlyErrorMessage(err), type: "error" });
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

      if (newExpiry !== oldExpiry) {
        updates.messageExpiryActivatedAt = newExpiry > 0 ? serverTimestamp() : null;
      } else if (newExpiry > 0 && !dbUser?.messageExpiryActivatedAt) {
        updates.messageExpiryActivatedAt = serverTimestamp();
      }

      await updateDoc(doc(db, "users", user.uid), updates);
      setProfileMessage({ text: "Settings saved!", type: "success" });
    } catch (err: any) {
      setProfileMessage({ text: getFriendlyErrorMessage(err), type: "error" });
    } finally {
      setIsUpdatingProfile(false);
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
        setNotifStatusMsg({ text: "Notifications enabled!", type: "success" });
      } else if (res.needsIOSInstall) {
        setShowIOSModal(true);
        setNotifStatusMsg({ text: "iOS requires adding to Home Screen for notifications.", type: "error" });
      } else {
        setNotifStatusMsg({ text: res.error || "Permission denied in browser settings.", type: "error" });
      }
    } catch (err: any) {
      setNotifStatusMsg({ text: err.message || "Failed to enable notifications.", type: "error" });
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
        setNotifStatusMsg({ text: "Notifications disabled.", type: "success" });
      } else {
        setNotifStatusMsg({ text: res.error || "Failed to disable notifications.", type: "error" });
      }
    } catch (err: any) {
      setNotifStatusMsg({ text: err.message || "Failed to disable notifications.", type: "error" });
    } finally {
      setIsPushToggling(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotif(true);
    setNotifStatusMsg(null);
    try {
      await triggerTestNotification(dbUser?.username || "friend");
      setNotifStatusMsg({ text: "Test notification sent!", type: "success" });
    } catch (err: any) {
      setNotifStatusMsg({ text: "Could not send test notification.", type: "error" });
    } finally {
      setIsTestingNotif(false);
    }
  };

  return (
    <div className="p-4 py-6 max-w-md mx-auto space-y-5 min-h-screen pb-28">
      {/* Back to Dashboard Header */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
          <SettingsIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Profile Settings</span>
        </div>
      </div>

      {/* Main Profile Settings View Component */}
      <ProfileSettingsView
        user={user}
        dbUser={dbUser}
        displayName={displayName}
        setDisplayName={setDisplayName}
        bio={bio}
        setBio={setBio}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        theme={theme}
        setTheme={setTheme}
        messageExpiryHours={messageExpiryHours}
        setMessageExpiryHours={setMessageExpiryHours}
        isUpdatingProfile={isUpdatingProfile}
        profileMessage={profileMessage}
        handleUpdateProfile={handleUpdateProfile}
        isUploadingAvatar={isUploadingAvatar}
        handleAvatarFileChange={handleAvatarFileChange}
        handleRemoveAvatar={handleRemoveAvatar}
        fileInputRef={fileInputRef}
        setShowPauseModal={setShowPauseModal}
        setShowIOSModal={setShowIOSModal}
        pwa={pwa}
        pwaUpdate={pwaUpdate}
        notifPermission={notifPermission}
        isPushToggling={isPushToggling}
        handleEnablePush={handleEnablePush}
        handleDisablePush={handleDisablePush}
        handleSendTestNotification={handleSendTestNotification}
        isTestingNotif={isTestingNotif}
        notifStatusMsg={notifStatusMsg}
      />

      {/* Modals */}
      <PauseLinkModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        userUid={user.uid}
        dbUser={dbUser}
      />

      <IOSInstallGuideModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />
    </div>
  );
}
