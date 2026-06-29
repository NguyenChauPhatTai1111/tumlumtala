import { create } from "zustand";
import type { MediaItem } from "@pages/music/types";
import {
    mediaItemToEventPayload,
    trackListeningEvent,
} from "@services/musicBackendService";

interface PlayerStore {
    currentItem: MediaItem | null;
    queue: MediaItem[];
    currentIndex: number;
    isPlaying: boolean;
    shuffle: boolean;
    repeat: "off" | "one" | "all";
    recentItems: MediaItem[];
    likedItems: MediaItem[];
    // internal tracking — not exposed to consumers
    _playStartTime: number | null;
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
    appendToQueue: (items: MediaItem[]) => void;
    replaceQueue: (items: MediaItem[], startIndex?: number) => void;
    // called by BottomPlayer when actual playback position is known
    reportProgress: (listenedSeconds: number) => void;
}

function firePlayEvent(item: MediaItem) {
    trackListeningEvent({
        media_item: mediaItemToEventPayload(item),
        event_type: "play",
        listen_duration: 0,
        track_duration: item.duration ?? 0,
        genre: item.genre,
    });
}

function fireTransitionEvent(
    item: MediaItem,
    listenedSeconds: number,
    trackDuration: number,
) {
    const ratio = trackDuration > 0 ? listenedSeconds / trackDuration : 0;
    // < 40% listened = skip, >= 40% = complete
    const eventType = ratio >= 0.4 ? "complete" : "skip";
    trackListeningEvent({
        media_item: mediaItemToEventPayload(item),
        event_type: eventType,
        listen_duration: Math.round(listenedSeconds),
        track_duration: trackDuration,
        genre: item.genre,
    });
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
    _playStartTime: null,

    hydrateLibrary: (likedItems, recentItems) => set({ likedItems, recentItems }),
    setRecentItems: (recentItems) => set({ recentItems }),
    setLikedItems: (likedItems) => set({ likedItems }),

    play: (item, queue) =>
        set((state) => {
            // fire transition event for the item we're leaving
            if (state.currentItem && state._playStartTime !== null) {
                const listened = (Date.now() - state._playStartTime) / 1000;
                fireTransitionEvent(state.currentItem, listened, state.currentItem.duration ?? 0);
            }

            const nextQueue = queue?.length ? queue : [item, ...state.queue];
            const currentIndex = Math.max(
                nextQueue.findIndex((entry) => entry.id === item.id),
                0,
            );

            firePlayEvent(item);

            return {
                currentItem: item,
                queue: nextQueue,
                currentIndex,
                isPlaying: true,
                _playStartTime: Date.now(),
            };
        }),

    pause: () => set({ isPlaying: false }),
    resume: () => set((state) => ({ isPlaying: Boolean(state.currentItem) })),

    next: () => {
        const state = get();
        if (!state.queue.length) return;

        // fire transition for current track before moving
        if (state.currentItem && state._playStartTime !== null) {
            const listened = (Date.now() - state._playStartTime) / 1000;
            fireTransitionEvent(state.currentItem, listened, state.currentItem.duration ?? 0);
        }

        const nextIndex = state.shuffle
            ? Math.floor(Math.random() * state.queue.length)
            : state.currentIndex + 1;

        if (nextIndex >= state.queue.length) {
            if (state.repeat !== "all") {
                set({ isPlaying: false, _playStartTime: null });
                return;
            }
            const first = state.queue[0];
            if (first) {
                firePlayEvent(first);
                set({ currentItem: first, currentIndex: 0, isPlaying: true, _playStartTime: Date.now() });
            }
            return;
        }

        const nextItem = state.queue[nextIndex];
        if (nextItem) {
            firePlayEvent(nextItem);
            set({ currentItem: nextItem, currentIndex: nextIndex, isPlaying: true, _playStartTime: Date.now() });
        }
    },

    previous: () => {
        const state = get();
        if (!state.queue.length) return;

        if (state.currentItem && state._playStartTime !== null) {
            const listened = (Date.now() - state._playStartTime) / 1000;
            fireTransitionEvent(state.currentItem, listened, state.currentItem.duration ?? 0);
        }

        const previousIndex =
            state.currentIndex <= 0 ? state.queue.length - 1 : state.currentIndex - 1;
        const previousItem = state.queue[previousIndex];
        if (previousItem) {
            firePlayEvent(previousItem);
            set({
                currentItem: previousItem,
                currentIndex: previousIndex,
                isPlaying: true,
                _playStartTime: Date.now(),
            });
        }
    },

    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    toggleRepeat: () =>
        set((state) => ({
            repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
        })),

    toggleLike: (item) =>
        set((state) => {
            const isLiked = state.likedItems.some((entry) => entry.id === item.id);
            trackListeningEvent({
                media_item: mediaItemToEventPayload(item),
                event_type: isLiked ? "unlike" : "like",
                listen_duration: 0,
                track_duration: item.duration ?? 0,
                genre: item.genre,
            });
            return {
                likedItems: isLiked
                    ? state.likedItems.filter((entry) => entry.id !== item.id)
                    : [item, ...state.likedItems],
            };
        }),

    clearQueue: () =>
        set({
            queue: [],
            currentItem: null,
            currentIndex: -1,
            isPlaying: false,
            _playStartTime: null,
        }),

    appendToQueue: (items) =>
        set((state) => {
            const existingIds = new Set(state.queue.map((i) => i.id));
            const newItems = items.filter((i) => !existingIds.has(i.id));
            return { queue: [...state.queue, ...newItems] };
        }),

    replaceQueue: (items, startIndex = 0) => {
        const state = get();
        if (state.currentItem && state._playStartTime !== null) {
            const listened = (Date.now() - state._playStartTime) / 1000;
            fireTransitionEvent(state.currentItem, listened, state.currentItem.duration ?? 0);
        }
        const item = items[startIndex] ?? items[0];
        if (!item) return;
        firePlayEvent(item);
        set({
            queue: items,
            currentItem: item,
            currentIndex: startIndex,
            isPlaying: true,
            _playStartTime: Date.now(),
        });
    },

    // BottomPlayer calls this periodically with actual audio currentTime
    reportProgress: (listenedSeconds) => {
        const state = get();
        if (!state.currentItem || !state.isPlaying) return;
        const duration = state.currentItem.duration ?? 0;
        if (duration > 0 && listenedSeconds >= duration - 2) {
            trackListeningEvent({
                media_item: mediaItemToEventPayload(state.currentItem),
                event_type: "complete",
                listen_duration: Math.round(listenedSeconds),
                track_duration: duration,
                genre: state.currentItem.genre,
            });
            // reset so we don't fire again for same track
            set({ _playStartTime: Date.now() });
        }
    },
}));
