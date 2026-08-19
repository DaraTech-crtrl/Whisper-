import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../lib/store";
import { ArrowRight, Shield, MessageSquare, Lock, Sparkles, UserPlus, Zap } from "lucide-react";
import { getAssetUrl } from "../lib/assets";

type WelcomeStep = "intro" | "step1" | "step2" | "step3";

const FloatingBubble = ({ delay, duration, yOffset, xOffset, icon: Icon, colorClass }: any) => (
  <motion.div
    initial={{ y: 0, opacity: 0 }}
    animate={{ 
      y: [0, yOffset, 0], 
      x: [0, xOffset, 0],
      opacity: [0, 0.4, 0.4, 0] 
    }}
    transition={{
      duration: duration,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
    className={`absolute pointer-events-none p-3 rounded-2xl backdrop-blur-md border shadow-2xl ${colorClass}`}
  >
    <Icon className="w-5 h-5" />
  </motion.div>
);

export default function Welcome() {
  const { user, dbUser, privateKey } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<WelcomeStep>("intro");

  // If already logged in and decrypted, go to dashboard
  if (user && dbUser && privateKey) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleNext = () => {
    if (step === "intro") setStep("step1");
    else if (step === "step1") setStep("step2");
    else if (step === "step2") setStep("step3");
    else if (step === "step3") navigate("/auth");
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-6 pt-[max(1.5rem,calc(1.5rem+env(safe-area-inset-top,0px)))] pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom,0px)))] w-full min-h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Premium Background Grid & Glowing Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Glowing Orbs */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] mix-blend-screen dark:mix-blend-lighten animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen dark:mix-blend-lighten animate-pulse" style={{ animationDuration: '10s' }}></div>
      </div>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center text-center px-4 relative z-10"
          >
            {/* Background Floating Elements for Intro */}
            <FloatingBubble delay={0} duration={8} yOffset={-60} xOffset={40} icon={MessageSquare} colorClass="bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/30 text-indigo-500 -top-16 -left-10" />
            <FloatingBubble delay={2} duration={9} yOffset={50} xOffset={-30} icon={Lock} colorClass="bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/30 text-emerald-500 top-20 -right-12" />
            <FloatingBubble delay={4} duration={7} yOffset={-40} xOffset={-20} icon={Zap} colorClass="bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/30 text-amber-500 -bottom-20 left-4" />

            <div className="w-28 h-28 mb-8 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 blur-2xl rounded-full opacity-40 animate-pulse"></div>
              <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 flex items-center justify-center border-2 border-indigo-100 dark:border-slate-800 p-2.5 ring-4 ring-indigo-500/10 overflow-hidden">
                <img
                  src={getAssetUrl("android-chrome-192x192.png")}
                  alt="Whisper Logo"
                  className="w-full h-full object-cover rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5 drop-shadow-sm">
              Whisper
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-12 max-w-xs font-medium">
              The most secure way to receive anonymous messages, end-to-end encrypted.
            </p>

            <button
              onClick={handleNext}
              className="w-full group relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={handleSkip}
              className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              I already have an account
            </button>
          </motion.div>
        )}

        {step === "step1" && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 40, filter: "blur(5px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40, filter: "blur(5px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center text-center relative z-10 bg-white/70 dark:bg-slate-900/70 p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800/50 backdrop-blur-xl"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-indigo-900/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-indigo-100 dark:border-indigo-800/50">
              <UserPlus className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Create your link</h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10">
              Claim your unique username and get your personal Whisper link in seconds.
            </p>
            <div className="w-full flex gap-3">
              <button onClick={handleSkip} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">Skip</button>
              <button onClick={handleNext} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/25 transition-all flex justify-center items-center gap-2 group">
                Next <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          </motion.div>
        )}

        {step === "step2" && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 40, filter: "blur(5px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40, filter: "blur(5px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center text-center relative z-10 bg-white/70 dark:bg-slate-900/70 p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800/50 backdrop-blur-xl"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-purple-900/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-purple-100 dark:border-purple-800/50">
              <MessageSquare className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Share & Receive</h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10">
              Post your link on your Instagram story, Twitter, or anywhere else. Friends can send you messages anonymously.
            </p>
            <div className="w-full flex gap-3">
              <button onClick={handleSkip} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">Skip</button>
              <button onClick={handleNext} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/25 transition-all flex justify-center items-center gap-2 group">
                Next <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          </motion.div>
        )}

        {step === "step3" && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 40, filter: "blur(5px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40, filter: "blur(5px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center text-center relative z-10 bg-white/70 dark:bg-slate-900/70 p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800/50 backdrop-blur-xl"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/50 dark:to-emerald-900/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-emerald-100 dark:border-emerald-800/50">
              <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">100% Encrypted</h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10">
              Your messages are locked with military-grade encryption. Not even we can read them. Only you have the key.
            </p>
            <button onClick={handleNext} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]">
              Create Account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Step Indicators */}
      {step !== "intro" && (
        <div className="absolute bottom-12 flex gap-3 z-10">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step === "step1" ? "bg-indigo-600 w-8" : "bg-slate-300 dark:bg-slate-700"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step === "step2" ? "bg-indigo-600 w-8" : "bg-slate-300 dark:bg-slate-700"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step === "step3" ? "bg-indigo-600 w-8" : "bg-slate-300 dark:bg-slate-700"}`} />
        </div>
      )}
    </div>
  );
}
