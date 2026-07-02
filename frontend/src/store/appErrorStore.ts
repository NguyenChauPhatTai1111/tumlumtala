import { create } from "zustand";

// Tracks whether a full-screen error page (ErrorBoundary / RouteErrorPage) is
// showing, so persistent overlays (bottom player, mini chat) can hide themselves.
interface AppErrorStore {
	hasBlockingError: boolean;
	setBlockingError: (value: boolean) => void;
}

export const useAppErrorStore = create<AppErrorStore>((set) => ({
	hasBlockingError: false,
	setBlockingError: (value) => set({ hasBlockingError: value }),
}));
