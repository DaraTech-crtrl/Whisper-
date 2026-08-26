import React, { useState } from "react";
import { 
  Search, 
  X, 
  Globe, 
  MapPin, 
  Smartphone, 
  Monitor, 
  Clock, 
  Copy, 
  Check, 
  Info,
  ShieldAlert,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message } from "../../pages/Dashboard";
import { SenderHint, getFallbackSenderHint, formatDisplayDevice } from "../../lib/senderHint";
import { triggerHaptic } from "../../lib/haptics";

interface SenderHintModalProps {
  message: Message | null;
  onClose: () => void;
}

export default function SenderHintModal({
  message,
  onClose
}: SenderHintModalProps) {
  const [copiedIp, setCopiedIp] = useState(false);

  if (!message) return null;

  const hint: SenderHint = message.senderHint || getFallbackSenderHint(message.senderId, message.id);

  const handleCopyIp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hint.ip) return;
    try {
      await navigator.clipboard.writeText(hint.ip);
      setCopiedIp(true);
      triggerHaptic("success");
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Sender Digital Fingerprint
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Forensic telemetry captured upon transmission
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hint Info Cards Grid */}
          <div className="space-y-2.5">
            {/* IP Address Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Device IP Address
                  </div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                    {hint.ip}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyIp}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Copy IP"
              >
                {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Approximate Location */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Approx. Location
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {hint.location || "Unknown Location"}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                Geo
              </span>
            </div>

            {/* Phone Model & Hardware */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Phone Name & Model
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {formatDisplayDevice(hint)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                Device
              </span>
            </div>

            {/* Browser Software & OS */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Browser & Platform
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {hint.browser}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    OS: {hint.os}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                Client
              </span>
            </div>

            {/* Screen & Timezone Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Screen Res
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px] mt-0.5 truncate">
                  {hint.screen}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Timezone / Lang
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 truncate">
                  {hint.timezone}
                </div>
              </div>
            </div>
          </div>

          {hint.isEstimated && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Legacy message: Showing estimated device fingerprint.</span>
            </div>
          )}

          <button 
            type="button"
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-colors text-sm shadow-xs mt-1"
          >
            Close Fingerprint
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
