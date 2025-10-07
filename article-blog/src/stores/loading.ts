import { create } from "zustand";

interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  setLoading: (loading: boolean, text?: string) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  loadingText: undefined,
  setLoading: (loading, text) => set({ isLoading: loading, loadingText: text }),
}));
