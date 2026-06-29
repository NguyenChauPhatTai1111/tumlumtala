import { apiClient } from "@api/client";
import type { MediaItem } from "@pages/music/types";

const PREFIX = "/music";

interface BackendMediaItem {
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

const toPayload = (item: MediaItem) => ({
    source_id: item.sourceId,
    type: item.type,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
    stream_url: item.streamUrl,
    video_id: item.videoId,
    duration: item.duration,
    view_count: item.viewCount,
});

export const fromBackendMediaItem = (item: BackendMediaItem): MediaItem => ({
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
});

const unwrap = <T>(res: { data: T } | T): T =>
    res && typeof res === "object" && "data" in (res as object)
        ? (res as { data: T }).data
        : (res as T);

export const getLikedMusic = async (): Promise<MediaItem[]> => {
    const res = await apiClient.get<{ data: LikedTrackRow[] }>(`${PREFIX}/liked`);
    return unwrap(res.data).map((row) => fromBackendMediaItem(row.media_item));
};

export const likeMusic = async (item: MediaItem) => {
    await apiClient.post(`${PREFIX}/liked`, toPayload(item));
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
    await apiClient.post(`${PREFIX}/recent`, toPayload(item));
};

export const getMusicSearchHistory = async (): Promise<MusicSearchHistoryRow[]> => {
    const res = await apiClient.get<{ data: MusicSearchHistoryRow[] }>(`${PREFIX}/search-history`);
    return unwrap(res.data);
};

export const saveMusicSearchKeyword = async (keyword: string) => {
    await apiClient.post(`${PREFIX}/search-history`, { keyword });
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
        media_item: toPayload(item),
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
