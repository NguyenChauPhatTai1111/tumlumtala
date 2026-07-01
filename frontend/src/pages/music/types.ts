export interface AudiusUser {
    id: string;
    name: string;
    handle: string;
    bio?: string;
    location?: string;
    is_verified?: boolean;
    follower_count?: number;
    following_count?: number;
    track_count?: number;
    playlist_count?: number;
    album_count?: number;
    repost_count?: number;
    profile_picture?: {
        "150x150"?: string;
        "480x480"?: string;
        "1000x1000"?: string;
    };
    cover_photo?: {
        "640x"?: string;
        "2000x"?: string;
    };
}

export interface AudiusTrack {
    id: string;
    provider?: "audius" | "spotify";
    external_url?: string;
    title: string;
    duration: number;
    created_at?: string;
    genre?: string;
    mood?: string;
    bpm?: number;
    musical_key?: string;
    tags?: string;
    album_backlink?: {
        playlist_id: string | number;
        playlist_name: string;
        permalink: string;
    };
    playlists_containing_track?: Array<string | number>;
    is_downloadable?: boolean;
    is_streamable?: boolean;
    is_stream_gated?: boolean;
    user: AudiusUser;
    artwork?: {
        "150x150"?: string;
        "480x480"?: string;
        "1000x1000"?: string;
    };
    play_count?: number;
    favorite_count?: number;
    repost_count?: number;
    comment_count?: number;
    stream?: { url: string };
    permalink?: string;
}

export interface AudiusPlaylist {
    id: string;
    playlist_name: string;
    description?: string;
    is_album?: boolean;
    is_private?: boolean;
    track_count?: number;
    total_play_count?: number;
    favorite_count?: number;
    repost_count?: number;
    created_at?: string;
    user: AudiusUser;
    tracks?: AudiusTrack[];
    artwork?: {
        "150x150"?: string;
        "480x480"?: string;
        "1000x1000"?: string;
    };
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
    artistId?: string;
    artistHandle?: string;
    type: "audio" | "video";
    thumbnail: string;
    duration?: number;
    streamUrl?: string;
    videoId?: string;
    publishedAt?: string;
    viewCount?: number;
    genre?: string;
    mood?: string;
    bpm?: number;
    energy?: number;
    musical_key?: string;
    tags?: string;
    isInstrumental?: boolean;
    vocalGender?: "female" | "male" | "mixed" | string;
    likeCount?: number;
    repostCount?: number;
    album?: {
        id: string;
        name: string;
        permalink?: string;
    };
    playlistIds?: string[];
    provider?: "audius" | "spotify";
    externalUrl?: string;
}

export type TrendingTimeFilter = "week" | "month" | "allTime";
export type TrendingGenre =
    | "All"
    | "Electronic"
    | "Rock"
    | "Metal"
    | "Alternative"
    | "Hip-Hop/Rap"
    | "Experimental"
    | "Punk"
    | "Folk"
    | "Pop"
    | "Classical"
    | "Soul"
    | "R&B/Soul"
    | "Jazz"
    | "Acoustic"
    | "Funk"
    | "Devotional"
    | "Country"
    | "Spoken Word"
    | "Comedy"
    | "Soundtrack"
    | "Reggae"
    | "Dancehall"
    | "House"
    | "Techno"
    | "Trap"
    | "Drum & Bass"
    | "Ambient"
    | "Downtempo"
    | "Latin"
    | "Afrobeat"
    | "Piano"
    | "World"
    | "Tropical";
