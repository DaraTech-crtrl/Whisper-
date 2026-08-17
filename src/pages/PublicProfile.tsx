import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { encryptMessage } from "../lib/crypto";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { captureSenderHint } from "../lib/senderHint";
import { Send, CheckCircle2, AlertTriangle, Lock, Award, Watch } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LoadingScreen from "../components/LoadingScreen";
import UserAvatar from "../components/UserAvatar";
import { getModeByPathPrefix } from "../lib/whisperModes";
import { cn } from "../lib/utils";

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  
  // Extract path prefix (e.g. "confess", "about", "ask", "opinion", "crush", "compliment", "roast", "u")
  const pathPrefix = location.pathname.split("/")[1] || "u";
  const currentMode = getModeByPathPrefix(pathPrefix);

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not_found">("loading");
  
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [anonId, setAnonId] = useState<string>("");
  const [reputation, setReputation] = useState<number | null>(null);

  const [unlocksAtData, setUnlocksAtData] = useState<string>("");

  const BAD_WORDS = ["hate", "kill", "die", "stupid", "idiot", "dumb"];
  const MOODS = ['😎', '🤔', '🥺', '🤣', '🤫', '👀', '❤️', '🔥'];

  useEffect(() => {
    let storedId = localStorage.getItem('anonId');
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('anonId', storedId);
    }
    setAnonId(storedId);

    const fetchReputation = async () => {
      try {
        const repDoc = await getDoc(doc(db, "anonymousUsers", storedId as string));
        if (repDoc.exists()) {
          setReputation(repDoc.data().reputation);
        } else {
          await setDoc(doc(db, "anonymousUsers", storedId as string), { reputation: 0 });
          setReputation(0);
        }
      } catch (err) {
        console.error("Failed to fetch reputation", err);
      }
    };
    fetchReputation();
  }, []);

  useEffect(() => {
    if (username) {
      document.title = `${currentMode.icon} ${currentMode.name} — @${username} on Whisper`;
    } else {
      document.title = `${currentMode.name} — Whisper Anonymous Messaging`;
    }

    return () => {
      document.title = "Whisper — Anonymous Encrypted Messaging";
    };
  }, [username, currentMode]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        if (snap.empty) {
          setStatus("not_found");
          return;
        }
        setProfile(snap.docs[0].data());
        setStatus("found");
      } catch (err) {
        console.error(err);
        setStatus("not_found");
      }
    };
    fetchProfile();
  }, [username]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !profile) return;
    setError("");

    const lowerMsg = message.toLowerCase();
    const hasBadWords = BAD_WORDS.some(word => lowerMsg.includes(word));
    if (hasBadWords) {
      setError("Please keep it friendly! Inappropriate words are not allowed.");
      return;
    }

    setIsSending(true);
    try {
      const [encrypted, hint] = await Promise.all([
        encryptMessage(profile.publicKey, message),
        captureSenderHint().catch(() => null)
      ]);
      
      // Strip undefined values to prevent Firestore addDoc errors
      const cleanHint = hint ? JSON.parse(JSON.stringify(hint)) : null;

      const payloadData: any = {
        receiverId: profile.uid,
        senderId: anonId,
        encryptedContent: encrypted,
        createdAt: serverTimestamp(),
        read: false,
        isFlagged: false,
        rating: 0,
        mode: currentMode.id,
        category: currentMode.tagLabel,
        tags: [currentMode.id],
        ...(mood ? { mood } : {}),
        ...(cleanHint ? { senderHint: cleanHint } : {})
      };
      
      if (unlocksAtData) {
        const d = new Date(unlocksAtData);
        if (d > new Date()) {
          payloadData.unlocksAt = Timestamp.fromDate(d);
        }
      }
      
      await addDoc(collection(db, "users", profile.uid, "messages"), payloadData);

      // Trigger Cloud Messaging alert (non-blocking)
      fetch("/api/notify-whisper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: profile.uid,
          mode: currentMode.name,
          modeIcon: currentMode.icon,
          username: profile.username
        })
      }).catch(e => console.warn("Notification dispatch notice:", e));

      setSent(true);
      setMessage("");
      setUnlocksAtData("");
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err) || "Failed to send message securely. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") {
    return <LoadingScreen message="Whisper" subtext="Finding public profile..." fullScreen={false} />;
  }

  if (status === "not_found" || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <AlertTriangle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Profile Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400">The link might be broken or the user doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full pb-16 flex flex-col items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md px-4 relative flex flex-col mt-8 sm:mt-12 z-10">
        {reputation !== null && reputation !== 0 && (
          <div className="self-end mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-xs">
            <Award className="w-4 h-4 text-indigo-500" />
            Reputation: {reputation > 0 ? '+' : ''}{reputation}
          </div>
        )}

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div 
            key="compose"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden"
          >
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

            <div className="flex flex-col items-center mb-5 text-center">
              {/* Mode Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide uppercase mb-4 shadow-2xs">
                <span className="text-sm">{currentMode.icon}</span>
                <span>{currentMode.name}</span>
              </div>

              <UserAvatar
                photoURL={profile.photoURL}
                avatarUrl={profile.avatarUrl}
                name={profile.displayName}
                username={profile.username}
                size="xl"
                className="mb-3.5 shadow-md ring-4 ring-indigo-500/10 dark:ring-indigo-400/20"
              />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {profile.displayName || `@${profile.username}`}
              </h1>
              
              {profile.bio && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 px-2 break-words max-w-xs">
                  {profile.bio}
                </p>
              )}

              {/* Mode specific prompt box */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center w-full max-w-sm">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <span>{currentMode.icon}</span>
                  <span>{currentMode.prompt}</span>
                </p>
              </div>
            </div>

            {profile.isLocked ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-2 my-4">
                <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-red-500 text-sm">Account Suspended</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This user account has been suspended by an administrator and cannot currently receive new messages.
                </p>
              </div>
            ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="relative">
                <textarea
                  id="message-input"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={currentMode.placeholder}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[140px] resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans text-base"
                  maxLength={500}
                />
                <div className="absolute bottom-3 right-4 text-xs font-mono text-slate-400">
                  {message.length}/500
                </div>
              </div>

              {/* Mood Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 pl-1 shrink-0">Mood:</span>
                {MOODS.map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setMood(mood === emoji ? '' : emoji)}
                    className={cn(
                      "shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-base transition-all cursor-pointer",
                      mood === emoji 
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110 shadow-sm" 
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-110"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Time Capsule Delivery */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Watch className="w-3.5 h-3.5 text-indigo-500" />
                  Time-Capsule Delivery (Optional)
                </label>
                <input 
                  id="profile-time-capsule-input"
                  type="datetime-local" 
                  value={unlocksAtData}
                  onChange={(e) => setUnlocksAtData(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
                {unlocksAtData && (
                   <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                     Message will be locked until {new Date(unlocksAtData).toLocaleString()}.
                   </p>
                )}
              </div>

              {error && (
                <p className="text-rose-600 dark:text-rose-400 text-xs font-medium text-center bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2.5 rounded-xl">{error}</p>
              )}

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-500" /> E2E Encrypted & 100% Anonymous
              </p>

              <button 
                type="submit"
                disabled={isSending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 cursor-pointer text-sm sm:text-base"
              >
                {isSending ? "Encrypting & Sending..." : `Send ${currentMode.name}`}
                {!isSending && <Send className="w-4 h-4 ml-1" />}
              </button>
            </form>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 mt-6"
          >
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 border border-emerald-200 dark:border-emerald-500/30 rounded-full flex items-center justify-center mb-5 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{currentMode.successTitle}</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-8 max-w-xs leading-relaxed">
              {currentMode.successMessage(profile.username)}
            </p>
            
            <button 
              onClick={() => { setSent(false); setMessage(""); }}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors underline underline-offset-4 text-sm cursor-pointer"
            >
              Send another {currentMode.name.toLowerCase()}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-8 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-4 rounded-2xl">
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Want your own Whisper link?</p>
        <button 
          onClick={() => window.location.href = "/"}
          className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-sm w-full transition-colors cursor-pointer"
        >
          Create Free Whisper Account
        </button>
      </div>
      </div>
    </div>
  );
}

