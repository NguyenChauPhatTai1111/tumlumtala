import { createContext, useContext } from "react";
import type {
    SpotifyAlbumDetail,
    SpotifyArtistResponse,
    SpotifyCollectionSummary,
} from "@services/musicBackendService";
import type { AudiusPlaylist, AudiusUser } from "./types";

export type MusicView =
    | "home"
    | "ai"
    | "search"
    | "artists"
    | "playlists"
    | "library"
    | "liked"
    | "recent"
    | "my-playlists"
    | "leaderboard"
    | "profile"
    | "stats"
    | "spotify-artist"
    | "spotify-album";

export interface MusicContextValue {
    view: MusicView;
    setView: (v: MusicView) => void;
    keyword: string;
    setKeyword: (k: string) => void;
    selectedArtist: AudiusUser | null;
    setSelectedArtist: (a: AudiusUser | null) => void;
    selectedSpotifyArtist: SpotifyArtistResponse | null;
    setSelectedSpotifyArtist: (a: SpotifyArtistResponse | null) => void;
    selectedSpotifyAlbum: SpotifyAlbumDetail | null;
    setSelectedSpotifyAlbum: (a: SpotifyAlbumDetail | null) => void;
    selectedSpotifyPlaylist: SpotifyCollectionSummary | null;
    setSelectedSpotifyPlaylist: (p: SpotifyCollectionSummary | null) => void;
    selectedPlaylist: AudiusPlaylist | null;
    setSelectedPlaylist: (p: AudiusPlaylist | null) => void;
    openLibraryPlaylistId: number | undefined;
    setOpenLibraryPlaylistId: (id: number | undefined) => void;
    selectArtist: (artist: AudiusUser) => void;
    selectPlaylist: (playlist: AudiusPlaylist) => void;
}

export const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusicContext() {
    const ctx = useContext(MusicContext);
    if (!ctx) throw new Error("useMusicContext must be used within MusicContext.Provider");
    return ctx;
}
