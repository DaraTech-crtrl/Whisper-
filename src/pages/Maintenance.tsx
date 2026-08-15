import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAssetUrl } from "../lib/assets";
import { motion } from "motion/react";

// ---------------------------------------------------------------------------
// Decrypt-style text reveal for the headline.
// ---------------------------------------------------------------------------
function useDecodeText(target: string, active: boolean) {
  const [display, setDisplay] = useState(target);
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01#%^&*/\\<>[]{}=+";

  useEffect(() => {
    if (!active) {
      setDisplay(target);
      return;
    }
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    let raf: number;
    const settleAt = target.split("").map((_, i) => i * 2 + 6);

    const tick = () => {
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === " ") {
          out += " ";
        } else if (frame >= settleAt[i]) {
          out += ch;
        } else if (frame >= settleAt[i] - 6) {
          out += glyphs[Math.floor(Math.random() * glyphs.length)];
        } else {
          out += " ";
        }
      }
      setDisplay(out);
      frame++;
      if (frame < Math.max(...settleAt) + 4) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target]);

  return display;
}

export default function Maintenance() {
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    "Whisper is currently undergoing scheduled infrastructure upgrades to enhance encryption performance and reliability."
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());
  const headline = useDecodeText("Re-establishing secure channel", true);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
        @keyframes whisperBlink { 0%, 45% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .whisper-cursor { animation: whisperBlink 1.1s steps(1) infinite; }
        @keyframes whisperPulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }
        .whisper-pulse { animation: whisperPulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .whisper-cursor, .whisper-pulse { animation: none; }
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 15%, rgba(99,102,241,0.06), transparent 55%)",
        }}
      />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 relative z-10 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
            <img
              src={getAssetUrl("android-chrome-192x192.png")}
              alt="Whisper Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Whisper</span>
              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 whisper-pulse" />
                Offline
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">zero-knowledge relay</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl w-full mx-auto my-auto py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden space-y-7"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-indigo-400/50 to-transparent" />

          {/* Hero */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-14 h-14 shrink-0 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Scheduled maintenance
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight font-mono min-h-[1.4em]">
                {headline}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md">
                The relay is offline while we rotate encryption keys and verify the
                network. Nothing is lost — every message stays sealed until we're
                back.
              </p>
            </div>
          </div>

          {/* Operator notice */}
          <div className="relative p-5 bg-slate-50 border border-slate-200 border-l-2 border-l-indigo-400 rounded-xl space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" /> Operator notice
            </span>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {maintenanceMessage}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-5">
            <div className="text-[11px] font-mono text-slate-500 text-center sm:text-left">
              last_sync: <span className="text-slate-700">{lastCheck}</span>
            </div>

            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-mono font-medium rounded-xl text-xs border border-slate-200 hover:border-indigo-300 flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-indigo-500" : "text-slate-400"}`} />
              <span>{isChecking ? "connecting…" : "$ retry_handshake"}</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 relative z-10 text-[11px] font-mono text-slate-400 border-t border-slate-200 flex items-center justify-center gap-1.5">
        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
        all data remains end-to-end encrypted · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
