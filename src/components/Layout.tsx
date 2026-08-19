import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, Bell, Settings } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../lib/store";
import { getAssetUrl } from "../lib/assets";
import LoadingScreen from "./LoadingScreen";
import Maintenance from "../pages/Maintenance";
import AppUpdateBanner from "./AppUpdateBanner";

export interface SystemSettings {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  announcementActive?: boolean;
  announcementText?: string;
}

export default function Layout() {
  const { user, isAuthReady, clearSession } = useAuthStore();
  const location = useLocation();
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "systemSettings", "global"), (snap) => {
      if (snap.exists()) {
        setSysSettings(snap.data() as SystemSettings);
      }
    }, (err) => {
      console.warn("System settings lookup failed:", err);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } finally {
      clearSession();
    }
  };

  if (!isAuthReady) {
    return <LoadingScreen message="Whisper" subtext="Loading secure session..." fullScreen />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isWelcomeOrAuth = location.pathname === "/" || location.pathname === "/auth";

  // Standalone Maintenance Mode Guard (Applies to all non-admin routes instantly)
  if (sysSettings?.maintenanceMode && !isAdminRoute) {
    return <Maintenance />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full relative bg-white dark:bg-slate-950 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
      
      {/* Global Announcement Banner */}
      {sysSettings?.announcementActive && sysSettings.announcementText && !isAdminRoute && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-xs py-2 px-4 pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))] flex items-center justify-center gap-2 font-medium shadow-sm border-b border-indigo-500/30">
          <Bell className="w-3.5 h-3.5 shrink-0 animate-bounce text-amber-300" />
          <span className="truncate">{sysSettings.announcementText}</span>
        </div>
      )}

      {!isWelcomeOrAuth && (
        <header className="px-4 pb-3.5 pt-[max(0.875rem,calc(0.875rem+env(safe-area-inset-top,0px)))] border-b border-slate-100 dark:border-slate-900 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-30 transition-all">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-600 dark:text-indigo-400">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 p-0.5">
              <img 
                src={getAssetUrl("android-chrome-192x192.png")} 
                alt="Whisper Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "block";
                }}
                referrerPolicy="no-referrer"
              />
              <span className="hidden text-base font-black">🤫</span>
            </div>
            <span className="tracking-tight">Whisper</span>
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              <Link 
                to="/settings"
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                title="Profile Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </header>
      )}
      
      <main className="flex-1 overflow-y-auto w-full relative flex flex-col justify-center">
        <Outlet />
      </main>

      {/* PWA Auto-Update / Version Update Notification Banner */}
      <AppUpdateBanner />
    </div>
  );
}
