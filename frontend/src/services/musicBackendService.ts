import axios from "axios";
import type { MediaItem } from "@pages/music/types";

const MUSICS_BASE =
	import.meta.env.VITE_MUSICS_SERVICE_URL ?? import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? "http://localhost:25057";
const MUSIC_PREFIX = `${MUSICS_BASE}/api/v1/music`;

const token = () => localStorage.getItem("access_token");

const musicApi = {
	get: async <T>(url: string): Promise<T> => {
		const res = await axios.get<T>(url, {
			headers: { Authorization: `Bearer ${token()}` },
		});
		return res.data;
	},
	post: async <T>(url: string, data?: unknown): Promise<T> => {
		const res = await axios.post<T>(url, data, {
			headers: { Authorization: `Bearer ${token()}` },
		});
		return res.data;
	},
	delete: async <T>(url: string): Promise<T> => {
		const res = await axios.delete<T>(url, {
			headers: { Authorization: `Bearer ${token()}` },
		});
		return res.data;
	},
};

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

export const getLikedMusic = async () => {
	const rows = await musicApi.get<{ data: LikedTrackRow[] }>(`${MUSIC_PREFIX}/liked`);
	return (rows.data ?? rows as unknown as LikedTrackRow[]).map((row: LikedTrackRow) => fromBackendMediaItem(row.media_item));
};

export const likeMusic = async (item: MediaItem) => {
	await musicApi.post(`${MUSIC_PREFIX}/liked`, toPayload(item));
};

export const unlikeMusic = async (item: MediaItem) => {
	await musicApi.delete(
		`${MUSIC_PREFIX}/liked/${encodeURIComponent(item.sourceId)}?type=${item.type}`,
	);
};

export const getRecentMusic = async () => {
	const rows = await musicApi.get<{ data: RecentTrackRow[] }>(`${MUSIC_PREFIX}/recent`);
	return (rows.data ?? rows as unknown as RecentTrackRow[]).map((row: RecentTrackRow) => fromBackendMediaItem(row.media_item));
};

export const recordMusicPlayback = async (item: MediaItem) => {
	await musicApi.post(`${MUSIC_PREFIX}/recent`, toPayload(item));
};

export const getMusicSearchHistory = async () => {
	const res = await musicApi.get<{ data: MusicSearchHistoryRow[] }>(`${MUSIC_PREFIX}/search-history`);
	return res.data ?? res as unknown as MusicSearchHistoryRow[];
};

export const saveMusicSearchKeyword = async (keyword: string) => {
	await musicApi.post(`${MUSIC_PREFIX}/search-history`, { keyword });
};

export const getMusicPlaylists = async () => {
	const res = await musicApi.get<{ data: MusicPlaylistRow[] }>(`${MUSIC_PREFIX}/playlists`);
	return res.data ?? res as unknown as MusicPlaylistRow[];
};

export const createMusicPlaylist = async (name: string) => {
	const res = await musicApi.post<{ data: MusicPlaylistRow }>(`${MUSIC_PREFIX}/playlists`, { name });
	return res.data ?? res as unknown as MusicPlaylistRow;
};

export const addTrackToMusicPlaylist = async (
	playlistId: number,
	item: MediaItem,
) =>
	musicApi.post(`${MUSIC_PREFIX}/playlists/${playlistId}/tracks`, {
		media_item: toPayload(item),
	});
