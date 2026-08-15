import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Wrench, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Radio, 
  Lock, 
  Server, 
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAssetUrl } from "../lib/assets";
import { motion } from "motion/react";

export default function Maintenance() {
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    "Whisper is currently undergoing scheduled infrastructure upgrades to enhance encryption performance and reliability."
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    // Realtime sync for instant updates if maintenance mode turns off
    const unsub = onSnapshot(doc(db, "systemSettings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.maintenanceMessage) {
          setMaintenanceMessage(data.maintenanceMessage);
        }
        if (!data.maintenanceMode) {
          // Auto reload / redirect to home if maintenance disabled
          window.location.href = "/";
        }
      }
    });
    return () => unsub();
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const snap = await getDoc(doc(db, "systemSettings", "global"));
      setLastCheck(new Date().toLocaleTimeString());
      if (snap.exists() && !snap.data().maintenanceMode) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-tr from-amber-500/5 via-indigo-500/5 to-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Header Branding */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 relative z-10 border-b border-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center p-1.5 shadow-lg shadow-black/50">
            <img 
              src={getAssetUrl("android-chrome-192x192.png")} 
              alt="Whisper Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">Whisper</span>
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                System Offline
              </span>
            </div>
            <p className="text-xs text-slate-500">Anonymous Zero-Knowledge Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 border border-slate-800 rounded-xl">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">Engine Status:</span>
          <span className="font-semibold text-amber-300">Under Maintenance</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-2xl w-full mx-auto my-auto py-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-8"
        >
          {/* Top Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

          {/* Icon Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center p-3 text-amber-400 shadow-xl shadow-amber-500/5">
              <Wrench className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" /> Scheduled Maintenance
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                System Upgrades in Progress
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                We're currently performing essential platform updates to serve you better.
              </p>
            </div>
          </div>

          {/* Maintenance Message Banner */}
          <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl relative space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Administrator Notice
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {maintenanceMessage}
            </p>
          </div>

          {/* Live Operational Health Checks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subsystem Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">User Data</div>
                  <div className="text-[10px] text-emerald-400">100% Encrypted & Safe</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">API Gateway</div>
                  <div className="text-[10px] text-amber-400">Syncing Engine</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Key Storage</div>
                  <div className="text-[10px] text-emerald-400">RSA Keyrings Active</div>
                </div>
              </div>

            </div>
          </div>

          {/* Status Check Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              Last checked at <span className="text-slate-300 font-mono">{lastCheck}</span>
            </div>

            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-amber-400" : ""}`} />
              <span>{isChecking ? "Checking System..." : "Check System Status"}</span>
            </button>
          </div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 relative z-10 text-xs text-slate-600 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} Whisper Security Engine. All anonymous data remains encrypted.</p>
        <div className="flex items-center gap-4 text-slate-500">
          <span className="hover:text-slate-400 transition-colors">Path: /maintenance</span>
          <span>•</span>
          <a href="/admin/unknownofrun" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Admin Portal</a>
        </div>
      </footer>

    </div>
  );
}
