import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, Timestamp, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { encryptMessage } from "../lib/crypto";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { captureSenderHint } from "../lib/senderHint";
import { Send, CheckCircle2, AlertTriangle, Lock, Watch, Clock, RefreshCw, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import LoadingScreen from "../components/LoadingScreen";
import UserAvatar from "../components/UserAvatar";
import { getModeByPathPrefix } from "../lib/whisperModes";
import { cn } from "../lib/utils";
import LinkPreviewCard from "../components/LinkPreviewCard";
import { extractUrls } from "../lib/linkPreview";

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  
  // Extract path prefix (e.g. "confess", "about", "ask", "opinion", "crush", "compliment", "roast", "u")
  const pathPrefix = location.pathname.split("/")[1] || "u";
  const currentMode = getModeByPathPrefix(pathPrefix);

  // Extract optional custom prompt from query string
  const searchParams = new URLSearchParams(location.search);
  const customPromptParam = searchParams.get("p") || searchParams.get("prompt");
  const activePromptText = customPromptParam?.trim() || currentMode.prompt;

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not_found">("loading");
  
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [anonId, setAnonId] = useState<string>("");
  const [unlocksAtData, setUnlocksAtData] = useState<string>("");

  // Autosave Draft State
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const BAD_WORDS = ["hate", "kill", "die", "stupid", "idiot", "dumb"];
  const MOODS = ['😎', '🤔', '🥺', '🤣', '🤫', '👀', '❤️', '🔥'];

  // Restore autosaved draft locally
  useEffect(() => {
    if (!username) return;
    const draftKey = `whisper_draft_${username.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.text === "string" && parsed.text.trim()) {
            setMessage(parsed.text);
            if (parsed.mood) setMood(parsed.mood);
            if (parsed.unlocksAtData) setUnlocksAtData(parsed.unlocksAtData);
            setHasRestoredDraft(true);
            setIsDraftSaved(true);
          }
        } catch {
          if (saved.trim()) {
            setMessage(saved);
            setHasRestoredDraft(true);
            setIsDraftSaved(true);
          }
        }
      }
    } catch (err) {
      console.warn("Could not read autosaved draft", err);
    }
  }, [username]);

  // Persist draft locally on change
  useEffect(() => {
    if (!username) return;
    const draftKey = `whisper_draft_${username.toLowerCase()}`;
    try {
      if (message.trim()) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            text: message,
            mood,
            unlocksAtData,
            savedAt: Date.now()
          })
        );
        setIsDraftSaved(true);
      } else {
        localStorage.removeItem(draftKey);
        setIsDraftSaved(false);
        setHasRestoredDraft(false);
      }
    } catch (err) {
      console.warn("Failed to save draft to localStorage", err);
    }
  }, [message, mood, unlocksAtData, username]);

  // Ensure draft is saved if user navigates or closes abruptly
  useEffect(() => {
    if (!username) return;
    const draftKey = `whisper_draft_${username.toLowerCase()}`;
    const handleSaveBeforeLeave = () => {
      if (message.trim()) {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              text: message,
              mood,
              unlocksAtData,
              savedAt: Date.now()
            })
          );
        } catch (e) {}
      }
    };

    window.addEventListener("beforeunload", handleSaveBeforeLeave);
    window.addEventListener("pagehide", handleSaveBeforeLeave);
    return () => {
      window.removeEventListener("beforeunload", handleSaveBeforeLeave);
      window.removeEventListener("pagehide", handleSaveBeforeLeave);
    };
  }, [message, mood, unlocksAtData, username]);

  useEffect(() => {
    let storedId = localStorage.getItem('anonId');
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('anonId', storedId);
    }
    setAnonId(storedId);
  }, []);

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
      
      if (profile?.allowTimeCapsule === true && unlocksAtData) {
        const d = new Date(unlocksAtData);
        if (d > new Date()) {
          payloadData.unlocksAt = Timestamp.fromDate(d);
        }
      }
      
      await addDoc(collection(db, "users", profile.uid, "messages"), payloadData);

      // Increment the message counter on the user document for faster leaderboard tracking
      try {
        await updateDoc(doc(db, "users", profile.uid), {
          messageCount: increment(1),
          receivedMessagesCount: increment(1), // Supporting both common field names
          updatedAt: serverTimestamp()
        });
      } catch (updateErr) {
        console.warn("Could not increment user message counter:", updateErr);
      }

      // Trigger Real Background Push Notification (delivers even if app is closed or locked)
      fetch("/api/notify-whisper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: profile.uid,
          subscriptions: profile.pushSubscriptions || (profile.pushSubscription ? [profile.pushSubscription] : []),
          subscription: profile.pushSubscription || null,
          fcmTokens: profile.fcmTokens || (profile.fcmToken ? [profile.fcmToken] : []),
          mode: currentMode.name,
          modeIcon: currentMode.icon,
          username: profile.username
        })
      }).catch(e => console.warn("Notification dispatch notice:", e));

      setSent(true);
      setMessage("");
      setMood("");
      setUnlocksAtData("");
      if (username) {
        try {
          localStorage.removeItem(`whisper_draft_${username.toLowerCase()}`);
        } catch (e) {}
      }
      setIsDraftSaved(false);
      setHasRestoredDraft(false);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err) || "Failed to send message securely. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Calculate link pause status
  const isPermanentlyPaused = profile?.isLinkPaused === true;
  let isTemporarilyPaused = false;
  let tempPauseTimeRemaining = "";

  if (profile?.pauseUntil) {
    const timeMs = profile.pauseUntil.seconds
      ? profile.pauseUntil.seconds * 1000
      : (profile.pauseUntil.toDate ? profile.pauseUntil.toDate().getTime() : new Date(profile.pauseUntil).getTime());

    if (timeMs > Date.now()) {
      isTemporarilyPaused = true;
      tempPauseTimeRemaining = formatDistanceToNow(new Date(timeMs), { addSuffix: true });
    }
  }

  const isLinkPaused = isPermanentlyPaused || isTemporarilyPaused;

  const pageTitle = profile 
    ? `${currentMode.icon} ${currentMode.name} — @${username} on Whisper`
    : `${currentMode.icon} ${currentMode.name} — Whisper Anonymous Messaging`;

  const pageDescription = profile
    ? `Send a 100% anonymous, E2E encrypted message to ${profile.displayName || '@' + username} on Whisper.`
    : `Send anonymous, E2E encrypted messages.`;

  const appUrl = typeof window !== 'undefined' ? window.location.href : '';

  const renderHelmet = () => (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={appUrl} />
      <meta property="og:site_name" content="Whisper" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Whisper",
          "applicationCategory": "CommunicationApplication",
          "operatingSystem": "All",
          "description": pageDescription,
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        })}
      </script>
    </Helmet>
  );

  if (status === "loading") {
    return (
      <>
        {renderHelmet()}
        <LoadingScreen message="Whisper" subtext="Finding public profile..." fullScreen={false} />
      </>
    );
  }

  if (status === "not_found" || !profile) {
    return (
      <>
        {renderHelmet()}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
          <AlertTriangle className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Profile Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400">The link might be broken or the user doesn't exist.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {renderHelmet()}
      <div className="min-h-[100dvh] w-full pb-16 flex flex-col items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md px-4 relative flex flex-col mt-8 sm:mt-12 z-10">
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
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center w-full max-w-sm shadow-2xs">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 leading-snug">
                  <span>{currentMode.icon}</span>
                  <span>{activePromptText}</span>
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
            ) : isLinkPaused ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3.5 my-3 shadow-inner">
                <div className="w-16 h-16 bg-slate-200/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center mx-auto text-2xl">
                  ✋
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">
                  Messages Paused
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  @{profile.displayName || profile.username} has paused their link and is currently taking a break from receiving messages.
                </p>
                {isTemporarilyPaused && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Unpauses {tempPauseTimeRemaining}</span>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Check Status
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Restored Draft Alert Banner */}
              {hasRestoredDraft && message && (
                <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Restored saved draft from your previous visit</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setMood("");
                      setUnlocksAtData("");
                      if (username) {
                        try {
                          localStorage.removeItem(`whisper_draft_${username.toLowerCase()}`);
                        } catch (e) {}
                      }
                      setHasRestoredDraft(false);
                      setIsDraftSaved(false);
                    }}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    Discard
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="relative">
                  <textarea
                    id="message-input"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={currentMode.placeholder}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[140px] resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans text-base"
                    maxLength={500}
                  />
                </div>

                {/* Status Bar: Autosave indicator + Character counter */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {message.trim() && isDraftSaved ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium transition-colors">
                        <Check className="w-3 h-3" /> Autosaved locally
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        Autosaves locally as you type
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-slate-400 dark:text-slate-500">
                    {message.length}/500
                  </div>
                </div>
              </div>

              {/* Automatic Link Preview for Typed URLs */}
              {(() => {
                const detectedUrls = extractUrls(message);
                if (detectedUrls.length === 0) return null;
                return (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                      <span>Link Attachment Preview</span>
                    </div>
                    <LinkPreviewCard url={detectedUrls[0]} variant="default" />
                  </div>
                );
              })()}

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

              {/* Time Capsule Delivery (Only shown if enabled by the recipient; always OFF by default) */}
              {profile?.allowTimeCapsule === true && (
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
              )}

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
    </>
  );
}

