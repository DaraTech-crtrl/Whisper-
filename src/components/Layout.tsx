import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { getAssetUrl } from "../lib/assets";
import LoadingScreen from "./LoadingScreen";

export default function Layout() {
  const { user, isAuthReady, clearSession } = useAuthStore();
  const location = useLocation();

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

  const isWelcomeOrAuth = location.pathname === "/" || location.pathname === "/auth";

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full relative bg-white dark:bg-slate-950 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
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
