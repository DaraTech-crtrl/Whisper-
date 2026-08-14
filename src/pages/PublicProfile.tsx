import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { encryptMessage } from "../lib/crypto";
import { MessageSquare, Send, CheckCircle2, AlertTriangle, Lock, Award, Mic, Square, Watch, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
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

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const BAD_WORDS = ["hate", "kill", "die", "stupid", "idiot", "dumb"];
  const MOODS = ['😎', '🤔', '🥺', '🤣', '🤫', '👀'];
  const PROMPTS = [
    "What's your first impression of me?",
    "Send me a song recommendation 🎵",
    "What's an unspoken rule you have?",
    "If you could tell me one thing...",
    "Ask me anything!",
    "What's your current favorite show?"
  ];

  const handleRandomPrompt = () => {
    const random = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    const el = document.getElementById("message-input") as HTMLTextAreaElement;
    if (el) {
      el.placeholder = random;
      el.focus();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      
      // Pitch-shift / robot masking effect
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 50;
      
      const oscGain = audioCtx.createGain();
      osc.connect(oscGain);
      
      const ringModGain = audioCtx.createGain();
      ringModGain.gain.value = 0; // modulated by osc
      oscGain.connect(ringModGain.gain);
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1000;
      
      source.connect(filter);
      filter.connect(ringModGain);
      // Wait, ring modulation is source -> gain -> dest; osc -> gain.gain
      // Actually simpler: just bandpass then distort
      filter.disconnect();
      source.connect(filter);
      
      // simple distortion
      const shaper = audioCtx.createWaveShaper();
      function makeDistortionCurve(amount: number) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0 ; i < n_samples; ++i ) {
          const x = i * 2 / n_samples - 1;
          curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
        }
        return curve;
      }
      shaper.curve = makeDistortionCurve(50);
      shaper.oversample = '4x';
      
      filter.connect(shaper);

      const dest = audioCtx.createMediaStreamDestination();
      shaper.connect(dest);
      
      // Some browsers require the oscillator to be started for ring mods, but we'll stick to distortion.
      const mediaRecorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or error starting recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioCtxRef.current?.close();
    }
  };

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
    if ((!message.trim() && !recordedAudio) || !profile) return;
    setError("");

    const lowerMsg = message.toLowerCase();
    const hasBadWords = BAD_WORDS.some(word => lowerMsg.includes(word));
    if (hasBadWords) {
      setError("Please keep it friendly! Inappropriate words are not allowed.");
      return;
    }

    setIsSending(true);
    let payload = message;
    if (recordedAudio) {
      payload = recordedAudio;
    }

    try {
      const encrypted = await encryptMessage(profile.publicKey, payload);
      
      const payloadData: any = {
        receiverId: profile.uid,
        senderId: anonId,
        encryptedContent: encrypted,
        createdAt: serverTimestamp(),
        read: false,
        isFlagged: false,
        rating: 0,
        ...(mood ? { mood } : {})
      };
      
      if (unlocksAtData) {
        const d = new Date(unlocksAtData);
        if (d > new Date()) {
          payloadData.unlocksAt = Timestamp.fromDate(d);
        }
      }
      
      await addDoc(collection(db, "users", profile.uid, "messages"), payloadData);

      setSent(true);
      setMessage("");
      setRecordedAudio(null);
      setUnlocksAtData("");
    } catch (err: any) {
      setError("Failed to send message securely. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (status === "not_found" || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-slate-500">The link might be broken or the user doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-[100dvh] w-full pb-12 flex flex-col items-center
      ${profile.theme === 'cosmic' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white' : ''}
      ${profile.theme === 'sunset' ? 'bg-gradient-to-tr from-orange-400 via-rose-400 to-purple-500' : ''}
      ${profile.theme === 'forest' ? 'bg-gradient-to-b from-stone-800 to-emerald-900 text-white' : ''}
      ${profile.theme === 'ocean' ? 'bg-gradient-to-b from-cyan-800 to-blue-900 text-white' : ''}
      ${(!profile.theme || profile.theme === 'default') ? 'bg-slate-50 dark:bg-slate-950' : ''}
    `}>
      <div className="w-full max-w-sm px-4 relative flex flex-col mt-12 z-10">
        {reputation !== null && reputation !== 0 && (
          <div className="absolute -top-12 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-sm">
            <Award className="w-4 h-4 text-indigo-500" />
            Reputation: {reputation > 0 ? '+' : ''}{reputation}
          </div>
        )}

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div 
            key="compose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 backdrop-blur-lg ${profile.theme && profile.theme !== 'default' ? 'bg-white/90 dark:bg-slate-900/90' : ''}`}
          >
            <div className="flex flex-col items-center mb-6 text-center text-slate-900 dark:text-white">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4 text-white shadow-lg text-2xl font-bold">
                {profile.displayName?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold">{profile.displayName || `@${profile.username}`}</h1>
              {profile.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 px-2 break-words">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">Send an anonymous message</p>
                <button type="button" onClick={handleRandomPrompt} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded shadow-sm hover:scale-105 transition-transform">
                  🎲 Prompt
                </button>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {!recordedAudio && !isRecording && (
                <div className="relative">
                  <textarea
                    id="message-input"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Send me anonymous feedback... or a voice note below!"
                    className="w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[140px] resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                    maxLength={500}
                    disabled={!!recordedAudio}
                  />
                  <div className="absolute bottom-3 right-4 text-xs font-mono text-slate-400">
                    {message.length}/500
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex flex-col items-center justify-center animate-pulse">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-500 font-medium mb-4">Recording Voice Note with Masking...</p>
                  <button type="button" onClick={stopRecording} className="bg-red-500 text-white px-6 py-2 rounded-full font-bold shadow-sm hover:bg-red-600 flex items-center gap-2">
                    <Square className="w-4 h-4 fill-current" /> Stop Recording
                  </button>
                </div>
              )}

              {recordedAudio && !isRecording && (
                <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex flex-col items-center justify-center relative">
                  <audio src={recordedAudio} controls className="w-full mb-2" />
                  <p className="text-xs text-indigo-500 mb-2 font-medium">Masked Voice Note Ready</p>
                  <button type="button" onClick={() => setRecordedAudio(null)} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Discard & Write Text
                  </button>
                </div>
              )}

              {!recordedAudio && !isRecording && !message.trim() && (
                <button type="button" onClick={startRecording} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium">
                  <Mic className="w-5 h-5 text-indigo-500" />
                  Record Masked Voice Note
                </button>
              )}

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mr-1 pl-1">Mood:</span>
                {MOODS.map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setMood(mood === emoji ? '' : emoji)}
                    className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-base transition-all ${mood === emoji ? 'bg-indigo-100 dark:bg-indigo-900 ring-2 ring-indigo-500/50 scale-110' : 'bg-slate-100 dark:bg-slate-800 hover:scale-110'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Watch className="w-4 h-4 text-indigo-500" />
                  Time-Capsule Delivery (Optional)
                </label>
                <input 
                  type="datetime-local" 
                  value={unlocksAtData}
                  onChange={(e) => setUnlocksAtData(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
                {unlocksAtData && (
                   <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                     Message will be locked until {new Date(unlocksAtData).toLocaleString()}.
                   </p>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>
              )}

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pb-2">
                <Lock className="w-3 h-3" /> E2E Encrypted & 100% Anonymous
              </p>

              <button 
                type="submit"
                disabled={isSending || (!message.trim() && !recordedAudio)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
              >
                {isSending ? "Encrypting & Sending..." : "Send Message"}
                {!isSending && <Send className="w-4 h-4 ml-1" />}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 mt-6"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
            <p className="text-slate-500 mb-8 mx-6">Your anonymous, encrypted message is on its way to @{profile.username}.</p>
            
            <button 
              onClick={() => { setSent(false); setMessage(""); }}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-4"
            >
              Send another message
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-8 text-center bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">Want your own anonymous link?</p>
        <button 
          onClick={() => window.location.href = "/"}
          className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-white ring-1 ring-slate-200 dark:ring-slate-800 dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm w-full"
        >
          Get My Link
        </button>
      </div>
      </div>
    </div>
  );
}
