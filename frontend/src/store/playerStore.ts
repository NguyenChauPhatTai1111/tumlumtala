import { create } from "zustand";
import type { MediaItem } from "@pages/music/types";

interface PlayerStore {
	currentItem: MediaItem | null;
	queue: MediaItem[];
	currentIndex: number;
	isPlaying: boolean;
	shuffle: boolean;
	repeat: "off" | "one" | "all";
	recentItems: MediaItem[];
	likedItems: MediaItem[];
	hydrateLibrary: (likedItems: MediaItem[], recentItems: MediaItem[]) => void;
	setRecentItems: (recentItems: MediaItem[]) => void;
	setLikedItems: (likedItems: MediaItem[]) => void;
	play: (item: MediaItem, queue?: MediaItem[]) => void;
	pause: () => void;
	resume: () => void;
	next: () => void;
	previous: () => void;
	toggleShuffle: () => void;
	toggleRepeat: () => void;
	toggleLike: (item: MediaItem) => void;
	clearQueue: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
	currentItem: null,
	queue: [],
	currentIndex: -1,
	isPlaying: false,
	shuffle: false,
	repeat: "off",
	recentItems: [],
	likedItems: [],
	hydrateLibrary: (likedItems, recentItems) =>
		set({
			likedItems,
			recentItems,
		}),
	setRecentItems: (recentItems) => set({ recentItems }),
	setLikedItems: (likedItems) => set({ likedItems }),
	play: (item, queue) =>
		set((state) => {
			const nextQueue = queue?.length ? queue : [item, ...state.queue];
			const currentIndex = Math.max(
				nextQueue.findIndex((entry) => entry.id === item.id),
				0,
			);
			return {
				currentItem: item,
				queue: nextQueue,
				currentIndex,
				isPlaying: true,
			};
		}),
	pause: () => set({ isPlaying: false }),
	resume: () => set((state) => ({ isPlaying: Boolean(state.currentItem) })),
	next: () => {
		const state = get();
		if (!state.queue.length) return;
		const nextIndex = state.shuffle
			? Math.floor(Math.random() * state.queue.length)
			: state.currentIndex + 1;
		if (nextIndex >= state.queue.length) {
			if (state.repeat !== "all") {
				set({ isPlaying: false });
				return;
			}
			const first = state.queue[0];
			if (first) set({ currentItem: first, currentIndex: 0, isPlaying: true });
			return;
		}
		const nextItem = state.queue[nextIndex];
		if (nextItem) {
			set((_current) => ({
				currentItem: nextItem,
				currentIndex: nextIndex,
				isPlaying: true,
			}));
		}
	},
	previous: () => {
		const state = get();
		if (!state.queue.length) return;
		const previousIndex =
			state.currentIndex <= 0 ? state.queue.length - 1 : state.currentIndex - 1;
		const previousItem = state.queue[previousIndex];
		if (previousItem) {
			set((_current) => ({
				currentItem: previousItem,
				currentIndex: previousIndex,
				isPlaying: true,
			}));
		}
	},
	toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
	toggleRepeat: () =>
		set((state) => ({
			repeat:
				state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
		})),
	toggleLike: (item) =>
		set((state) => ({
			likedItems: state.likedItems.some((entry) => entry.id === item.id)
				? state.likedItems.filter((entry) => entry.id !== item.id)
				: [item, ...state.likedItems],
		})),
	clearQueue: () =>
		set({
			queue: [],
			currentItem: null,
			currentIndex: -1,
			isPlaying: false,
		}),
}));
