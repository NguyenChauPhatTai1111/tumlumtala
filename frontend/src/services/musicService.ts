import type { AxiosResponse } from "axios";
import axios from "axios";
import { apiClient } from "@api/client";
import type {
    AudiusPlaylist,
    AudiusTrack,
    AudiusUser,
    MediaItem,
    TrendingGenre,
    TrendingTimeFilter,
    YouTubeVideo,
} from "@pages/music/types";

const AUDIUS_API = "https://discoveryprovider.audius.co/v1";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

interface AudiusResponse<T> {
    data: T;
}

interface YouTubeSearchItem {
    id: { videoId?: string };
    snippet: {
        title: string;
        channelTitle: string;
        publishedAt?: string;
        thumbnails: {
            medium?: { url: string };
            high?: { url: string };
            default?: { url: string };
        };
    };
}

interface YouTubeSearchResponse {
    items: YouTubeSearchItem[];
    nextPageToken?: string;
}

interface YouTubeVideoStatsResponse {
    items: Array<{
        id: string;
        contentDetails?: { duration?: string };
        statistics?: { viewCount?: string };
    }>;
}

const isRateLimited = (error: unknown) =>
    axios.isAxiosError(error) && error.response?.status === 429;

const isUnavailable = (error: unknown) =>
    axios.isAxiosError(error) && (error.response?.status === 429 || error.response?.status === 503);

const getArtwork = (artwork?: AudiusTrack["artwork"] | AudiusPlaylist["artwork"]) =>
    artwork?.["480x480"] ??
    artwork?.["150x150"] ??
    artwork?.["1000x1000"] ??
    "/assets/logo/logo.png";

const parseYouTubeDuration = (value?: string) => {
    if (!value) return undefined;
    const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!match) return undefined;
    const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
    return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getAudiusStreamUrl = (trackId: string) => `${AUDIUS_API}/tracks/${trackId}/stream`;

export const getAudiusProfileImage = (user: AudiusUser) =>
    user.profile_picture?.["480x480"] ??
    user.profile_picture?.["150x150"] ??
    user.profile_picture?.["1000x1000"] ??
    "/assets/logo/logo.png";

export const getAudiusCoverPhoto = (user: AudiusUser) =>
    user.cover_photo?.["2000x"] ?? user.cover_photo?.["640x"] ?? null;

export const getPlaylistArtwork = (playlist: AudiusPlaylist) => getArtwork(playlist.artwork);

export const toAudioMediaItem = (track: AudiusTrack): MediaItem => ({
    id: `audio:${track.provider === "spotify" ? "spotify:" : ""}${track.id}`,
    sourceId: `${track.provider === "spotify" ? "spotify:" : ""}${track.id}`,
    title: track.title,
    artist: track.user.name || track.user.handle,
    artistId: track.user.id,
    artistHandle: track.user.handle,
    type: "audio",
    thumbnail: getArtwork(track.artwork),
    duration: track.duration,
    streamUrl: track.provider === "spotify" ? undefined : getAudiusStreamUrl(track.id),
    publishedAt: track.created_at,
    viewCount: track.play_count,
    genre: track.genre,
    mood: track.mood,
    bpm: track.bpm,
    energy: track.bpm ? Math.min(Math.max((track.bpm - 60) / 100, 0.1), 0.95) : undefined,
    musical_key: track.musical_key,
    tags: track.tags,
    likeCount: track.favorite_count,
    repostCount: track.repost_count,
    album: track.album_backlink
        ? {
              id: String(track.album_backlink.playlist_id),
              name: track.album_backlink.playlist_name,
              permalink: track.album_backlink.permalink,
          }
        : undefined,
    playlistIds: track.playlists_containing_track?.map(String),
    provider: track.provider ?? "audius",
    externalUrl: track.external_url,
});

export const toVideoMediaItem = (video: YouTubeVideo): MediaItem => ({
    id: `video:${video.id}`,
    sourceId: video.id,
    title: video.title,
    artist: video.channelTitle,
    type: "video",
    thumbnail: video.thumbnail,
    duration: video.duration,
    publishedAt: video.publishedAt,
    videoId: video.id,
    viewCount: video.viewCount,
});

// ─── Tracks ───────────────────────────────────────────────────────────────────

export const getTrendingTracks = async (
    options: {
        genre?: TrendingGenre;
        time?: TrendingTimeFilter;
    } = {},
): Promise<AudiusTrack[]> => {
    try {
        const params: Record<string, string | number> = { limit: 50 };
        if (options.genre && options.genre !== "All") params.genre = options.genre;
        if (options.time) params.time = options.time;
        const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
            `${AUDIUS_API}/tracks/trending`,
            { params },
        );
        return [...res.data.data].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    } catch (error) {
        if (isUnavailable(error)) return [];
        throw error;
    }
};

export const getUndergroundTrendingTracks = async (): Promise<AudiusTrack[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
            `${AUDIUS_API}/tracks/trending/underground`,
            { params: { limit: 50 } },
        );
        return res.data.data;
    } catch (error) {
        if (isUnavailable(error)) return [];
        throw error;
    }
};

export const getTrack = async (trackId: string): Promise<AudiusTrack | null> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusTrack>>(`${AUDIUS_API}/tracks/${trackId}`);
        return res.data.data;
    } catch {
        return null;
    }
};

export const searchTracks = async (
    query: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusTrack[]> => {
    if (!query.trim()) return [];
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    try {
        const res = await axios.get<AudiusResponse<AudiusTrack[]>>(`${AUDIUS_API}/tracks/search`, {
            params: { query, limit, offset },
        });
        return [...res.data.data].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    } catch (error) {
        if (isRateLimited(error)) return [];
        throw error;
    }
};

export const searchPreferredTracks = async (
    query: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusTrack[]> => {
    if (!query.trim()) return [];
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 10);
    const offset = Math.max(options.offset ?? 0, 0);
    try {
        const response = await apiClient.get<{ data: AudiusTrack[] }>("/music/search/tracks", {
            params: { q: query, limit, offset },
        });
        if (response.data.data.length > 0) return response.data.data;
    } catch {
        // Spotify is optional. Audius remains the playable fallback.
    }
    return searchTracks(query, { limit, offset });
};

// ─── Users / Artists ──────────────────────────────────────────────────────────

export const getTrendingArtists = async (): Promise<AudiusUser[]> => {
    try {
        // No dedicated trending-artists endpoint — deduplicate users from trending tracks
        const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
            `${AUDIUS_API}/tracks/trending`,
            { params: { limit: 50 } },
        );
        const seen = new Set<string>();
        const artists: AudiusUser[] = [];
        for (const track of res.data.data) {
            if (!seen.has(track.user.id)) {
                seen.add(track.user.id);
                artists.push(track.user);
            }
            if (artists.length >= 16) break;
        }
        return artists;
    } catch (error) {
        if (isUnavailable(error)) return [];
        throw error;
    }
};

export const getUser = async (userId: string): Promise<AudiusUser | null> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusUser>>(`${AUDIUS_API}/users/${userId}`);
        return res.data.data;
    } catch {
        return null;
    }
};

export const searchArtists = async (query: string): Promise<AudiusUser[]> => {
    if (!query.trim()) return [];
    try {
        const res = await axios.get<AudiusResponse<AudiusUser[]>>(`${AUDIUS_API}/users/search`, {
            params: { query, limit: 12 },
        });
        return res.data.data;
    } catch (error) {
        if (isRateLimited(error)) return [];
        throw error;
    }
};

export const getArtistTracks = async (
    userId: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusTrack[]> => {
    const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
        `${AUDIUS_API}/users/${userId}/tracks`,
        { params: { limit: options.limit ?? 20, offset: options.offset ?? 0 } },
    );
    return [...res.data.data].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
};

export const getArtistAlbums = async (userId: string): Promise<AudiusPlaylist[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/users/${userId}/albums`,
            { params: { limit: 10 } },
        );
        return res.data.data;
    } catch {
        return [];
    }
};

export const getArtistPlaylists = async (userId: string): Promise<AudiusPlaylist[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/users/${userId}/playlists`,
            { params: { limit: 10 } },
        );
        return res.data.data;
    } catch {
        return [];
    }
};

export const getArtistFollowers = async (
    userId: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusUser[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusUser[]>>(
            `${AUDIUS_API}/users/${userId}/followers`,
            { params: { limit: options.limit ?? 20, offset: options.offset ?? 0 } },
        );
        return res.data.data;
    } catch {
        return [];
    }
};

export const getArtistFollowing = async (
    userId: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusUser[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusUser[]>>(
            `${AUDIUS_API}/users/${userId}/following`,
            { params: { limit: options.limit ?? 20, offset: options.offset ?? 0 } },
        );
        return res.data.data;
    } catch {
        return [];
    }
};

// ─── Playlists & Albums ───────────────────────────────────────────────────────

export const getTrendingPlaylists = async (): Promise<AudiusPlaylist[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/playlists/trending`,
            { params: { limit: 16 } },
        );
        return res.data.data;
    } catch (error) {
        if (isUnavailable(error)) return [];
        throw error;
    }
};

export const getTrendingAlbums = async (): Promise<AudiusPlaylist[]> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/playlists/trending`,
            { params: { limit: 16, type: "album" } },
        );
        return res.data.data;
    } catch (error) {
        if (isUnavailable(error)) return [];
        throw error;
    }
};

export const searchPlaylists = async (query: string): Promise<AudiusPlaylist[]> => {
    if (!query.trim()) return [];
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/playlists/search`,
            { params: { query, limit: 12 } },
        );
        return res.data.data;
    } catch (error) {
        if (isRateLimited(error)) return [];
        throw error;
    }
};

export const getPlaylist = async (playlistId: string): Promise<AudiusPlaylist | null> => {
    try {
        const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
            `${AUDIUS_API}/playlists/${playlistId}`,
        );
        return Array.isArray(res.data.data) ? (res.data.data[0] ?? null) : res.data.data;
    } catch {
        return null;
    }
};

export const getPlaylistTracks = async (
    playlistId: string,
    options: { limit?: number; offset?: number } = {},
): Promise<AudiusTrack[]> => {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    try {
        const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
            `${AUDIUS_API}/playlists/${playlistId}/tracks`,
            { params: { limit, offset } },
        );
        return [...res.data.data].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
            if (isRateLimited(error)) return [];
            throw error;
        }
        const detail = await axios.get<AudiusResponse<AudiusPlaylist & { tracks?: AudiusTrack[] }>>(
            `${AUDIUS_API}/playlists/${playlistId}`,
        );
        const raw = Array.isArray(detail.data.data)
            ? (detail.data.data[0] as AudiusPlaylist & { tracks?: AudiusTrack[] })
            : (detail.data.data as AudiusPlaylist & { tracks?: AudiusTrack[] });
        return [...(raw.tracks ?? [])]
            .sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))
            .slice(offset, offset + limit);
    }
};

// ─── YouTube ──────────────────────────────────────────────────────────────────

export const searchYouTubeVideos = async (
    query: string,
    options: { maxResults?: number; pageToken?: string } = {},
): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | undefined }> => {
    const key = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!query.trim() || !key) return { videos: [], nextPageToken: undefined };

    let res: AxiosResponse<YouTubeSearchResponse>;
    try {
        res = await axios.get<YouTubeSearchResponse>(`${YOUTUBE_API}/search`, {
            params: {
                key,
                part: "snippet",
                q: query,
                type: "video",
                maxResults: options.maxResults ?? 25,
                ...(options.pageToken ? { pageToken: options.pageToken } : {}),
            },
        });
    } catch (error) {
        if (isUnavailable(error)) return { videos: [], nextPageToken: undefined };
        throw error;
    }

    const videos = res.data.items
        .filter((item) => item.id.videoId)
        .map<YouTubeVideo>((item) => ({
            id: item.id.videoId ?? "",
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail:
                item.snippet.thumbnails.high?.url ??
                item.snippet.thumbnails.medium?.url ??
                item.snippet.thumbnails.default?.url ??
                "/assets/logo/logo.png",
            publishedAt: item.snippet.publishedAt,
        }));

    const nextPageToken = res.data.nextPageToken;
    if (!videos.length) return { videos, nextPageToken };

    let statsRes: YouTubeVideoStatsResponse = { items: [] };
    try {
        const response = await axios.get<YouTubeVideoStatsResponse>(`${YOUTUBE_API}/videos`, {
            params: {
                key,
                part: "statistics,contentDetails",
                id: videos.map((v) => v.id).join(","),
            },
        });
        statsRes = response.data;
    } catch (error) {
        if (!isUnavailable(error)) throw error;
    }

    const viewsById = new Map(
        statsRes.items.map((item) => [
            item.id,
            Number.parseInt(item.statistics?.viewCount ?? "0", 10),
        ]),
    );
    const durationsById = new Map(
        statsRes.items.map((item) => [
            item.id,
            parseYouTubeDuration(item.contentDetails?.duration),
        ]),
    );

    return {
        videos: videos
            .map((v) => ({
                ...v,
                duration: durationsById.get(v.id),
                viewCount: viewsById.get(v.id) ?? 0,
            }))
            .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)),
        nextPageToken,
    };
};

export const resolveSpotifyTrackPlayback = async (item: MediaItem): Promise<MediaItem | null> => {
    if (item.provider !== "spotify") return item;

    const normalize = (value: string) =>
        value
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
            .trim();
    const title = normalize(item.title);
    const artist = normalize(item.artist);
    const result = await searchYouTubeVideos(
        `${item.artist} - ${item.title} official audio`,
        { maxResults: 8 },
    );
    const ranked = result.videos
        .map((video) => {
            const candidate = normalize(`${video.title} ${video.channelTitle}`);
            let score = 0;
            if (candidate.includes(title)) score += 8;
            if (candidate.includes(artist)) score += 6;
            if (/\bofficial\b|\baudio\b|\bmv\b/.test(candidate)) score += 2;
            if (/\bcover\b|\bkaraoke\b|\breaction\b|\bremix\b/.test(candidate)) score -= 5;
            return { video, score };
        })
        .sort((a, b) => b.score - a.score || (b.video.viewCount ?? 0) - (a.video.viewCount ?? 0));

    const best = ranked[0];
    if (!best || best.score < 8) return null;
    return {
        ...item,
        videoId: best.video.id,
        streamUrl: undefined,
        duration: item.duration ?? best.video.duration,
    };
};

// ─── Lyrics ───────────────────────────────────────────────────────────────────

export interface LyricsLine {
    text: string;
    time?: number; // seconds, from syncedLyrics timestamp
}

export interface TrackLyrics {
    lines: LyricsLine[];
    synced: boolean;
}

interface LrcLibResponse {
    id: number;
    plainLyrics: string | null;
    syncedLyrics: string | null;
    instrumental: boolean;
}

// Strip parenthesized/bracketed suffixes e.g. "(Olazaran Remix)" or "[Live]",
// then strip trailing punctuation like "!!!" or "..."
const stripSuffixes = (s: string) =>
    s
        .replace(/\s*(?:\(.*?\)|\[.*?])/g, "")
        .replace(/[^\w\s]+$/u, "")
        .trim();

const decodeYouTubeText = (value: string) => {
    if (typeof document === "undefined") return value;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
};

const cleanYouTubeArtist = (value: string) =>
    decodeYouTubeText(value)
        .replace(/\s*-\s*Topic\s*$/i, "")
        .replace(/\s+VEVO\s*$/i, "")
        .replace(/\s+(?:Official|Music)\s*$/i, "")
        .trim();

const cleanYouTubeTitle = (value: string) =>
    stripSuffixes(
        decodeYouTubeText(value)
            .replace(/[–—]/g, " - ")
            .replace(
                /\s*(?:\||•)\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|visualizer|mv).*$/i,
                "",
            )
            .replace(
                /\s+(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|mv)\s*$/i,
                "",
            )
            .replace(/\s+#\S+(?:\s+#\S+)*\s*$/u, ""),
    );

const lyricsCandidates = (artist: string, title: string): Array<[string, string]> => {
    const cleanedArtist = cleanYouTubeArtist(artist);
    const cleanedTitle = cleanYouTubeTitle(title);
    const dashParts = cleanedTitle
        .split(/\s+-\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
    const candidates: Array<[string, string]> = [];

    // YouTube commonly stores "Artist - Track" entirely in the video title.
    if (dashParts.length >= 2) {
        candidates.push(
            [dashParts[0], cleanYouTubeTitle(dashParts.slice(1).join(" - "))],
            [cleanedArtist, cleanYouTubeTitle(dashParts.slice(1).join(" - "))],
        );
    }

    candidates.push(
        [cleanedArtist, cleanedTitle],
        [cleanedArtist, stripSuffixes(title)],
        [artist, cleanedTitle],
    );

    const seen = new Set<string>();
    return candidates.filter(([candidateArtist, candidateTitle]) => {
        if (!candidateArtist || !candidateTitle) return false;
        const key = `${candidateArtist.toLocaleLowerCase()}::${candidateTitle.toLocaleLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

// Parse "[mm:ss.xx] text" lines from syncedLyrics
const parseSynced = (raw: string): LyricsLine[] =>
    raw
        .split("\n")
        .map((line) => {
            const m = line.match(/^\[(\d{2}):(\d{2}\.\d+)\]\s*(.*)/);
            if (!m) return null;
            const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
            return { text: m[3].trim(), time };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);

const parsePlain = (raw: string): LyricsLine[] =>
    raw.split("\n").map((line) => ({ text: line.trim() }));

const lrcLibGet = async (artistName: string, trackName: string): Promise<TrackLyrics | null> => {
    const res = await axios.get<LrcLibResponse>("https://lrclib.net/api/get", {
        params: { artist_name: artistName, track_name: trackName },
    });
    const data = res.data;
    if (data.instrumental) return { lines: [], synced: false };
    if (data.syncedLyrics) return { lines: parseSynced(data.syncedLyrics), synced: true };
    if (data.plainLyrics) return { lines: parsePlain(data.plainLyrics), synced: false };
    return null;
};

export const getTrackLyrics = async (
    artist: string,
    title: string,
): Promise<TrackLyrics | null> => {
    for (const [a, t] of lyricsCandidates(artist, title)) {
        try {
            const result = await lrcLibGet(a, t);
            if (result) return result;
        } catch {
            // 404 or network error — try next candidate
        }
    }
    return null;
};

// ─── Radio ────────────────────────────────────────────────────────────────────

/** Build a radio queue seeded by a single track: same artist first, then genre. */
export const getTrackRadio = async (seedTrackId: string, limit = 30): Promise<AudiusTrack[]> => {
    const seed = await getTrack(seedTrackId);
    if (!seed) return [];

    const queries = [
        ...(seed.user?.name ? [seed.user.name] : []),
        ...(seed.genre ? [seed.genre] : []),
        ...(seed.mood ? [seed.mood] : []),
    ];
    if (!queries.length) return [];

    const pages = await Promise.all(
        queries.map((q) =>
            axios
                .get<AudiusResponse<AudiusTrack[]>>(`${AUDIUS_API}/tracks/search`, {
                    params: { query: q, limit: 50 },
                })
                .then((r) => r.data.data)
                .catch(() => [] as AudiusTrack[]),
        ),
    );

    // Same artist first, then genre/mood
    const seen = new Set<string>([seed.id]);
    const sameArtist: AudiusTrack[] = [];
    const others: AudiusTrack[] = [];
    for (const page of pages) {
        for (const t of page) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            if (t.user?.id === seed.user?.id) sameArtist.push(t);
            else others.push(t);
        }
    }
    return [seed, ...sameArtist, ...others].slice(0, limit);
};

/** Build a radio queue seeded by an artist: own tracks first, then genre peers derived from top track. */
export const getArtistRadio = async (artist: AudiusUser, limit = 30): Promise<AudiusTrack[]> => {
    const ownTracks = await getArtistTracks(artist.id, { limit: 50 }).catch(
        () => [] as AudiusTrack[],
    );
    // Derive genre from most popular own track
    const topGenre = ownTracks.find((t) => t.genre)?.genre;
    const genreTracks = topGenre
        ? await axios
              .get<AudiusResponse<AudiusTrack[]>>(`${AUDIUS_API}/tracks/search`, {
                  params: { query: topGenre, limit: 50 },
              })
              .then((r) => r.data.data)
              .catch(() => [] as AudiusTrack[])
        : [];

    const ownIds = new Set(ownTracks.map((t) => t.id));
    const peers = genreTracks.filter((t) => !ownIds.has(t.id) && t.user?.id !== artist.id);
    return [...ownTracks, ...peers].slice(0, limit);
};

/** Find artists similar to a given artist via name + genre search. */
export const getSimilarArtists = async (artist: AudiusUser, limit = 12): Promise<AudiusUser[]> => {
    // Get top track genre to search similar artists
    const topTrack = await getArtistTracks(artist.id, { limit: 5 })
        .then((ts) => ts.find((t) => t.genre) ?? null)
        .catch(() => null);

    const queries = [...(topTrack?.genre ? [topTrack.genre] : []), artist.name].filter(Boolean);

    const pages = await Promise.all(
        queries.map((q) =>
            axios
                .get<AudiusResponse<AudiusUser[]>>(`${AUDIUS_API}/users/search`, {
                    params: { query: q, limit: 30 },
                })
                .then((r) => r.data.data)
                .catch(() => [] as AudiusUser[]),
        ),
    );

    const seen = new Set<string>([artist.id]);
    const result: AudiusUser[] = [];
    for (const page of pages) {
        for (const u of page) {
            if (seen.has(u.id)) continue;
            seen.add(u.id);
            result.push(u);
            if (result.length >= limit) break;
        }
        if (result.length >= limit) break;
    }
    return result;
};

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface RecommendedTrack extends AudiusTrack {
    score: number;
    reasons: string[];
}

function parseTags(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
}

function bpmScore(a?: number, b?: number): number {
    if (!a || !b) return 0;
    const diff = Math.abs(a - b);
    if (diff <= 5) return 5;
    if (diff <= 15) return 3;
    return 0;
}

function hasCommonTags(a: string[], b: string[]): boolean {
    if (!a.length || !b.length) return false;
    return a.some((t) => b.includes(t));
}

function spotifyMediaToRecommended(items: import("@pages/music/types").MediaItem[]): RecommendedTrack[] {
    const seen = new Set<string>();
    const result: RecommendedTrack[] = [];
    for (const item of items) {
        // sourceId = "spotify:XXX" — use raw Spotify ID as AudiusTrack.id to keep keys unique
        const rawId = item.sourceId.replace(/^spotify:/, "");
        if (seen.has(rawId)) continue;
        seen.add(rawId);
        result.push({
            id: rawId,
            provider: "spotify" as const,
            external_url: item.externalUrl,
            title: item.title,
            duration: item.duration ?? 0,
            created_at: item.publishedAt,
            genre: item.genre,
            mood: item.mood,
            tags: item.tags,
            user: {
                id: item.artistId ?? "",
                name: item.artist,
                handle: item.artistId ?? "",
            },
            artwork: { "480x480": item.thumbnail },
            score: 100,
            reasons: ["spotify_recommendation"],
        });
    }
    return result;
}

export const getRecommendations = async (
    seedTrackId: string,
    limit = 12,
): Promise<RecommendedTrack[]> => {
    // Spotify-first: if seed is a Spotify track or we can try Spotify recommendations
    const isSpotifySeed = seedTrackId.startsWith("spotify:");
    const spotifyTrackId = isSpotifySeed ? seedTrackId.replace(/^spotify:/, "") : null;

    if (spotifyTrackId) {
        try {
            const { getSpotifyRecommendations } = await import("@services/musicBackendService");
            const items = await getSpotifyRecommendations({ seedTrack: spotifyTrackId, limit });
            if (items.length > 0) return spotifyMediaToRecommended(items);
        } catch {
            // fall through to Audius
        }
        // Seed is Spotify but recommendations failed; try Audius search with title as fallback
        return [];
    }

    // Try Spotify recommendations with seed as Audius ID (search Spotify by keyword after fetching track info)
    try {
        const seed = await getTrack(seedTrackId);
        if (seed) {
            const { getSpotifyRecommendations } = await import("@services/musicBackendService");
            const seedGenre = seed.genre ?? undefined;
            const items = await getSpotifyRecommendations({ seedGenre, limit });
            if (items.length > 0) return spotifyMediaToRecommended(items);
        }
    } catch {
        // fall through to Audius
    }

    // 1. Fetch seed track detail
    const seed = await getTrack(seedTrackId);
    if (!seed) return [];

    const seedTags = parseTags(seed.tags);
    const seedAlbumId = seed.album_backlink ? String(seed.album_backlink.playlist_id) : undefined;
    const seedPlaylistIds = (seed.playlists_containing_track ?? []).map(String);

    // 2. Build search queries from metadata (run in parallel for coverage)
    const queries: string[] = [];
    if (seed.genre) queries.push(seed.genre);
    if (seed.mood) queries.push(seed.mood);
    if (seed.user?.name) queries.push(seed.user.name);
    queries.push(...seedTags.slice(0, 4));
    if (!queries.length) queries.push(seed.title);
    const sourceCollectionIds = [
        ...new Set([seedAlbumId, ...seedPlaylistIds].filter(Boolean)),
    ].slice(0, 5) as string[];

    const [searchResults, collectionResults, artistResults] = await Promise.all([
        Promise.all(
            [...new Set(queries)].map((q) =>
                axios
                    .get<AudiusResponse<AudiusTrack[]>>(`${AUDIUS_API}/tracks/search`, {
                        params: {
                            query: q,
                            limit: 50,
                            ...(seed.genre ? { genre: seed.genre } : {}),
                        },
                    })
                    .then((r) => r.data.data)
                    .catch(() => [] as AudiusTrack[]),
            ),
        ),
        Promise.all(
            sourceCollectionIds.map((playlistId) =>
                getPlaylistTracks(playlistId, { limit: 50 }).catch(() => [] as AudiusTrack[]),
            ),
        ),
        seed.user?.id
            ? getArtistTracks(seed.user.id, { limit: 50 }).catch(() => [] as AudiusTrack[])
            : Promise.resolve([] as AudiusTrack[]),
    ]);

    // 3. Deduplicate candidates
    const seen = new Set<string>([seed.id]);
    const candidates: AudiusTrack[] = [];
    for (const page of [artistResults, ...collectionResults, ...searchResults]) {
        for (const track of page) {
            if (!seen.has(track.id)) {
                seen.add(track.id);
                candidates.push(track);
            }
        }
    }

    // 4. Score each candidate
    const scored: RecommendedTrack[] = candidates.map((track) => {
        let score = 0;
        const reasons: string[] = [];
        const trackTags = parseTags(track.tags);
        const trackAlbumId = track.album_backlink
            ? String(track.album_backlink.playlist_id)
            : undefined;
        const trackPlaylistIds = (track.playlists_containing_track ?? []).map(String);
        const sourceCollectionId = sourceCollectionIds.find((_, index) =>
            collectionResults[index]?.some((item) => item.id === track.id),
        );

        if (track.genre && track.genre === seed.genre) {
            score += 40;
            reasons.push("same_genre");
        }
        if (track.mood && track.mood === seed.mood) {
            score += 25;
            reasons.push("same_mood");
        }
        if (track.user?.id === seed.user?.id) {
            score += 35;
            reasons.push("same_artist");
        }
        if (seedAlbumId && (trackAlbumId === seedAlbumId || sourceCollectionId === seedAlbumId)) {
            score += 45;
            reasons.push("same_album");
        }
        if (
            seedPlaylistIds.some(
                (playlistId) =>
                    trackPlaylistIds.includes(playlistId) || sourceCollectionId === playlistId,
            )
        ) {
            score += 35;
            reasons.push("same_playlist");
        }
        if (track.musical_key === seed.musical_key && seed.musical_key) {
            score += 8;
            reasons.push("same_key");
        }
        const bpm = bpmScore(track.bpm, seed.bpm);
        if (bpm > 0) {
            score += bpm;
            reasons.push("similar_bpm");
        }
        if (hasCommonTags(trackTags, seedTags)) {
            score += 30;
            reasons.push("common_tags");
        }

        return { ...track, score, reasons };
    });

    // 5. Sort, deduplicate artist if too dominant, return top N
    scored.sort((a, b) => b.score - a.score);

    const artistCount = new Map<string, number>();
    const result: RecommendedTrack[] = [];
    for (const track of scored) {
        const count = artistCount.get(track.user.id) ?? 0;
        if (count >= 3) continue; // max 3 tracks per artist to diversify
        artistCount.set(track.user.id, count + 1);
        result.push(track);
        if (result.length >= limit) break;
    }

    return result;
};
