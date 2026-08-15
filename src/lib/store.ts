import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthState {
  isAuthReady: boolean;
  isDbUserLoaded: boolean;
  user: any | null;
  dbUser: any | null;
  privateKey: string | null;
  sessionCreatedAt: number | null;
  setAuthReady: (ready: boolean) => void;
  setIsDbUserLoaded: (loaded: boolean) => void;
  setUser: (user: any) => void;
  setDbUser: (dbUser: any) => void;
  setPrivateKey: (key: string | null) => void;
  setSessionCreatedAt: (time: number | null) => void;
  isSessionExpired: () => boolean;
  clearSession: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthReady: false,
      isDbUserLoaded: false,
      user: null,
      dbUser: null,
      privateKey: null,
      sessionCreatedAt: null,
      setAuthReady: (ready) => set({ isAuthReady: ready }),
      setIsDbUserLoaded: (loaded) => set({ isDbUserLoaded: loaded }),
      setUser: (user) => set({ user }),
      setDbUser: (dbUser) => set({ dbUser, isDbUserLoaded: true }),
      setPrivateKey: (privateKey) => set({ privateKey }),
      setSessionCreatedAt: (sessionCreatedAt) => set({ sessionCreatedAt }),
      isSessionExpired: () => {
        const { sessionCreatedAt } = get();
        if (!sessionCreatedAt) return false;
        return Date.now() - sessionCreatedAt > SESSION_DURATION_MS;
      },
      clearSession: () => set({ user: null, dbUser: null, isDbUserLoaded: false, privateKey: null, sessionCreatedAt: null }),
      clear: () => set({ user: null, dbUser: null, isDbUserLoaded: false, privateKey: null, sessionCreatedAt: null }),
    }),
    {
      name: 'ngl-auth-storage',
      partialize: (state) => ({ 
        privateKey: state.privateKey, 
        sessionCreatedAt: state.sessionCreatedAt 
      }),
    }
  )
);
