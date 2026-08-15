import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../lib/store";
import { getAssetUrl } from "../lib/assets";
import LoadingScreen from "./LoadingScreen";

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

  // System Maintenance Block (does NOT affect /admin routes)
  if (sysSettings?.maintenanceMode && !isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 text-center max-w-md mx-auto relative overflow-hidden">
        <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 p-2 shadow-2xl shadow-amber-500/10">
          <ShieldAlert className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">System Under Maintenance</h1>
        <p className="text-sm text-slate-300 leading-relaxed mb-6 bg-slate-900/80 p-4 border border-slate-800 rounded-2xl">
          {sysSettings.maintenanceMessage || "Whisper is currently undergoing scheduled maintenance. Please check back shortly."}
        </p>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Maintenance Mode Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full relative bg-white dark:bg-slate-950 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
      
      {/* Global Announcement Banner */}
      {sysSettings?.announcementActive && sysSettings.announcementText && !isAdminRoute && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-xs py-2 px-4 flex items-center justify-center gap-2 font-medium shadow-sm border-b border-indigo-500/30">
          <Bell className="w-3.5 h-3.5 shrink-0 animate-bounce text-amber-300" />
          <span className="truncate">{sysSettings.announcementText}</span>
        </div>
      )}

      {!isWelcomeOrAuth && (
        <header className="p-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-600 dark:text-indigo-400">
            <img 
              src={getAssetUrl("android-chrome-192x192.png")} 
              alt="Whisper Logo" 
              className="w-7 h-7 rounded-lg shadow-sm bg-white border border-slate-100 p-0.5"
              referrerPolicy="no-referrer"
            />
            <span>Whisper</span>
          </Link>
          {user && (
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </header>
      )}
      
      <main className="flex-1 overflow-y-auto w-full relative flex flex-col justify-center">
        <Outlet />
      </main>
    </div>
  );
}
