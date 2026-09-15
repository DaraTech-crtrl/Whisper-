import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, KeyRound, ArrowRight, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { wrapPrivateKey } from '../lib/crypto';
import PinInput from './PinInput';

interface PinManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PinManagementModal({ isOpen, onClose }: PinManagementModalProps) {
  const { user, dbUser, privateKey } = useAuthStore();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const hasPin = dbUser?.hasPin === true;

  const handleClose = () => {
    setPin('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent, isDisabling: boolean = false, directPin?: string) => {
    if (e) e.preventDefault();
    if (!user?.uid || !privateKey) return;
    
    setError('');
    setSuccess('');
    
    const pinToUse = directPin || pin;
    if (!isDisabling && pinToUse.length < 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const encryptionPin = isDisabling ? "default-no-pin" : pinToUse;
      const encryptedPrivKey = wrapPrivateKey(privateKey, encryptionPin);

      await updateDoc(doc(db, "users", user.uid), {
        encryptedPrivateKey: encryptedPrivKey,
        hasPin: !isDisabling,
        updatedAt: serverTimestamp(),
      });

      setSuccess(isDisabling ? 'PIN security has been disabled.' : 'PIN has been successfully updated.');
      
      // Close automatically after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Encryption PIN
              </h2>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 text-center">
            {success ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {success}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  {hasPin 
                    ? "Update your existing 4-digit PIN to secure your inbox, or disable it."
                    : "Set up a 4-digit PIN to require a password when unlocking your inbox on new devices."}
                </p>

                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div className="w-full flex justify-center py-2">
                    <PinInput 
                      length={4} 
                      value={pin} 
                      onChange={setPin} 
                      isPassword={true} 
                      disabled={isSubmitting} 
                      onComplete={(val) => {
                        handleSubmit(undefined, false, val);
                      }}
                    />
                  </div>
                  
                  {error && (
                    <div className="flex items-start gap-2 text-[11px] sm:text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl text-left border border-rose-100 dark:border-rose-900/50">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || pin.length < 4}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {hasPin ? "Update PIN" : "Enable PIN"}
                    </button>
                    
                    {hasPin && (
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        Remove PIN
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
