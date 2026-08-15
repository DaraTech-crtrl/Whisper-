import React, { useState, useEffect, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { decryptMessage } from "../lib/crypto";
import { Copy, Share2, Trash2, CheckCircle2, AlertTriangle, User, Edit3, Settings, Inbox, X, Download, Image as ImageIcon, QrCode, Clock, Heart, ThumbsUp, ThumbsDown, Award, Lock } from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { getFriendlyErrorMessage } from "../lib/errorHandler";

interface Message {
  id: string;
  senderId?: string;
  encryptedContent: string;
  createdAt: any;
  read: boolean;
  isFlagged: boolean;
  reaction?: string;
  rating?: number;
  mood?: string;
  unlocksAt?: any;
}

export default function Dashboard() {
  const { user, dbUser, privateKey } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [senderReputations, setSenderReputations] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  const [displayName, setDisplayName] = useState(dbUser?.displayName || "");
  const [bio, setBio] = useState(dbUser?.bio || "");
  const [theme, setTheme] = useState(dbUser?.theme || "default");
  const [messageExpiryHours, setMessageExpiryHours] = useState<number>(dbUser?.messageExpiryHours || 0);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(dbUser?.onboardingCompleted !== true);
  const messageCardRef = useRef<HTMLDivElement>(null);
  
  const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😲', '🥺', '🙏'];
  
  // Re-run lock check every minute to auto-decrypt if time passes while app is open
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(m => [...m]); // force re-render/re-eval
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, "users", user.uid, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });

      // Cleanup logic if expiry is set
      const currentExpiry = dbUser?.messageExpiryHours || 0;
      if (currentExpiry > 0) {
        const validMsgs = msgs.filter(m => {
          if (!m.createdAt?.seconds) return true;
          const msgDate = new Date(m.createdAt.seconds * 1000);
          if (differenceInHours(new Date(), msgDate) >= currentExpiry) {
            deleteDoc(doc(db, "users", user.uid, "messages", m.id)).catch(console.error);
            return false;
          }
          return true;
        });
        setMessages(validMsgs);
      } else {
        setMessages(msgs);
      }
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    messages.forEach(msg => {
      const isLocked = msg.unlocksAt && msg.unlocksAt.seconds * 1000 > Date.now();
      if (!isLocked && !decryptedCache[msg.id] && privateKey && msg.encryptedContent) {
        decryptMessage(privateKey, msg.encryptedContent).then(pl => {
          setDecryptedCache(prev => ({ ...prev, [msg.id]: pl }));
        });
      }
    });

    // Fetch and populate sender reputations
    const unmetSenderIds = [...new Set(messages.map(m => m.senderId).filter(Boolean))]
      .filter(id => senderReputations[id as string] === undefined);

    if (unmetSenderIds.length > 0) {
      unmetSenderIds.forEach(async (id) => {
        try {
          const d = await getDoc(doc(db, "anonymousUsers", id as string));
          setSenderReputations(prev => ({ 
            ...prev, 
            [id as string]: d.exists() ? (d.data().reputation || 0) : 0 
          }));
        } catch(e) {}
      });
    }
  }, [messages, privateKey]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const repA = a.senderId ? (senderReputations[a.senderId] || 0) : 0;
      const repB = b.senderId ? (senderReputations[b.senderId] || 0) : 0;
      if (repA !== repB) return repB - repA; // higher rating first
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA; // then newest
    });
  }, [messages, senderReputations]);

  if (!user || !dbUser || !privateKey) {
    return <Navigate to="/" replace />;
  }

  const publicUrl = `${window.location.origin}/u/${dbUser.username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {}
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Send me anonymous messages",
          text: "Send me an anonymous message! 🤫",
          url: publicUrl,
        });
      } else {
        handleCopy();
      }
    } catch(e) {}
  };

  const markRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // already read
    await updateDoc(doc(db, "users", user.uid, "messages", id), {
      read: true
    });
  };

  const deleteMsg = async (id: string) => {
    await deleteDoc(doc(db, "users", user.uid, "messages", id));
  };

  const reportMsg = async (id: string) => {
    if (confirm("Are you sure you want to report this message for abusive behavior?")) {
      await updateDoc(doc(db, "users", user.uid, "messages", id), {
        isFlagged: true
      });
      // In a real app we would add to a reports collection too
      alert("Message reported. Our team will review it.");
    }
  };

  const handleRate = async (msg: Message, e: React.MouseEvent, type: 'up' | 'down') => {
    e.stopPropagation();
    const newRating = type === 'up' ? 1 : -1;
    if (msg.rating === newRating) return; // already rated
    const diff = newRating - (msg.rating || 0);

    try {
      await updateDoc(doc(db, "users", user.uid, "messages", msg.id), { rating: newRating });
      if (msg.senderId) {
        const repRef = doc(db, "anonymousUsers", msg.senderId);
        const repDoc = await getDoc(repRef);
        const currentRep = repDoc.exists() ? (repDoc.data().reputation || 0) : 0;
        await setDoc(repRef, { reputation: currentRep + diff }, { merge: true });
        setSenderReputations(prev => ({
          ...prev,
          [msg.senderId as string]: currentRep + diff
        }));
      }
    } catch (err) {
      console.error("Failed to rate message", err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage({ text: "", type: "" });
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName,
        bio: bio,
        theme: theme,
        messageExpiryHours: Number(messageExpiryHours),
        updatedAt: serverTimestamp()
      });
      setProfileMessage({ text: "Profile updated successfully!", type: "success" });
    } catch (err: any) {
      setProfileMessage({ text: getFriendlyErrorMessage(err), type: "error" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleReact = async (msgId: string, reaction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "users", user.uid, "messages", msgId), { reaction });
      // Update local state if it's the selected message
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(prev => prev ? { ...prev, reaction } : null);
      }
    } catch (err) {
      console.error("Failed to add reaction", err);
    }
  };

  const completeOnboarding = async () => {
    try {
      setShowOnboarding(false);
      await updateDoc(doc(db, "users", user.uid), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  const handleMessageClick = (msg: Message) => {
    setSelectedMessage(msg);
    markRead(msg.id, msg.read);
  };

  const shareToStatus = async () => {
    if (!messageCardRef.current) return;
    setIsExporting(true);
    try {
      // Scale slightly to make the text crisp but not distorted
      await new Promise(res => setTimeout(res, 100));
      const dataUrl = await toPng(messageCardRef.current, { 
        cacheBust: true, 
        pixelRatio: 2, 
        style: { 
          transform: "scale(1)", 
          borderRadius: "0px", // Full page style
          width: "1080px",
          height: "1920px", // typical 9:16 story ratio
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "anonymous-message.png", { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Anonymous Message",
          text: "Send me an anonymous message! " + publicUrl
        });
      } else {
        // Fallback to download
        const link = document.createElement("a");
        link.download = "anonymous-message.png";
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to export image", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 py-8 max-w-md mx-auto space-y-8 min-h-screen">
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-3xl mb-4">
              ✨
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to your inbox!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              You are ready to receive anonymous messages. Here's how to get started:
            </p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">1</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Copy your link</span> from the dashboard.</div>
              </li>
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">2</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Share it</span> on your Instagram story, Twitter, or in your bios.</div>
              </li>
              <li className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 font-bold">3</div>
                <div className="text-sm pt-1.5"><span className="font-semibold">Check back here</span> or wait for notifications when friends reply!</div>
              </li>
            </ul>

            <button 
              onClick={completeOnboarding}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Let's Go!
            </button>
          </motion.div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === "inbox" 
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Inbox className="w-4 h-4" /> Inbox
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === "settings" 
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Settings className="w-4 h-4" /> Profile Settings
        </button>
      </div>

      {activeTab === "inbox" ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Your Secret Link</h2>
          <p className="text-indigo-100 text-sm">Post this on your stories or bio to receive anonymous messages.</p>
        </div>
        
        <div className="bg-black/20 p-3 rounded-xl flex items-center gap-2 backdrop-blur-sm">
          <div className="flex-1 truncate font-mono text-sm">{publicUrl}</div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors py-3 rounded-xl font-medium"
          >
            {copied ? <CheckCircle2 className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button 
            onClick={() => setShowQR(true)}
            className="w-12 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors py-3 rounded-xl"
            title="Show QR Code"
          >
            <QrCode className="w-5 h-5" />
          </button>
          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors py-3 rounded-xl font-bold shadow-sm"
          >
            <Share2 className="w-5 h-5"/>
            Share
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold">Your Profile QR Code</h3>
              <p className="text-xs text-slate-500 mb-2">Let friends scan this to send you anonymous messages offline.</p>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <QRCodeSVG value={publicUrl} size={180} fgColor="#4f46e5" level="H" />
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Hide QR Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{messages.length}</span>
          <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium uppercase tracking-widest mt-1">Total Msgs</span>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{messages.filter(m => !m.read).length}</span>
          <span className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium uppercase tracking-widest mt-1">Unread Msgs</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg px-2 flex items-center gap-2">
          Inbox
          {messages.filter(m => !m.read).length > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
              {messages.filter(m => !m.read).length} new
            </span>
          )}
        </h3>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedMessages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="text-4xl mb-3">👻</div>
                <p className="text-slate-500 font-medium">No messages yet.</p>
                <p className="text-slate-400 text-sm mt-1">Share your link to get started!</p>
              </motion.div>
            )}

            {sortedMessages.map(msg => {
              const rep = msg.senderId && senderReputations[msg.senderId];
              return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "p-4 rounded-2xl border transition-colors cursor-pointer group flex flex-col",
                  msg.read 
                    ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                    : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm"
                )}
                onClick={() => handleMessageClick(msg)}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-slate-400">
                      {msg.createdAt?.seconds ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true }) : "Just now"}
                    </div>
                    {rep !== undefined && rep !== 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        <Award className="w-3 h-3" />
                        Rep {rep > 0 ? '+' : ''}{rep}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {msg.reaction && (
                      <span className="text-sm animate-in zoom-in">{msg.reaction}</span>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); reportMsg(msg.id); }}
                      className="text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Report Message"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className={cn("text-lg font-medium break-words whitespace-pre-wrap font-sans mb-3 flex-1", !msg.read && "text-indigo-900 dark:text-indigo-100")}>
                  {(() => {
                    const isLocked = msg.unlocksAt && (msg.unlocksAt.seconds * 1000 > Date.now());
                    if (isLocked) {
                       return (
                         <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mt-2 border border-dashed border-slate-300 dark:border-slate-700">
                           <Lock className="w-6 h-6 text-slate-400 mb-2" />
                           <span className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-1">Time Capsule</span>
                           <span className="text-xs text-slate-400 font-mono">Unlocks {new Date(msg.unlocksAt.seconds * 1000).toLocaleString()}</span>
                         </div>
                       );
                    }

                    if (decryptedCache[msg.id] === undefined) {
                      return <span className="animate-pulse text-slate-300">Decrypting...</span>;
                    }

                    const decrypted = decryptedCache[msg.id];
                    if (decrypted.startsWith("data:audio/webm;base64,")) {
                      return (
                        <div className="mt-2">
                          {msg.mood && <span className="mr-2 text-xl">{msg.mood}</span>}
                          <span className="text-sm font-bold text-slate-500 mb-2 block uppercase tracking-wide">🎤 Voice Note</span>
                          <audio src={decrypted} controls className="w-full h-8" />
                        </div>
                      );
                    }

                    return <>{msg.mood && <span className="mr-2 text-xl">{msg.mood}</span>}{decrypted}</>;
                  })()}
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-2 mt-2" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-1 items-center">
                    <span className="text-xs font-medium text-slate-400 self-center mr-2"><Heart className="w-3.5 h-3.5" /></span>
                    {QUICK_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => handleReact(msg.id, emoji === msg.reaction ? '' : emoji, e)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full text-base transition-all shrink-0",
                          msg.reaction === emoji ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500/30 scale-110" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-70 hover:opacity-100 hover:scale-110"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {msg.senderId && (
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3 ml-2">
                      <button
                        onClick={(e) => handleRate(msg, e, 'up')}
                        className={cn("p-1.5 rounded-full transition-colors", msg.rating === 1 ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400")}
                        title="Thumbs Up"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleRate(msg, e, 'down')}
                        className={cn("p-1.5 rounded-full transition-colors", msg.rating === -1 ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400")}
                        title="Thumbs Down"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
        </div>
      </div>
      </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Profile Details</h2>
              <p className="text-sm text-slate-500">Update how you appear to others on your public link.</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="E.g. Jane Doe"
                    maxLength={30}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Bio (Optional)</label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <textarea 
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Write a short intro to prompt your friends..."
                    maxLength={150}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors resize-none min-h-[100px]"
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-400">
                    {bio.length}/150
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Profile Theme</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <select 
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value="default">Default Minimal</option>
                    <option value="cosmic">Cosmic Space</option>
                    <option value="sunset">Sunset Vibes</option>
                    <option value="forest">Secret Forest</option>
                    <option value="ocean">Deep Ocean</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 pl-1 text-slate-700 dark:text-slate-300">Auto-Delete Messages (Self-Destruct)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <select 
                    value={messageExpiryHours}
                    onChange={e => setMessageExpiryHours(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value={0}>Never (Keep forever)</option>
                    <option value={1}>After 1 Hour</option>
                    <option value={24}>After 24 Hours</option>
                    <option value={168}>After 7 Days</option>
                    <option value={720}>After 30 Days</option>
                  </select>
                </div>
                <p className="text-xs text-slate-500 mt-2 pl-1 mb-2">If enabled, messages will be permanently deleted from your inbox after the time limit.</p>
              </div>

              {profileMessage.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${profileMessage.type === "success" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {profileMessage.text}
                </div>
              )}

              <button 
                type="submit"
                disabled={isUpdatingProfile || (!displayName.trim())}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                {isUpdatingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm flex flex-col gap-4"
            >
              <div className="flex justify-end">
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Card to be exported as image */}
              <div
                className="overflow-hidden rounded-[2rem] shadow-2xl relative bg-black"
                style={{ aspectRatio: "9/16" }}
              >
                <div 
                  ref={messageCardRef}
                  className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 p-8 flex flex-col justify-center relative overflow-hidden"
                >
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]"></div>
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-300 opacity-20 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10 flex flex-col items-center h-full justify-center space-y-8">
                    <div className="flex flex-col items-center justify-center gap-2 mb-4">
                      {selectedMessage?.reaction && (
                        <div className="text-4xl mb-2">{selectedMessage.reaction}</div>
                      )}
                      <span className="bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                        Anonymous Message
                      </span>
                    </div>

                    <p className="text-3xl sm:text-4xl lg:text-5xl font-bold font-sans text-center leading-snug break-words whitespace-pre-wrap text-white drop-shadow-xl w-full px-4">
                      {decryptedCache[selectedMessage.id] || "Decrypting..."}
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/20 text-center w-full max-w-[80%] absolute bottom-12">
                      <p className="text-sm text-indigo-100 font-medium mb-1 drop-shadow-sm">Send me a message at</p>
                      <p className="text-sm font-mono font-bold text-white break-words px-4 py-2 bg-black/20 rounded-xl backdrop-blur-md border border-white/10">{publicUrl}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={shareToStatus}
                  disabled={isExporting}
                  className="flex-1 bg-white hover:bg-slate-50 text-indigo-600 font-bold py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <span className="animate-pulse">Generating image...</span>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Share Picture
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
