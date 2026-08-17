import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { useAuthStore } from "./lib/store";

import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import AdminDashboard from "./pages/AdminDashboard";
import Maintenance from "./pages/Maintenance";

function RouteManifestSync() {
  const location = useLocation();

  useEffect(() => {
    const manifestEl = document.getElementById("app-manifest-link") as HTMLLinkElement | null;
    const isAdmin = location.pathname.startsWith("/admin");

    if (manifestEl) {
      manifestEl.href = isAdmin ? "/manifest-admin.json" : "/manifest.json";
    }

    if (isAdmin) {
      document.title = "Whisper Admin Console — Management & Security";
    } else {
      document.title = "Whisper — Anonymous Encrypted Messaging";
    }
  }, [location.pathname]);

  return null;
}

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
      <RouteManifestSync />
      <Routes>
        <Route path="/admin/unknownofrun" element={<AdminDashboard />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/confess/:username" element={<PublicProfile />} />
          <Route path="/about/:username" element={<PublicProfile />} />
          <Route path="/ask/:username" element={<PublicProfile />} />
          <Route path="/opinion/:username" element={<PublicProfile />} />
          <Route path="/crush/:username" element={<PublicProfile />} />
          <Route path="/compliment/:username" element={<PublicProfile />} />
          <Route path="/roast/:username" element={<PublicProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
