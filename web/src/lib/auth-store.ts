import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  apiKey: string | null;
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey }),
      clearApiKey: () => set({ apiKey: null }),
    }),
    {
      name: 'ayoitson-auth',
      partialize: (state) => ({ apiKey: state.apiKey }),
    }
  )
);
