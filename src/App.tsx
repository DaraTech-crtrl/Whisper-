import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { useAuthStore } from "./lib/store";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";

export default function App() {
  const { setAuthReady, setUser, setDbUser, setPrivateKey } = useAuthStore();

  useEffect(() => {
    let unsubDb: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);

      if (unsubDb) {
        unsubDb();
        unsubDb = null;
      }
      
      if (user) {
        unsubDb = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setDbUser(snap.data());
          } else {
            setDbUser(null);
          }
          setAuthReady(true);
        }, (error) => {
          console.error("Dashboard error: ", error);
          setAuthReady(true);
        });
      } else {
        setDbUser(null);
        setPrivateKey(null);
        setAuthReady(true);
      }
    });

    return () => {
      if (unsubDb) unsubDb();
      unsubAuth();
    };
  }, []);

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
