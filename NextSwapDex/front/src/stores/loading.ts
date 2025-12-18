import { create } from 'zustand';

interface LoadingState {
  loading: boolean;
  text?: string;
  setLoading: (loading: boolean, text?: string) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  loading: false,
  setLoading: (loading, text) => set({ loading, text }),
}));