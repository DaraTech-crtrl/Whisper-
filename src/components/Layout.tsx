import { Outlet, Link } from "react-router-dom";
import { MessageSquare, LogOut } from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../lib/store";

export default function Layout() {
  const { user, isAuthReady } = useAuthStore();

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full relative bg-white dark:bg-slate-950 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
      <header className="p-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
          <MessageSquare className="w-6 h-6" />
          <span>Whisper</span>
        </Link>
        {user && (
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </header>
      
      <main className="flex-1 overflow-y-auto w-full relative">
        <Outlet />
      </main>
    </div>
  );
}
