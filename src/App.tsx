import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { useAuthStore } from "./lib/store";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";

export default function App() {
  const { 
    setAuthReady, 
    setUser, 
    setDbUser, 
    setIsDbUserLoaded,
    setPrivateKey, 
    sessionCreatedAt, 
    setSessionCreatedAt, 
    isSessionExpired, 
    clearSession 
  } = useAuthStore();

  useEffect(() => {
    let unsubDb: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Check 30-day session expiry
      if (user) {
        if (isSessionExpired()) {
          console.info("Session expired after 30 days. Signing out...");
          await auth.signOut();
          clearSession();
          setAuthReady(true);
          return;
        }

        // Initialize session timestamp if missing
        if (!sessionCreatedAt) {
          setSessionCreatedAt(Date.now());
        }

        setUser(user);
        setIsDbUserLoaded(false);

        if (unsubDb) {
          unsubDb();
          unsubDb = null;
        }

        unsubDb = onSnapshot(doc(db, "users", user.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setDbUser(data);
            
            // Retroactively backfill email for older accounts
            if (user.email && (!data.email || !data.emailLower)) {
              try {
                await updateDoc(doc(db, "users", user.uid), {
                  email: user.email,
                  emailLower: user.email.toLowerCase()
                });
                console.info("Backfilled missing email data for user profile.");
              } catch (err) {
                console.warn("Could not backfill email:", err);
              }
            }
          } else {
            setDbUser(null);
            setIsDbUserLoaded(true);
          }
          setAuthReady(true);
        }, (error) => {
          console.error("Dashboard error: ", error);
          setIsDbUserLoaded(true);
          setAuthReady(true);
        });
      } else {
        if (unsubDb) {
          unsubDb();
          unsubDb = null;
        }
        clearSession();
        setAuthReady(true);
      }
    });

    return () => {
      if (unsubDb) unsubDb();
      unsubAuth();
    };
  }, [sessionCreatedAt, isSessionExpired, setSessionCreatedAt, setUser, setDbUser, setIsDbUserLoaded, setPrivateKey, clearSession, setAuthReady]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
