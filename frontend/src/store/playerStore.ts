import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MediaItem } from "@pages/music/types";
import {
    mediaItemToEventPayload,
    trackListeningEvent,
} from "@services/musicBackendService";

export interface PlaybackContext {
    context: "organic" | "ai_dj" | "radio" | "smart_queue" | "dynamic" | "friend_sync";
    sessionId?: string;
    searchQueries?: string[];
    startedAt?: number;
    reasons?: Record<string, string>;
}

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
    _completedItemId: string | null;
    _restoredFromStorage: boolean;
    playbackContext: PlaybackContext;
    hydrateLibrary: (likedItems: MediaItem[], recentItems: MediaItem[]) => void;
    setRecentItems: (recentItems: MediaItem[]) => void;
    setLikedItems: (likedItems: MediaItem[]) => void;
    play: (item: MediaItem, queue?: MediaItem[], context?: PlaybackContext) => void;
    pause: () => void;
    resume: () => void;
    next: () => void;
    previous: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    toggleLike: (item: MediaItem) => void;
    clearQueue: () => void;
    appendToQueue: (items: MediaItem[]) => void;
    replaceQueue: (items: MediaItem[], startIndex?: number, context?: PlaybackContext) => void;
    setPlaybackContext: (context: PlaybackContext) => void;
    // called by BottomPlayer when actual playback position is known
    reportProgress: (listenedSeconds: number) => void;
}

const eventUUID = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function firePlayEvent(
    item: MediaItem,
    context: PlaybackContext,
    previousSourceId?: string,
) {
    trackListeningEvent({
        media_item: mediaItemToEventPayload(item),
        event_uuid: eventUUID(),
        session_id: context.sessionId,
        context: context.context,
        previous_source_id: previousSourceId,
        recommendation_reason: context.reasons?.[item.sourceId],
        event_type: "play",
        listen_duration: 0,
        track_duration: item.duration ?? 0,
        genre: item.genre,
        mood: item.mood,
        energy: item.energy,
        tempo: item.bpm,
        musical_key: item.musical_key,
        is_instrumental: item.isInstrumental,
        vocal_gender: item.vocalGender,
    });
}

function fireTransitionEvent(
    item: MediaItem,
    listenedSeconds: number,
    trackDuration: number,
    context: PlaybackContext,
) {
    const ratio = trackDuration > 0 ? listenedSeconds / trackDuration : 0;
    // < 40% listened = skip, >= 40% = complete
    const eventType = ratio >= 0.4 ? "complete" : "skip";
    trackListeningEvent({
        media_item: mediaItemToEventPayload(item),
        event_uuid: eventUUID(),
        session_id: context.sessionId,
        context: context.context,
        recommendation_reason: context.reasons?.[item.sourceId],
        event_type: eventType,
        listen_duration: Math.round(listenedSeconds),
        track_duration: trackDuration,
        position_ms: Math.round(listenedSeconds * 1000),
        genre: item.genre,
        mood: item.mood,
        energy: item.energy,
        tempo: item.bpm,
        musical_key: item.musical_key,
        is_instrumental: item.isInstrumental,
        vocal_gender: item.vocalGender,
    });
}

export const usePlayerStore = create<PlayerStore>()(persist((set, get) => ({
    currentItem: null,
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    shuffle: false,
    repeat: "off",
    recentItems: [],
    likedItems: [],
    _playStartTime: null,
    _completedItemId: null,
    _restoredFromStorage: false,
    playbackContext: { context: "organic" },

    hydrateLibrary: (likedItems, recentItems) => set({ likedItems, recentItems }),
    setRecentItems: (recentItems) => set({ recentItems }),
    setLikedItems: (likedItems) => set({ likedItems }),

    play: (item, queue, requestedContext) =>
        set((state) => {
            const nextContext = requestedContext ?? { context: "organic" as const };
            // fire transition event for the item we're leaving
            if (state.currentItem && state._playStartTime !== null) {
                const listened = (Date.now() - state._playStartTime) / 1000;
                fireTransitionEvent(
                    state.currentItem,
                    listened,
                    state.currentItem.duration ?? 0,
                    state.playbackContext,
                );
            }

            const nextQueue = queue?.length ? queue : [item, ...state.queue];
            const currentIndex = Math.max(
                nextQueue.findIndex((entry) => entry.id === item.id),
                0,
            );

            firePlayEvent(item, nextContext, state.currentItem?.sourceId);

            return {
                currentItem: item,
                queue: nextQueue,
                currentIndex,
                isPlaying: true,
                _playStartTime: Date.now(),
                _completedItemId: null,
                _restoredFromStorage: false,
                playbackContext: nextContext,
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
            fireTransitionEvent(
                state.currentItem,
                listened,
                state.currentItem.duration ?? 0,
                state.playbackContext,
            );
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
                firePlayEvent(first, state.playbackContext, state.currentItem?.sourceId);
                set({ currentItem: first, currentIndex: 0, isPlaying: true, _playStartTime: Date.now(), _completedItemId: null, _restoredFromStorage: false });
            }
            return;
        }

        const nextItem = state.queue[nextIndex];
        if (nextItem) {
            firePlayEvent(nextItem, state.playbackContext, state.currentItem?.sourceId);
            set({ currentItem: nextItem, currentIndex: nextIndex, isPlaying: true, _playStartTime: Date.now(), _completedItemId: null, _restoredFromStorage: false });
        }
    },

    previous: () => {
        const state = get();
        if (!state.queue.length) return;

        if (state.currentItem && state._playStartTime !== null) {
            const listened = (Date.now() - state._playStartTime) / 1000;
            fireTransitionEvent(
                state.currentItem,
                listened,
                state.currentItem.duration ?? 0,
                state.playbackContext,
            );
        }

        const previousIndex =
            state.currentIndex <= 0 ? state.queue.length - 1 : state.currentIndex - 1;
        const previousItem = state.queue[previousIndex];
        if (previousItem) {
            firePlayEvent(previousItem, state.playbackContext, state.currentItem?.sourceId);
            set({
                currentItem: previousItem,
                currentIndex: previousIndex,
                isPlaying: true,
                _playStartTime: Date.now(),
                _completedItemId: null,
                _restoredFromStorage: false,
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
            _completedItemId: null,
            _restoredFromStorage: false,
            playbackContext: { context: "organic" },
        }),

    appendToQueue: (items) =>
        set((state) => {
            const existingIds = new Set(state.queue.map((i) => i.id));
            const newItems = items.filter((i) => !existingIds.has(i.id));
            return { queue: [...state.queue, ...newItems] };
        }),

    replaceQueue: (items, startIndex = 0, requestedContext) => {
        const state = get();
        const nextContext = requestedContext ?? { context: "organic" as const };
        if (state.currentItem && state._playStartTime !== null) {
            const listened = (Date.now() - state._playStartTime) / 1000;
            fireTransitionEvent(
                state.currentItem,
                listened,
                state.currentItem.duration ?? 0,
                state.playbackContext,
            );
        }
        const item = items[startIndex] ?? items[0];
        if (!item) return;
        firePlayEvent(item, nextContext, state.currentItem?.sourceId);
        set({
            queue: items,
            currentItem: item,
            currentIndex: startIndex,
            isPlaying: true,
            _playStartTime: Date.now(),
            _completedItemId: null,
            _restoredFromStorage: false,
            playbackContext: nextContext,
        });
    },

    setPlaybackContext: (playbackContext) => set({ playbackContext }),

    // BottomPlayer calls this periodically with actual audio currentTime
    reportProgress: (listenedSeconds) => {
        const state = get();
        if (!state.currentItem || !state.isPlaying) return;
        const duration = state.currentItem.duration ?? 0;
        if (
            duration > 0 &&
            listenedSeconds >= duration - 2 &&
            state._completedItemId !== state.currentItem.id
        ) {
            trackListeningEvent({
                media_item: mediaItemToEventPayload(state.currentItem),
                event_uuid: eventUUID(),
                session_id: state.playbackContext.sessionId,
                context: state.playbackContext.context,
                recommendation_reason: state.playbackContext.reasons?.[state.currentItem.sourceId],
                event_type: "complete",
                listen_duration: Math.round(listenedSeconds),
                track_duration: duration,
                position_ms: Math.round(listenedSeconds * 1000),
                genre: state.currentItem.genre,
                mood: state.currentItem.mood,
                energy: state.currentItem.energy,
                tempo: state.currentItem.bpm,
                musical_key: state.currentItem.musical_key,
                is_instrumental: state.currentItem.isInstrumental,
                vocal_gender: state.currentItem.vocalGender,
            });
            set({ _completedItemId: state.currentItem.id });
        }
    },
}), {
    name: "music-player-state-v1",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        currentItem: state.currentItem,
        queue: state.queue,
        currentIndex: state.currentIndex,
        shuffle: state.shuffle,
        repeat: state.repeat,
        // On reload, restore the player without recording a duplicate playback.
        _restoredFromStorage: Boolean(state.currentItem),
    }),
}));
