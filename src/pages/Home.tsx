import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { generateKeyPair, wrapPrivateKey, unwrapPrivateKey } from "../lib/crypto";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Unlock, KeyRound, User, MessageSquare, Mail, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function Home() {
  const { user, dbUser, privateKey, setPrivateKey, setSessionCreatedAt } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Auth fields
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Setup fields
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  // UI fields
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    document.title = "Whisper — Anonymous Encrypted Messaging";
    getRedirectResult(auth)
      .catch((err) => {
        if (err?.code !== "auth/credential-already-in-use") {
          console.warn("Redirect auth info:", err);
        }
      });
  }, []);

  const getPasswordStrength = () => {
    let score = 0;
    if (!password) return { score: 0, text: "", color: "bg-slate-200 dark:bg-slate-800", textColor: "text-slate-500" };
    if (password.length >= 8) score += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score += 1;
    if (password.match(/\d/)) score += 1;
    if (password.match(/[^a-zA-Z\d]/)) score += 1;
    
    if (score <= 1) return { score: 1, text: "Weak", color: "bg-red-500", textColor: "text-red-500" };
    if (score === 2) return { score: 2, text: "Fair", color: "bg-amber-500", textColor: "text-amber-500" };
    if (score === 3) return { score: 3, text: "Good", color: "bg-indigo-500", textColor: "text-indigo-500" };
    return { score: 4, text: "Strong", color: "bg-green-500", textColor: "text-green-500" };
  };
  const strength = getPasswordStrength();

  const validateForm = () => {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!isForgotPassword) {
      if (!isLogin) {
        if (!password) {
          setPasswordError("Password is required.");
          valid = false;
        } else if (password.length < 8) {
          setPasswordError("Password must be at least 8 characters long.");
          valid = false;
        }
      } else {
        if (!password) {
          setPasswordError("Password is required.");
          valid = false;
        }
      }
    }
    
    return valid;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError("");
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setSessionCreatedAt(Date.now());
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setSessionCreatedAt(Date.now());
    } catch (err: any) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          setError("Google popup was blocked. Please allow popups or use Email & Password below.");
        }
      } else if (err.code === "auth/popup-closed-by-user") {
        // user closed the popup intentionally
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (pin.length < 4) {
      setError("PIN must be at least 4 chars");
      return;
    }

    setIsLoading(true);
    try {
      // Check if username exists
      const q = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError("Username is already taken. Please choose another.");
        setIsLoading(false);
        return;
      }

      const keys = await generateKeyPair();
      const encryptedPrivKey = wrapPrivateKey(keys.privateKey, pin);

      await setDoc(doc(db, "users", user!.uid), {
        uid: user!.uid,
        username: username,
        displayName: username,
        publicKey: keys.publicKey,
        encryptedPrivateKey: encryptedPrivKey,
        salt: "v1",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSessionCreatedAt(Date.now());
      setPrivateKey(keys.privateKey);
      navigate("/dashboard");

    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser) return;
    setError("");
    setIsLoading(true);

    try {
      const unwrapped = unwrapPrivateKey(dbUser.encryptedPrivateKey, pin);
      if (unwrapped) {
        setSessionCreatedAt(Date.now());
        setPrivateKey(unwrapped);
        navigate("/dashboard");
      } else {
        setError("Incorrect PIN. Please try again.");
      }
    } catch (err) {
      setError("Incorrect PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (user && dbUser && privateKey) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full min-h-[80vh]">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Anonymous Q&A</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Receive end-to-end encrypted anonymous messages from your friends.
            </p>

            {isForgotPassword ? (
              <form onSubmit={handlePasswordReset} className="w-full space-y-4 mb-4">
                <div className="relative">
                  <Mail className={`absolute left-3 top-3 w-5 h-5 ${emailError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full bg-slate-100 dark:bg-slate-900 border ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'} rounded-xl py-3 pl-10 pr-4 outline-none transition-colors`}
                  />
                  {emailError && <p className="text-red-500 text-xs text-left mt-1">{emailError}</p>}
                </div>
                {resetEmailSent && (
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                    Password reset email sent! Check your inbox.
                  </p>
                )}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Reset Password"}
                </button>
                <div className="w-full text-center mt-2">
                  <button type="button" onClick={() => { setIsForgotPassword(false); setResetEmailSent(false); setError(""); setEmailError(""); setPasswordError(""); }} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-4">
                <div className="relative">
                  <Mail className={`absolute left-3 top-3 w-5 h-5 ${emailError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder="Email"
                    className={`w-full bg-slate-100 dark:bg-slate-900 border ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'} rounded-xl py-3 pl-10 pr-4 outline-none transition-colors`}
                  />
                  {emailError && <p className="text-red-500 text-xs text-left mt-1 pl-1">{emailError}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-3 w-5 h-5 ${passwordError ? 'text-red-400' : 'text-slate-400'}`} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
                      placeholder="Password"
                      className={`w-full bg-slate-100 dark:bg-slate-900 border ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'} rounded-xl py-3 pl-10 pr-12 outline-none transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-500 text-xs text-left mt-1 pl-1">{passwordError}</p>}
                </div>

                {!isLogin && password.length > 0 && (
                  <div className="w-full space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-transparent'} w-1/4`} />
                      <div className={`h-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-transparent'} w-1/4`} />
                      <div className={`h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-transparent'} w-1/4`} />
                      <div className={`h-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-transparent'} w-1/4`} />
                    </div>
                    <p className={`text-xs text-right font-medium transition-colors ${strength.textColor}`}>
                      {strength.text}
                    </p>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded bg-slate-100 border-slate-300 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-800"
                      />
                      <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                        Keep me signed in (30 days)
                      </label>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(""); setEmailError(""); setPasswordError(""); }} 
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
                </button>
              </form>
            )}

            {!isForgotPassword && (
              <>
                <div className="w-full flex items-center justify-between text-sm text-slate-500 mb-4 px-1">
                  <button type="button" onClick={() => { setIsLogin(!isLogin); setError(""); setEmailError(""); setPasswordError(""); }} className="hover:text-indigo-600 font-medium transition-colors w-full text-center">
                    {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
                
                <div className="w-full flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Or</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  type="button"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-sm"
                >
                  Continue with Google
                </button>
              </>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 mt-4 text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        ) : !dbUser ? (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Claim your link</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Setup your profile and E2EE backup PIN.
              </p>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 pl-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors"
                    maxLength={20}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 pl-1">Backup PIN (4+ digits)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Enter a secure PIN"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-12 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  This symmetric key encrypts your private key in the cloud. Do not forget it!
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 mt-4"
              >
                {isLoading ? "Generating Keys..." : "Create Profile"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="unlock"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-slate-600 dark:text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Unlock Inbox</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-center">
              Please enter your backup PIN to decrypt your private key locally.
            </p>

            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full text-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-12 outline-none focus:border-indigo-500 transition-colors tracking-widest text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error && (
                <div className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                <Unlock className="w-5 h-5" />
                {isLoading ? "Unlocking..." : "Unlock Messages"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
