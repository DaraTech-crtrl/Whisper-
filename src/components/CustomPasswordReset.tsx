import React, { useState } from "react";
import { 
  fetchSignInMethodsForEmail, 
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  KeyRound,
  Send
} from "lucide-react";
import { getFriendlyErrorMessage } from "../lib/errorHandler";

interface CustomPasswordResetProps {
  initialEmail?: string;
  onBackToSignIn: () => void;
  onPasswordResetSuccess: (email: string) => void;
}

type ResetStep = "EMAIL_INPUT" | "FIREBASE_SUCCESS";

export default function CustomPasswordReset({
  initialEmail = "",
  onBackToSignIn,
}: CustomPasswordResetProps) {
  const [step, setStep] = useState<ResetStep>("EMAIL_INPUT");
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Masked email for display (e.g. d***e@gmail.com)
  const maskedEmail = React.useMemo(() => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name.charAt(0)}*@${domain}`;
    }
    const visibleStart = name.charAt(0);
    const visibleEnd = name.charAt(name.length - 1);
    const stars = "*".repeat(Math.min(name.length - 2, 4));
    return `${visibleStart}${stars}${visibleEnd}@${domain}`;
  }, [email]);

  // STEP 1: Check Email & Send Code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError("");
    setGeneralError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Strict Validation: Check if user exists in database or Firebase Auth
      let foundUserInDb = false;

      try {
        const usersQ1 = query(collection(db, "users"), where("emailLower", "==", trimmedEmail));
        const snap1 = await getDocs(usersQ1);
        if (!snap1.empty) {
          foundUserInDb = true;
        } else {
          const usersQ2 = query(collection(db, "users"), where("email", "==", trimmedEmail));
          const snap2 = await getDocs(usersQ2);
          if (!snap2.empty) {
            foundUserInDb = true;
          }
        }
      } catch (dbQueryErr) {
        console.warn("User database query notice:", dbQueryErr);
      }

      // Check auth methods or test attempt
      if (!foundUserInDb) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
          if (methods && methods.length > 0) {
            foundUserInDb = true;
          }
        } catch (authErr: any) {
          console.warn("Auth methods check:", authErr);
        }
      }

      if (!foundUserInDb) {
        setEmailError("No account exists with this email address. Please check your spelling or sign up.");
        setIsLoading(false);
        return;
      }

      // 3. We must use Firebase's native password reset flow. A custom 6-digit OTP UI 
      // cannot securely change a password without a backend Admin SDK.
      await sendPasswordResetEmail(auth, trimmedEmail);
      setStep("FIREBASE_SUCCESS");
      
    } catch (err: any) {
      setGeneralError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center px-1">
      <AnimatePresence mode="wait">
        {/* ================= STEP 1: EMAIL INPUT ================= */}
        {step === "EMAIL_INPUT" && (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full flex flex-col items-center"
          >
            {/* Header Icon */}
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 text-white">
              <KeyRound className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
              Reset Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
              Enter your registered Gmail or email address to receive a secure password reset link.
            </p>

            <form onSubmit={handleRequestCode} className="w-full space-y-4 mb-4">
              <div className="w-full">
                <div className="relative w-full">
                  <Mail className={`absolute left-3.5 top-3.5 w-5 h-5 ${emailError ? "text-red-400" : "text-slate-400"}`} />
                  <input
                    id="reset-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                      setGeneralError("");
                    }}
                    placeholder="name@gmail.com"
                    autoFocus
                    className={`w-full text-base bg-slate-100 dark:bg-slate-900 border ${
                      emailError
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"
                    } rounded-xl py-3 pl-11 pr-4 outline-none transition-colors`}
                  />
                </div>
                {emailError && <p className="text-red-500 text-xs text-left mt-1.5 pl-1">{emailError}</p>}
              </div>

              {generalError && (
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-300 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 w-full p-3 rounded-xl text-left leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}

              <button
                id="reset-send-code-btn"
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                <span>{isLoading ? "Checking Account..." : "Send Reset Link"}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="w-full text-center mt-3">
                <button
                  id="reset-back-to-signin-btn"
                  type="button"
                  onClick={onBackToSignIn}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ================= STEP 2: FIREBASE SUCCESS ================= */}
        {step === "FIREBASE_SUCCESS" && (
          <motion.div
            key="step-firebase-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex flex-col items-center p-2 text-center"
          >
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-500/30 text-indigo-500 rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 animate-pulse">
              <Send className="w-10 h-10 ml-1" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Check Your Email
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed max-w-xs">
              We've sent a secure password reset link to <span className="font-semibold text-slate-900 dark:text-slate-200">{maskedEmail}</span>. Click the link to choose a new password.
            </p>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99]"
            >
              <span>Back to Sign In</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
