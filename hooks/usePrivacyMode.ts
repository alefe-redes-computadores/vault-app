import { create } from "zustand";

interface PrivacyState {
  isPrivate: boolean;
  togglePrivacy: () => void;
}

export const usePrivacyMode = create<PrivacyState>((set) => ({
  isPrivate: false, // Começa desativado por padrão
  togglePrivacy: () => set((state) => ({ isPrivate: !state.isPrivate })),
}));
