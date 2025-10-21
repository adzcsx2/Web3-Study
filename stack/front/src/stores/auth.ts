import { User } from "@/types/user";
import { create } from "zustand";

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  logout: () => set({ 
    user: null, 
    loading: false, 
    error: null 
  }),
}));
