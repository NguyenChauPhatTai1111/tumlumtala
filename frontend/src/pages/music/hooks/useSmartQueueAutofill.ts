import { useEffect, useRef } from "react";
import { buildSmartMusicQueue, fromBackendMediaItem } from "@services/musicBackendService";
import { searchTracks, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";

export function useSmartQueueAutofill() {
    const queue = usePlayerStore((state) => state.queue);
    const currentIndex = usePlayerStore((state) => state.currentIndex);
    const playbackContext = usePlayerStore((state) => state.playbackContext);
    const appendToQueue = usePlayerStore((state) => state.appendToQueue);
    const runningRef = useRef(false);
    const lastAttemptRef = useRef(0);

    useEffect(() => {
        const isIntelligentQueue = ["ai_dj", "radio", "dynamic", "friend_sync"].includes(
            playbackContext.context,
        );
        const remaining = queue.length - currentIndex - 1;
        if (
            !isIntelligentQueue ||
            remaining > 3 ||
            runningRef.current ||
            Date.now() - lastAttemptRef.current < 15_000
        ) {
            return;
        }

        const queries = playbackContext.searchQueries?.filter(Boolean) ?? [];
        if (!queries.length) return;

        runningRef.current = true;
        lastAttemptRef.current = Date.now();
        const selectedQueries = queries.slice(0, 3);
        void Promise.all(
            selectedQueries.map((query, index) =>
                searchTracks(query, {
                    limit: 25,
                    offset: ((Math.floor(Date.now() / 60_000) + index) % 3) * 25,
                }),
            ),
        )
            .then((pages) => {
                const candidates = pages.flat().map(toAudioMediaItem);
                return buildSmartMusicQueue({
                    sessionId: playbackContext.sessionId,
                    listenedMinutes: playbackContext.startedAt
                        ? Math.floor((Date.now() - playbackContext.startedAt) / 60_000)
                        : 0,
                    currentQueue: queue,
                    candidates,
                });
            })
            .then((ranked) => appendToQueue(ranked.map((item) => fromBackendMediaItem(item.media_item))))
            .catch(() => {
                // Radio keeps the existing queue if Audius or the ranker is temporarily unavailable.
            })
            .finally(() => {
                runningRef.current = false;
            });
    }, [appendToQueue, currentIndex, playbackContext, queue]);
}
