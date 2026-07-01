import { apiClient } from "@api/client";
import type {
    AudiusPlaylist,
    AudiusTrack,
    AudiusUser,
    MediaItem,
    TrendingGenre,
    TrendingTimeFilter,
} from "@pages/music/types";

const PREFIX = "/music";

export interface BackendMediaItem {
    id: number;
    source_id: string;
    type: "audio" | "video";
    title: string;
    artist: string;
    thumbnail: string;
    stream_url?: string;
    video_id?: string;
    duration?: number;
    view_count?: number;
    genre?: string;
    mood?: string;
    energy?: number;
    tempo?: number;
    musical_key?: string;
    is_instrumental?: boolean;
    vocal_gender?: string;
    like_count?: number;
    repost_count?: number;
    tags?: string;
}

interface LikedTrackRow {
    id: number;
    media_item: BackendMediaItem;
    created_at: string;
}

interface RecentTrackRow {
    id: number;
    media_item: BackendMediaItem;
    played_at: string;
}

export interface MusicSearchHistoryRow {
    id: number;
    keyword: string;
    created_at: string;
    updated_at?: string;
}

export interface MusicPlaylistRow {
    id: number;
    name: string;
    cover?: string;
    description?: string;
    tracks?: Array<{
        id: number;
        position: number;
        media_item: BackendMediaItem;
    }>;
}

export type MusicLibraryItemType = "playlist" | "artist" | "album" | "radio";

export interface MusicLibraryItem {
    id: number;
    item_type: MusicLibraryItemType;
    source_id: string;
    title: string;
    subtitle?: string;
    thumbnail?: string;
    metadata?: Record<string, unknown> | string;
    created_at: string;
    updated_at?: string;
}

export type AddMusicLibraryItem = Omit<MusicLibraryItem, "id" | "created_at" | "updated_at">;

export const mediaItemToBackendPayload = (item: MediaItem) => ({
    source_id: item.sourceId,
    type: item.type,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
    stream_url: item.streamUrl,
    video_id: item.videoId,
    duration: item.duration,
    view_count: item.viewCount,
    genre: item.genre,
    mood: item.mood,
    energy: item.energy,
    tempo: item.bpm,
    musical_key: item.musical_key,
    is_instrumental: item.isInstrumental,
    vocal_gender: item.vocalGender,
    like_count: item.likeCount,
    repost_count: item.repostCount,
    tags: item.tags,
});

export const fromBackendMediaItem = (item: BackendMediaItem): MediaItem => {
    const isSpotify = item.source_id.startsWith("spotify:");
    return {
        id: `${item.type}:${item.source_id}`,
        sourceId: item.source_id,
        type: item.type,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        streamUrl: item.stream_url,
        videoId: item.video_id,
        duration: item.duration,
        viewCount: item.view_count,
        genre: item.genre,
        mood: item.mood,
        energy: item.energy,
        bpm: item.tempo,
        musical_key: item.musical_key,
        isInstrumental: item.is_instrumental,
        vocalGender: item.vocal_gender,
        likeCount: item.like_count,
        repostCount: item.repost_count,
        tags: item.tags,
        provider: isSpotify ? "spotify" : item.type === "audio" ? "audius" : undefined,
        externalUrl: isSpotify
            ? `https://open.spotify.com/track/${item.source_id.replace(/^spotify:/, "")}`
            : undefined,
    };
};

const unwrap = <T>(res: { data: T } | T): T =>
    res && typeof res === "object" && "data" in (res as object)
        ? (res as { data: T }).data
        : (res as T);

interface SpotifyTrackResponse {
    id: string;
    provider: string;
    title: string;
    duration: number;
    created_at?: string;
    user: { id: string; name: string };
    artists?: Array<{ id: string; name: string }>;
    artwork: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string };
    album?: { id: string; name: string };
    external_url: string;
}

export interface SpotifyArtistSummary {
    id: string;
    name: string;
    images: string[];
    external_url: string;
}

export interface SpotifyCategory {
    id: string;
    name: string;
    icon: string;
}

export interface SpotifyCollectionSummary {
    id: string;
    name: string;
    description?: string;
    type: "album" | "playlist";
    images: string[];
    owner: SpotifyArtist;
    total_items?: number;
    release_date?: string;
    external_url: string;
}

export interface SpotifyArtist {
    id: string;
    name: string;
}

export interface SpotifyTrackDetail {
    id: string;
    provider: string;
    title: string;
    duration: number;
    created_at?: string;
    user: SpotifyArtist;
    artists?: SpotifyArtist[];
    artwork: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string };
    album?: { id: string; name: string };
    external_url: string;
}

export interface SpotifyArtistDetail {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: number;
    images: string[];
    external_url: string;
}

export interface SpotifyAlbumSummary {
    id: string;
    name: string;
    album_type: string;
    release_date: string;
    images: string[];
    artist_name: string;
    external_url: string;
}

export interface SpotifyArtistResponse {
    artist: SpotifyArtistDetail;
    top_tracks: SpotifyTrackResponse[];
    albums: SpotifyAlbumSummary[];
    albums_total: number;
    appears_on: SpotifyAlbumSummary[];
    appears_total: number;
    playlists: SpotifyCollectionSummary[];
    related_artists: SpotifyArtistSummary[];
}

export interface SpotifyArtistDiscography {
    artist: SpotifyArtistDetail;
    albums: SpotifyAlbumSummary[];
    total: number;
}

export interface SpotifyAlbumDetail {
    id: string;
    name: string;
    album_type: string;
    release_date: string;
    total_tracks: number;
    images: string[];
    artist_id: string;
    artist_name: string;
    external_url: string;
    label?: string;
    tracks: SpotifyTrackResponse[];
}

const spotifyTrackToAudius = (track: SpotifyTrackResponse): AudiusTrack => ({
    id: track.id,
    provider: "spotify",
    external_url: track.external_url,
    title: track.title,
    duration: track.duration,
    created_at: track.created_at,
    user: {
        id: track.user.id,
        name: track.user.name,
        handle: track.user.id,
        provider: "spotify",
    },
    artists: track.artists,
    artwork: track.artwork,
    album: track.album,
});

const spotifyArtistToAudius = (artist: SpotifyArtistSummary): AudiusUser => ({
    id: artist.id,
    provider: "spotify",
    external_url: artist.external_url,
    name: artist.name,
    handle: artist.id,
    profile_picture: {
        "1000x1000": artist.images[0],
        "480x480": artist.images[1] ?? artist.images[0],
        "150x150": artist.images[2] ?? artist.images.at(-1),
    },
});

const spotifyCollectionToAudius = (
    collection: SpotifyCollectionSummary,
): AudiusPlaylist => ({
    id: collection.id,
    provider: "spotify",
    external_url: collection.external_url,
    playlist_name: collection.name,
    description: collection.description,
    is_album: collection.type === "album",
    track_count: collection.total_items,
    created_at: collection.release_date,
    user: {
        id: collection.owner.id,
        name: collection.owner.name,
        handle: collection.owner.id,
        provider: "spotify",
    },
    artwork: {
        "1000x1000": collection.images[0],
        "480x480": collection.images[1] ?? collection.images[0],
        "150x150": collection.images[2] ?? collection.images.at(-1),
    },
});

export const getSpotifyDiscoveryTracks = async (options: {
    genre?: TrendingGenre;
    time?: TrendingTimeFilter;
}): Promise<AudiusTrack[]> => {
    const params = new URLSearchParams({
        genre: options.genre ?? "All",
        time: options.time ?? "week",
        limit: "20",
    });
    const res = await apiClient.get<{ data: SpotifyTrackResponse[] }>(
        `${PREFIX}/spotify/discovery/tracks?${params.toString()}`,
    );
    return unwrap(res.data).map(spotifyTrackToAudius);
};

export const getSpotifyDiscoveryArtists = async (): Promise<AudiusUser[]> => {
    const res = await apiClient.get<{ data: SpotifyArtistSummary[] }>(
        `${PREFIX}/spotify/discovery/artists?limit=16`,
    );
    return unwrap(res.data).map(spotifyArtistToAudius);
};

export const getSpotifyDiscoveryAlbums = async (): Promise<AudiusPlaylist[]> => {
    const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
        `${PREFIX}/spotify/discovery/albums?limit=16`,
    );
    return unwrap(res.data).map(spotifyCollectionToAudius);
};

export const getSpotifyDiscoveryPlaylists = async (): Promise<AudiusPlaylist[]> => {
    const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
        `${PREFIX}/spotify/discovery/playlists?limit=16`,
    );
    return unwrap(res.data).map(spotifyCollectionToAudius);
};

export const searchSpotifyArtists = async (query: string): Promise<AudiusUser[]> => {
    if (!query.trim()) return [];
    const res = await apiClient.get<{ data: SpotifyArtistSummary[] }>(
        `${PREFIX}/search/artists`,
        { params: { q: query, limit: 10 } },
    );
    return unwrap(res.data).map(spotifyArtistToAudius);
};

export const searchSpotifyPlaylists = async (query: string): Promise<AudiusPlaylist[]> => {
    if (!query.trim()) return [];
    const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
        `${PREFIX}/search/playlists`,
        { params: { q: query, limit: 10 } },
    );
    return unwrap(res.data).map(spotifyCollectionToAudius);
};

export const getSpotifyAlbumTracks = async (
    albumId: string,
    limit = 50,
    offset = 0,
): Promise<{ tracks: SpotifyTrackResponse[]; total: number }> => {
    const res = await apiClient.get<{ data: { tracks: SpotifyTrackResponse[]; total: number; limit: number; offset: number } }>(
        `${PREFIX}/albums/${encodeURIComponent(albumId)}/tracks?limit=${limit}&offset=${offset}`,
    );
    const data = unwrap(res.data);
    return { tracks: data.tracks ?? [], total: data.total ?? 0 };
};

export const getSpotifyPlaylist = async (playlistId: string): Promise<SpotifyCollectionSummary | null> => {
    try {
        const res = await apiClient.get<{ data: SpotifyCollectionSummary }>(
            `${PREFIX}/spotify/playlists/${encodeURIComponent(playlistId)}`,
        );
        return unwrap(res.data);
    } catch {
        return null;
    }
};

export const getSpotifyPlaylistTracks = async (
    playlistId: string,
    limit = 50,
    offset = 0,
): Promise<{ tracks: SpotifyTrackDetail[]; total: number }> => {
    const res = await apiClient.get<{ data: { tracks: SpotifyTrackDetail[]; total: number; limit: number; offset: number } }>(
        `${PREFIX}/spotify/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}&offset=${offset}`,
    );
    const data = unwrap(res.data);
    return { tracks: data.tracks ?? [], total: data.total ?? 0 };
};

export const getSpotifyNewReleases = async (limit = 20): Promise<SpotifyCollectionSummary[]> => {
    try {
        const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
            `${PREFIX}/browse/new-releases?limit=${limit}`,
        );
        return unwrap(res.data) ?? [];
    } catch {
        return [];
    }
};

export const getSpotifyFeaturedPlaylists = async (limit = 20): Promise<SpotifyCollectionSummary[]> => {
    try {
        const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
            `${PREFIX}/browse/featured-playlists?limit=${limit}`,
        );
        return unwrap(res.data) ?? [];
    } catch {
        return [];
    }
};

export const getSpotifyCategories = async (limit = 20): Promise<SpotifyCategory[]> => {
    try {
        const res = await apiClient.get<{ data: SpotifyCategory[] }>(
            `${PREFIX}/browse/categories?limit=${limit}`,
        );
        return unwrap(res.data) ?? [];
    } catch {
        return [];
    }
};

export const getSpotifyCategoryPlaylists = async (
    categoryId: string,
    limit = 20,
): Promise<SpotifyCollectionSummary[]> => {
    try {
        const res = await apiClient.get<{ data: SpotifyCollectionSummary[] }>(
            `${PREFIX}/browse/categories/${encodeURIComponent(categoryId)}/playlists?limit=${limit}`,
        );
        return unwrap(res.data) ?? [];
    } catch {
        return [];
    }
};

export const getSpotifyArtistAllAlbums = async (artistId: string): Promise<SpotifyAlbumSummary[]> => {
    try {
        const res = await apiClient.get<{ data: { albums: SpotifyAlbumSummary[]; total: number } }>(
            `${PREFIX}/artists/${encodeURIComponent(artistId)}/discography`,
        );
        return unwrap(res.data).albums ?? [];
    } catch {
        return [];
    }
};

export const getSpotifyAlbum = async (albumId: string): Promise<SpotifyAlbumDetail | null> => {
    try {
        const res = await apiClient.get<{ data: SpotifyAlbumDetail }>(
            `${PREFIX}/albums/${encodeURIComponent(albumId)}`,
        );
        return unwrap(res.data);
    } catch {
        return null;
    }
};

export const getSpotifyArtist = async (
    artistId: string,
): Promise<SpotifyArtistResponse | null> => {
    try {
        const res = await apiClient.get<{ data: SpotifyArtistResponse }>(
            `${PREFIX}/artists/${encodeURIComponent(artistId)}`,
        );
        return unwrap(res.data);
    } catch {
        return null;
    }
};

export const getSpotifyArtistDiscography = async (
    artistId: string,
): Promise<SpotifyArtistDiscography | null> => {
    try {
        const res = await apiClient.get<{ data: SpotifyArtistDiscography }>(
            `${PREFIX}/artists/${encodeURIComponent(artistId)}/discography`,
        );
        return unwrap(res.data);
    } catch {
        return null;
    }
};

export const getSpotifyTrack = async (trackId: string): Promise<SpotifyTrackDetail | null> => {
    try {
        const res = await apiClient.get<{ data: SpotifyTrackDetail }>(
            `${PREFIX}/tracks/${encodeURIComponent(trackId)}`,
        );
        return unwrap(res.data);
    } catch {
        return null;
    }
};

export const getSpotifyRecommendations = async (params: {
    seedTrack?: string;
    seedArtist?: string;
    seedGenre?: string;
    limit?: number;
}): Promise<MediaItem[]> => {
    const query = new URLSearchParams();
    if (params.seedTrack) query.set("seed_track", params.seedTrack);
    if (params.seedArtist) query.set("seed_artist", params.seedArtist);
    if (params.seedGenre) query.set("seed_genre", params.seedGenre);
    query.set("limit", String(params.limit ?? 12));
    const res = await apiClient.get<{ data: SpotifyTrackResponse[] }>(
        `${PREFIX}/recommendations?${query.toString()}`,
    );
    return unwrap(res.data).map((t) => ({
        id: `audio:spotify:${t.id}`,
        sourceId: `spotify:${t.id}`,
        type: "audio" as const,
        title: t.title,
        artist: t.user.name,
        artistId: t.user.id,
        thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? "",
        duration: t.duration,
        publishedAt: t.created_at,
        provider: "spotify" as const,
        externalUrl: t.external_url,
        album: t.album?.id ? { id: t.album.id, name: t.album.name } : undefined,
    }));
};

export const getLikedMusic = async (): Promise<MediaItem[]> => {
    const res = await apiClient.get<{ data: LikedTrackRow[] }>(`${PREFIX}/liked`);
    return unwrap(res.data).map((row) => fromBackendMediaItem(row.media_item));
};

export const likeMusic = async (item: MediaItem) => {
    await apiClient.post(`${PREFIX}/liked`, mediaItemToBackendPayload(item));
};

export const unlikeMusic = async (item: MediaItem) => {
    await apiClient.delete(
        `${PREFIX}/liked/${encodeURIComponent(item.sourceId)}?type=${item.type}`,
    );
};

export const getRecentMusic = async (): Promise<MediaItem[]> => {
    const res = await apiClient.get<{ data: RecentTrackRow[] }>(`${PREFIX}/recent`);
    return unwrap(res.data).map((row) => fromBackendMediaItem(row.media_item));
};

export const recordMusicPlayback = async (item: MediaItem) => {
    await apiClient.post(`${PREFIX}/recent`, mediaItemToBackendPayload(item));
};

export const getMusicSearchHistory = async (): Promise<MusicSearchHistoryRow[]> => {
    const res = await apiClient.get<{ data: MusicSearchHistoryRow[] }>(`${PREFIX}/search-history`);
    return unwrap(res.data);
};

export const saveMusicSearchKeyword = async (keyword: string) => {
    await apiClient.post(`${PREFIX}/search-history`, { keyword });
};

export const deleteMusicSearchHistory = async (id: number) => {
    await apiClient.delete(`${PREFIX}/search-history/${id}`);
};

export const clearMusicSearchHistory = async () => {
    await apiClient.delete(`${PREFIX}/search-history`);
};

export const getMusicPlaylists = async (): Promise<MusicPlaylistRow[]> => {
    const res = await apiClient.get<{ data: MusicPlaylistRow[] }>(`${PREFIX}/playlists`);
    return unwrap(res.data);
};

export const createMusicPlaylist = async (name: string): Promise<MusicPlaylistRow> => {
    const res = await apiClient.post<{ data: MusicPlaylistRow }>(`${PREFIX}/playlists`, { name });
    return unwrap(res.data);
};

export const addTrackToMusicPlaylist = async (playlistId: number, item: MediaItem) => {
    await apiClient.post(`${PREFIX}/playlists/${playlistId}/tracks`, {
        media_item: mediaItemToBackendPayload(item),
    });
};

export const deleteMusicPlaylist = async (playlistId: number) => {
    await apiClient.delete(`${PREFIX}/playlists/${playlistId}`);
};

export const getMusicLibrary = async (): Promise<MusicLibraryItem[]> => {
    const res = await apiClient.get<{ data: MusicLibraryItem[] }>(`${PREFIX}/library`);
    return unwrap(res.data).map((item) => ({
        ...item,
        metadata:
            typeof item.metadata === "string" ? safeParseMetadata(item.metadata) : item.metadata,
    }));
};

export const addMusicLibraryItem = async (item: AddMusicLibraryItem): Promise<MusicLibraryItem> => {
    const res = await apiClient.post<{ data: MusicLibraryItem }>(`${PREFIX}/library`, item);
    return unwrap(res.data);
};

export const removeMusicLibraryItem = async (itemId: number) => {
    await apiClient.delete(`${PREFIX}/library/${itemId}`);
};

function safeParseMetadata(value: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

// ─── Listening Events ─────────────────────────────────────────────────────────

export type ListeningEventType = "play" | "skip" | "complete" | "like" | "unlike" | "repeat";

export interface TrackListeningEventPayload {
    media_item: {
        source_id: string;
        type: "audio" | "video";
        title: string;
        artist: string;
        thumbnail: string;
        stream_url?: string;
        video_id?: string;
        duration?: number;
        view_count?: number;
        genre?: string;
        mood?: string;
        energy?: number;
        tempo?: number;
        musical_key?: string;
        is_instrumental?: boolean;
        vocal_gender?: string;
        like_count?: number;
        repost_count?: number;
        tags?: string;
    };
    event_type: ListeningEventType;
    listen_duration: number;
    track_duration: number;
    genre?: string;
    event_uuid?: string;
    session_id?: string;
    context?: "organic" | "ai_dj" | "radio" | "smart_queue" | "dynamic" | "friend_sync";
    previous_source_id?: string;
    recommendation_reason?: string;
    position_ms?: number;
    mood?: string;
    energy?: number;
    tempo?: number;
    musical_key?: string;
    is_instrumental?: boolean;
    vocal_gender?: string;
}

export interface UserDNAEntry {
    id: number;
    genre: string;
    play_count: number;
    completion_sum: number;
    skip_count: number;
    last_played_at?: string;
}

export const trackListeningEvent = async (payload: TrackListeningEventPayload): Promise<void> => {
    try {
        await apiClient.post(`${PREFIX}/events`, payload);
    } catch {
        // silently fail — tracking must never block playback
    }
};

export const getUserDNA = async (): Promise<UserDNAEntry[]> => {
    const res = await apiClient.get<{ data: UserDNAEntry[] }>(`${PREFIX}/dna`);
    return unwrap(res.data) ?? [];
};

export const mediaItemToEventPayload = (item: MediaItem): TrackListeningEventPayload["media_item"] => ({
    source_id: item.sourceId,
    type: item.type,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
    stream_url: item.streamUrl,
    video_id: item.videoId,
    duration: item.duration,
    view_count: item.viewCount,
    genre: item.genre,
    mood: item.mood,
    energy: item.energy,
    tempo: item.bpm,
    musical_key: item.musical_key,
    is_instrumental: item.isInstrumental,
    vocal_gender: item.vocalGender,
    like_count: item.likeCount,
    repost_count: item.repostCount,
    tags: item.tags,
});

// ─── Music Intelligence ──────────────────────────────────────────────────────

export type MusicAIMode = "dj" | "chat" | "radio" | "dynamic" | "remix";

export interface MusicEnergyPoint {
    minute: number;
    energy: number;
    label: string;
}

export interface MusicTimelinePhase {
    key: string;
    label: string;
    from_minute: number;
    to_minute: number;
    target_energy: number;
    description: string;
}

export interface MusicJourneyPlan {
    activity: string;
    moods: string[];
    genres: string[];
    duration_minutes: number;
    target_track_count: number;
    instrumental?: boolean;
    vocal_gender?: string;
    discovery_level: number;
    energy_curve: MusicEnergyPoint[];
    timeline: MusicTimelinePhase[];
    search_queries: string[];
    avoid_recent: boolean;
    diversify_artists: boolean;
}

export interface MusicAISession {
    id: string;
    mode: MusicAIMode;
    prompt: string;
    title: string;
    assistant_message: string;
    status: "planning" | "ready" | string;
    created_at: string;
    updated_at: string;
}

export interface MusicAIMessage {
    id: number;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export interface MusicAISessionTrack {
    id: number;
    position: number;
    phase: string;
    score: number;
    energy_target: number;
    reason: string;
    scheduled_minute: number;
    media_item: BackendMediaItem;
}

export interface MusicAISessionResponse {
    session: MusicAISession;
    plan: MusicJourneyPlan;
    messages?: MusicAIMessage[];
    tracks?: MusicAISessionTrack[];
}

export interface RankedMusicTrack {
    media_item: BackendMediaItem;
    position: number;
    phase: string;
    score: number;
    energy_target: number;
    reason: string;
    scheduled_minute: number;
}

export interface MusicDNAInsight {
    value: string;
    affinity: number;
    play_count: number;
    completion_rate: number;
    skip_rate: number;
}

export interface MusicJourneySummary {
    days: number;
    total_sessions: number;
    total_minutes: number;
    completion_rate: number;
    skip_rate: number;
    top_dimensions: Record<string, MusicDNAInsight[]>;
    recent_trend: string;
    suggestion: string;
}

export interface MusicHeatmap {
    cells: Array<{ day: number; hour: number; play_count: number; minutes: number }>;
    peak_day: number;
    peak_hour: number;
    insight: string;
}

export interface MusicDiscovery {
    queries: string[];
    because: string[];
    hidden_gems: BackendMediaItem[];
    community_next: BackendMediaItem[];
    similar_listener_count: number;
    exploration_target: number;
}

export interface ListeningChallenge {
    key: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    completed_at?: string;
    badge: string;
}

export interface TrackExplanation {
    summary: string;
    style: string;
    energy: string;
    tempo: string;
    key: string;
    highlights: string[];
    listening_tip: string;
}

export interface SongComparison {
    similarity: number;
    shared_traits: string[];
    differences: string[];
    transition_note: string;
}

export interface AlbumReview {
    summary: string;
    strengths: string[];
    must_listen: string[];
    style: string;
    energy_journey: string;
}

export const createMusicAISession = async (
    prompt: string,
    mode: MusicAIMode = "dj",
    durationMinutes?: number,
): Promise<MusicAISessionResponse> => {
    const res = await apiClient.post<{ data: MusicAISessionResponse }>(`${PREFIX}/ai/sessions`, {
        prompt,
        mode,
        duration_minutes: durationMinutes,
    });
    return unwrap(res.data);
};

export const startPersonalRadio = async (prompt?: string): Promise<MusicAISessionResponse> => {
    const res = await apiClient.post<{ data: MusicAISessionResponse }>(`${PREFIX}/radio`, {
        prompt,
    });
    return unwrap(res.data);
};

export const createDynamicMusicPlaylist = async (
    prompt?: string,
    durationMinutes?: number,
): Promise<MusicAISessionResponse> => {
    const res = await apiClient.post<{ data: MusicAISessionResponse }>(
        `${PREFIX}/dynamic-playlist`,
        { prompt, duration_minutes: durationMinutes },
    );
    return unwrap(res.data);
};

export const addMusicAICandidates = async (
    sessionId: string,
    candidates: MediaItem[],
    append = false,
): Promise<MusicAISessionResponse> => {
    const res = await apiClient.post<{ data: MusicAISessionResponse }>(
        `${PREFIX}/ai/sessions/${sessionId}/candidates`,
        { candidates: candidates.map(mediaItemToBackendPayload), append },
    );
    return unwrap(res.data);
};

export const chatWithMusic = async (
    sessionId: string,
    message: string,
    candidates: MediaItem[] = [],
): Promise<MusicAISessionResponse> => {
    const res = await apiClient.post<{ data: MusicAISessionResponse }>(
        `${PREFIX}/ai/sessions/${sessionId}/messages`,
        { message, candidates: candidates.map(mediaItemToBackendPayload) },
    );
    return unwrap(res.data);
};

export const buildSmartMusicQueue = async (input: {
    sessionId?: string;
    listenedMinutes: number;
    currentQueue: MediaItem[];
    candidates: MediaItem[];
}): Promise<RankedMusicTrack[]> => {
    const res = await apiClient.post<{ data: RankedMusicTrack[] }>(`${PREFIX}/smart-queue`, {
        session_id: input.sessionId,
        listened_minutes: input.listenedMinutes,
        current_queue: input.currentQueue.map(mediaItemToBackendPayload),
        candidates: input.candidates.map(mediaItemToBackendPayload),
    });
    return unwrap(res.data);
};

export const getMusicJourney = async (days = 7): Promise<MusicJourneySummary> => {
    const res = await apiClient.get<{ data: MusicJourneySummary }>(
        `${PREFIX}/insights/journey?days=${days}`,
    );
    return unwrap(res.data);
};

export const getMusicHeatmap = async (days = 30): Promise<MusicHeatmap> => {
    const res = await apiClient.get<{ data: MusicHeatmap }>(
        `${PREFIX}/insights/heatmap?days=${days}`,
    );
    return unwrap(res.data);
};

export const discoverMusic = async (seedSourceId?: string): Promise<MusicDiscovery> => {
    const query = seedSourceId ? `?seed_source_id=${encodeURIComponent(seedSourceId)}` : "";
    const res = await apiClient.get<{ data: MusicDiscovery }>(`${PREFIX}/discover${query}`);
    return unwrap(res.data);
};

export const getListeningChallenges = async (): Promise<ListeningChallenge[]> => {
    const res = await apiClient.get<{ data: ListeningChallenge[] }>(`${PREFIX}/challenges`);
    return unwrap(res.data);
};

export const explainMusicTrack = async (track: MediaItem): Promise<TrackExplanation> => {
    const res = await apiClient.post<{ data: TrackExplanation }>(`${PREFIX}/explain`, {
        track: mediaItemToBackendPayload(track),
    });
    return unwrap(res.data);
};

export const compareMusicTracks = async (
    first: MediaItem,
    second: MediaItem,
): Promise<SongComparison> => {
    const res = await apiClient.post<{ data: SongComparison }>(`${PREFIX}/compare`, {
        first: mediaItemToBackendPayload(first),
        second: mediaItemToBackendPayload(second),
    });
    return unwrap(res.data);
};

export const reviewMusicAlbum = async (
    name: string,
    artist: string,
    tracks: MediaItem[],
    description = "",
): Promise<AlbumReview> => {
    const res = await apiClient.post<{ data: AlbumReview }>(`${PREFIX}/album-review`, {
        name,
        artist,
        description,
        tracks: tracks.map(mediaItemToBackendPayload),
    });
    return unwrap(res.data);
};

export const getRemixDiscoveryQueries = async (track: MediaItem): Promise<string[]> => {
    const res = await apiClient.post<{ data: { queries: string[] } }>(
        `${PREFIX}/remix-discovery`,
        { track: mediaItemToBackendPayload(track) },
    );
    return unwrap(res.data).queries;
};

export interface MusicSyncRoom {
    id: string;
    invite_code: string;
    status: "waiting" | "active";
    expires_at: string;
}

export const createMusicSyncRoom = async (): Promise<MusicSyncRoom> => {
    const res = await apiClient.post<{ data: MusicSyncRoom }>(`${PREFIX}/sync/rooms`);
    return unwrap(res.data);
};

export const joinMusicSyncRoom = async (inviteCode: string): Promise<MusicSyncRoom> => {
    const res = await apiClient.post<{ data: MusicSyncRoom }>(`${PREFIX}/sync/rooms/join`, {
        invite_code: inviteCode,
    });
    return unwrap(res.data);
};

export const getMusicSyncRecommendations = async (
    roomId: string,
    candidates: MediaItem[],
): Promise<RankedMusicTrack[]> => {
    const res = await apiClient.post<{ data: RankedMusicTrack[] }>(
        `${PREFIX}/sync/rooms/${roomId}/recommendations`,
        { candidates: candidates.map(mediaItemToBackendPayload) },
    );
    return unwrap(res.data);
};
