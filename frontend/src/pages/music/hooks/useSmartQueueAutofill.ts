import { useEffect, useRef } from "react";
import {
    buildSmartMusicQueue,
    fromBackendMediaItem,
    getSpotifyAudioFeatures,
    getSpotifyRecommendations,
} from "@services/musicBackendService";
import { searchTracks, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";

async function fetchSpotifySimilarTracks(spotifyRawId: string, limit = 25) {
    const features = await getSpotifyAudioFeatures(spotifyRawId);
    if (!features) return null;

    return getSpotifyRecommendations({
        seedTrackIds: [spotifyRawId],
        limit,
        targetDanceability: features.danceability,
        targetEnergy: features.energy,
        targetValence: features.valence,
        targetAcousticness: features.acousticness,
        targetTempo: features.tempo,
    });
}

export function useSmartQueueAutofill() {
    const queue = usePlayerStore((state) => state.queue);
    const currentIndex = usePlayerStore((state) => state.currentIndex);
    const currentItem = usePlayerStore((state) => state.currentItem);
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

        const isSpotifyTrack =
            currentItem?.provider === "spotify" ||
            Boolean(currentItem?.sourceId?.startsWith("spotify:"));
        const spotifyRawId = isSpotifyTrack
            ? currentItem?.sourceId?.replace(/^spotify:/, "") ?? null
            : null;

        const queries = playbackContext.searchQueries?.filter(Boolean) ?? [];

        if (!spotifyRawId && !queries.length) return;

        runningRef.current = true;
        lastAttemptRef.current = Date.now();

        const fillPromise: Promise<ReturnType<typeof appendToQueue> | void> = spotifyRawId
            ? fetchSpotifySimilarTracks(spotifyRawId, 25)
                .then((spotifyItems) => {
                    if (spotifyItems?.length) {
                        return appendToQueue(
                            spotifyItems.filter((t) => !queue.some((q) => q.id === t.id)),
                        );
                    }
                    // fallback to text-search path if audio-features endpoint returned nothing
                    const fallbackQueries = queries.slice(0, 3);
                    if (!fallbackQueries.length) return;
                    return Promise.all(
                        fallbackQueries.map((q, i) =>
                            searchTracks(q, {
                                limit: 25,
                                offset: ((Math.floor(Date.now() / 60_000) + i) % 3) * 25,
                            }),
                        ),
                    ).then((pages) => {
                        const candidates = pages.flat().map(toAudioMediaItem);
                        return buildSmartMusicQueue({
                            sessionId: playbackContext.sessionId,
                            listenedMinutes: playbackContext.startedAt
                                ? Math.floor((Date.now() - playbackContext.startedAt) / 60_000)
                                : 0,
                            currentQueue: queue,
                            candidates,
                        }).then((ranked) =>
                            appendToQueue(ranked.map((item) => fromBackendMediaItem(item.media_item))),
                        );
                    });
                })
            : Promise.all(
                queries.slice(0, 3).map((q, i) =>
                    searchTracks(q, {
                        limit: 25,
                        offset: ((Math.floor(Date.now() / 60_000) + i) % 3) * 25,
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
                .then((ranked) =>
                    appendToQueue(ranked.map((item) => fromBackendMediaItem(item.media_item))),
                );

        void fillPromise
            .catch(() => {
                // Radio keeps the existing queue if upstream calls are temporarily unavailable.
            })
            .finally(() => {
                runningRef.current = false;
            });
    }, [appendToQueue, currentIndex, currentItem, playbackContext, queue]);
}
