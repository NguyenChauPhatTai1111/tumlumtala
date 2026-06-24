import type { AxiosResponse } from "axios";
import axios from "axios";
import type {
	AudiusPlaylist,
	AudiusTrack,
	AudiusUser,
	MediaItem,
	YouTubeVideo,
} from "@pages/music/types";

const AUDIUS_API = "https://discoveryprovider.audius.co/v1";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

interface AudiusResponse<T> {
	data: T;
}

interface YouTubeSearchItem {
	id: {
		videoId?: string;
	};
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
}

interface YouTubeVideoStatsResponse {
	items: Array<{
		id: string;
		contentDetails?: {
			duration?: string;
		};
		statistics?: {
			viewCount?: string;
		};
	}>;
}

const isRateLimited = (error: unknown) =>
	axios.isAxiosError(error) && error.response?.status === 429;

const isUnavailable = (error: unknown) =>
	axios.isAxiosError(error) &&
	(error.response?.status === 429 || error.response?.status === 503);

const getArtwork = (
	artwork?: AudiusTrack["artwork"] | AudiusPlaylist["artwork"],
) =>
	artwork?.["480x480"] ??
	artwork?.["150x150"] ??
	artwork?.["1000x1000"] ??
	"/assets/logo/logo.png";

const parseYouTubeDuration = (value?: string) => {
	if (!value) return undefined;

	const match = value.match(
		/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
	);
	if (!match) return undefined;

	const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
	return (
		Number(days) * 86400 +
		Number(hours) * 3600 +
		Number(minutes) * 60 +
		Number(seconds)
	);
};

export const getAudiusStreamUrl = (trackId: string) =>
	`${AUDIUS_API}/tracks/${trackId}/stream`;

export const toAudioMediaItem = (track: AudiusTrack): MediaItem => ({
	id: `audio:${track.id}`,
	sourceId: track.id,
	title: track.title,
	artist: track.user.name || track.user.handle,
	type: "audio",
	thumbnail: getArtwork(track.artwork),
	duration: track.duration,
	streamUrl: getAudiusStreamUrl(track.id),
	publishedAt: track.created_at,
	viewCount: track.play_count,
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

export const getTrendingTracks = async () => {
	try {
		const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
			`${AUDIUS_API}/tracks/trending`,
			{ params: { limit: 24 } },
		);
		return [...res.data.data].sort(
			(a, b) => (b.play_count ?? 0) - (a.play_count ?? 0),
		);
	} catch (error) {
		if (isUnavailable(error)) return [];
		throw error;
	}
};

export const searchTracks = async (
	query: string,
	options: { limit?: number; offset?: number } = {},
) => {
	if (!query.trim()) return [];
	const limit = options.limit ?? 50;
	const offset = options.offset ?? 0;
	try {
		const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
			`${AUDIUS_API}/tracks/search`,
			{ params: { query, limit, offset } },
		);
		return [...res.data.data].sort(
			(a, b) => (b.play_count ?? 0) - (a.play_count ?? 0),
		);
	} catch (error) {
		if (isRateLimited(error)) return [];
		throw error;
	}
};

export const searchArtists = async (query: string) => {
	if (!query.trim()) return [];
	try {
		const res = await axios.get<AudiusResponse<AudiusUser[]>>(
			`${AUDIUS_API}/users/search`,
			{ params: { query, limit: 8 } },
		);
		return res.data.data;
	} catch (error) {
		if (isRateLimited(error)) return [];
		throw error;
	}
};

export const getArtistTracks = async (userId: string) => {
	const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
		`${AUDIUS_API}/users/${userId}/tracks`,
		{ params: { limit: 20 } },
	);
	return [...res.data.data].sort(
		(a, b) => (b.play_count ?? 0) - (a.play_count ?? 0),
	);
};

export const searchPlaylists = async (query: string) => {
	if (!query.trim()) return [];
	try {
		const res = await axios.get<AudiusResponse<AudiusPlaylist[]>>(
			`${AUDIUS_API}/playlists/search`,
			{ params: { query, limit: 8 } },
		);
		return res.data.data;
	} catch (error) {
		if (isRateLimited(error)) return [];
		throw error;
	}
};

export const getPlaylistTracks = async (
	playlistId: string,
	options: { limit?: number; offset?: number } = {},
) => {
	const limit = options.limit ?? 50;
	const offset = options.offset ?? 0;
	try {
		const res = await axios.get<AudiusResponse<AudiusTrack[]>>(
			`${AUDIUS_API}/playlists/${playlistId}/tracks`,
			{ params: { limit, offset } },
		);
		return [...res.data.data].sort(
			(a, b) => (b.play_count ?? 0) - (a.play_count ?? 0),
		);
	} catch (error) {
		if (!axios.isAxiosError(error) || error.response?.status !== 404) {
			if (isRateLimited(error)) return [];
			throw error;
		}

		const detail = await axios.get<
			AudiusResponse<AudiusPlaylist & { tracks?: AudiusTrack[] }>
		>(`${AUDIUS_API}/playlists/${playlistId}`);
		return [...(detail.data.data.tracks ?? [])]
			.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))
			.slice(offset, offset + limit);
	}
};

export const searchYouTubeVideos = async (
	query: string,
	options: { maxResults?: number; pageToken?: string } = {},
) => {
	const key = import.meta.env.VITE_YOUTUBE_API_KEY;
	if (!query.trim() || !key)
		return {
			videos: [] as YouTubeVideo[],
			nextPageToken: undefined as string | undefined,
		};

	let res: AxiosResponse<YouTubeSearchResponse & { nextPageToken?: string }>;
	try {
		res = await axios.get<YouTubeSearchResponse & { nextPageToken?: string }>(
			`${YOUTUBE_API}/search`,
			{
				params: {
					key,
					part: "snippet",
					q: query,
					type: "video",
					maxResults: options.maxResults ?? 25,
					...(options.pageToken ? { pageToken: options.pageToken } : {}),
				},
			},
		);
	} catch (error) {
		if (isUnavailable(error)) {
			return {
				videos: [] as YouTubeVideo[],
				nextPageToken: undefined as string | undefined,
			};
		}
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
		const response = await axios.get<YouTubeVideoStatsResponse>(
			`${YOUTUBE_API}/videos`,
			{
				params: {
					key,
					part: "statistics,contentDetails",
					id: videos.map((video) => video.id).join(","),
				},
			},
		);
		statsRes = response.data;
	} catch (error) {
		if (!isUnavailable(error)) {
			throw error;
		}
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
			.map((video) => ({
				...video,
				duration: durationsById.get(video.id),
				viewCount: viewsById.get(video.id) ?? 0,
			}))
			.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)),
		nextPageToken,
	};
};

export const getAudiusProfileImage = (user: AudiusUser) =>
	user.profile_picture?.["150x150"] ??
	user.profile_picture?.["480x480"] ??
	"/assets/logo/logo.png";

export const getPlaylistArtwork = (playlist: AudiusPlaylist) =>
	getArtwork(playlist.artwork);
