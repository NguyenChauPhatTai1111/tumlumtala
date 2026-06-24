export interface AudiusUser {
	id: string;
	name: string;
	handle: string;
	profile_picture?: {
		"150x150"?: string;
		"480x480"?: string;
		"1000x1000"?: string;
	};
}

export interface AudiusTrack {
	id: string;
	title: string;
	duration: number;
	created_at?: string;
	user: AudiusUser;
	artwork?: {
		"150x150"?: string;
		"480x480"?: string;
		"1000x1000"?: string;
	};
	play_count?: number;
	favorite_count?: number;
	repost_count?: number;
}

export interface AudiusPlaylist {
	id: string;
	playlist_name: string;
	description?: string;
	user: AudiusUser;
	artwork?: {
		"150x150"?: string;
		"480x480"?: string;
		"1000x1000"?: string;
	};
	track_count?: number;
}

export interface YouTubeVideo {
	id: string;
	title: string;
	channelTitle: string;
	thumbnail: string;
	publishedAt?: string;
	duration?: number;
	viewCount?: number;
}

export interface MediaItem {
	id: string;
	sourceId: string;
	title: string;
	artist: string;
	type: "audio" | "video";
	thumbnail: string;
	duration?: number;
	streamUrl?: string;
	videoId?: string;
	publishedAt?: string;
	viewCount?: number;
}
