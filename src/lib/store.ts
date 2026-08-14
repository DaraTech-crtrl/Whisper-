import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthReady: boolean;
  user: any | null;
  dbUser: any | null;
  privateKey: string | null;
  setAuthReady: (ready: boolean) => void;
  setUser: (user: any) => void;
  setDbUser: (dbUser: any) => void;
  setPrivateKey: (key: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthReady: false,
      user: null,
      dbUser: null,
      privateKey: null,
      setAuthReady: (ready) => set({ isAuthReady: ready }),
      setUser: (user) => set({ user }),
      setDbUser: (dbUser) => set({ dbUser }),
      setPrivateKey: (privateKey) => set({ privateKey }),
      clear: () => set({ user: null, dbUser: null, privateKey: null }),
    }),
    {
      name: 'ngl-auth-storage',
      partialize: (state) => ({ privateKey: state.privateKey }), // Only persist privateKey so user doesn't have to re-enter PIN on refresh
    }
  )
);
