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
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuthStore } from "../lib/store";
import { generateKeyPair, wrapPrivateKey, unwrapPrivateKey } from "../lib/crypto";
import { getFriendlyErrorMessage } from "../lib/errorHandler";
import { getAssetUrl } from "../lib/assets";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Sparkles, 
  LogOut, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import CustomPasswordReset from "../components/CustomPasswordReset";

export default function Home() {
  const { 
    user, 
    dbUser, 
    isDbUserLoaded, 
    privateKey, 
    setPrivateKey, 
    setSessionCreatedAt, 
    clearSession 
  } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Auth fields
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Setup fields (for new signups)
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
        // user closed popup
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
      setError("Username must be at least 3 characters.");
      return;
    }
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
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
        email: user!.email || "",
        emailLower: (user!.email || "").toLowerCase(),
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      clearSession();
      setPin("");
      setError("");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  if (user && dbUser && privateKey) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 w-full min-h-[80vh] overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!user ? (
          /* STEP 1: Not Logged In -> Sign In / Sign Up Form or Custom Password Reset */
          <motion.div 
            key={isForgotPassword ? "forgot-password" : "login"}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm flex flex-col items-center text-center px-1"
          >
            {isForgotPassword ? (
              <CustomPasswordReset
                initialEmail={email}
                onBackToSignIn={() => {
                  setIsForgotPassword(false);
                  setError("");
                  setEmailError("");
                  setPasswordError("");
                }}
                onPasswordResetSuccess={(resetEmail) => {
                  setEmail(resetEmail);
                  setIsForgotPassword(false);
                  setIsLogin(true);
                  setError("");
                  setEmailError("");
                  setPasswordError("");
                }}
              />
            ) : (
              <>
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 border-2 border-indigo-50 p-2 ring-4 ring-indigo-500/5">
                  <img 
                    src={getAssetUrl("android-chrome-192x192.png")} 
                    alt="Whisper Logo" 
                    className="w-16 h-16 object-contain rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Anonymous Q&A</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                  Receive end-to-end encrypted anonymous messages with zero traces.
                </p>

                <div className="w-full flex justify-center mb-6">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back to Welcome
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-4">
                  <div className="w-full">
                    <div className="relative w-full">
                      <Mail className={`absolute left-3.5 top-3.5 w-5 h-5 ${emailError ? 'text-red-400' : 'text-slate-400'}`} />
                      <input 
                        id="home-auth-email"
                        type="email" 
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                        placeholder="Email address"
                        className={`w-full text-base bg-slate-100 dark:bg-slate-900 border ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'} rounded-xl py-3 pl-11 pr-4 outline-none transition-colors`}
                      />
                    </div>
                    {emailError && <p className="text-red-500 text-xs text-left mt-1 pl-1">{emailError}</p>}
                  </div>

                  <div className="w-full">
                    <div className="relative w-full">
                      <Lock className={`absolute left-3.5 top-3.5 w-5 h-5 ${passwordError ? 'text-red-400' : 'text-slate-400'}`} />
                      <input 
                        id="home-auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
                        placeholder="Password"
                        className={`w-full text-base bg-slate-100 dark:bg-slate-900 border ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'} rounded-xl py-3 pl-11 pr-12 outline-none transition-colors`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
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
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button 
                    id="home-auth-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
                  </button>
                </form>

                <div className="w-full flex items-center justify-between text-sm text-slate-500 mb-4 px-1">
                  <button 
                    type="button" 
                    onClick={() => { setIsLogin(!isLogin); setError(""); setEmailError(""); setPasswordError(""); }} 
                    className="hover:text-indigo-600 font-semibold transition-colors w-full text-center py-1"
                  >
                    {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
                
                <div className="w-full flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Or</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <button 
                  id="home-google-auth-btn"
                  onClick={handleGoogleLogin}
                  type="button"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 mt-2 shadow-sm active:scale-[0.99]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 mt-4 text-xs sm:text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        ) : !isDbUserLoaded ? (
          /* STEP 2A: Logged In & Fetching User Status -> Smooth Branded Loading State */
          <motion.div 
            key="loading-profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm flex flex-col items-center justify-center p-8 bg-white/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl text-center shadow-lg"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 mb-4 animate-pulse shadow-md shadow-indigo-100 border border-indigo-50">
              <img src={getAssetUrl("android-chrome-192x192.png")} alt="Whisper" className="w-12 h-12 rounded-xl object-contain" referrerPolicy="no-referrer" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Connecting to Whisper...</h3>
            <p className="text-xs text-slate-400 mt-1">Verifying encrypted profile</p>
          </motion.div>
        ) : dbUser ? (
          /* STEP 2B: Returning User (Detected Existing Account) -> Direct PIN Unlock Screen */
          <motion.div 
            key="unlock"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm flex flex-col items-center text-center px-1"
          >
            <div className="relative mb-5">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white text-3xl font-bold">
                {dbUser?.displayName?.charAt(0).toUpperCase() || dbUser?.username?.charAt(0).toUpperCase() || "W"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-950 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow text-indigo-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
              Welcome back, @{dbUser.username}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 max-w-xs leading-relaxed">
              Enter your backup PIN to decrypt your private inbox on this device.
            </p>

            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div className="relative w-full">
                <input 
                  id="home-unlock-pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  autoFocus
                  className="w-full text-center text-base font-mono tracking-widest bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-12 outline-none focus:border-indigo-500 transition-colors shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs sm:text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                id="home-unlock-submit-btn"
                type="submit"
                disabled={isLoading || !pin.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                <Unlock className="w-4 h-4" />
                <span>{isLoading ? "Decrypting Inbox..." : "Unlock Messages"}</span>
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 w-full flex items-center justify-center">
              <button
                id="home-switch-account-btn"
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Not you? Switch account</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* STEP 2C: New User (No Profile Yet) -> Claim Username & PIN Setup */
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm px-1"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-indigo-200/50 dark:border-indigo-800/50">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
                Claim Your Whisper Link
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                Choose a unique username and a secret PIN to initialize your end-to-end encryption key pair.
              </p>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 pl-1">
                  Choose Username
                </label>
                <div className="relative w-full">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    id="home-setup-username"
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. alex"
                    className="w-full text-base bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-indigo-500 transition-colors"
                    maxLength={20}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 pl-1">
                  Create Secret PIN (4+ digits)
                </label>
                <div className="relative w-full">
                  <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    id="home-setup-pin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Enter a secure PIN"
                    className="w-full text-base bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-12 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-start gap-1.5 mt-2 text-[11px] text-slate-400 pl-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>This PIN encrypts your private key in the cloud. You will use it to unlock your messages.</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs sm:text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                id="home-setup-submit-btn"
                type="submit"
                disabled={isLoading || username.length < 3 || pin.length < 4}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 active:scale-[0.99] mt-2"
              >
                <span>{isLoading ? "Generating Encryption Keys..." : "Create Profile & Key"}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-1"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
