import type { AudiusUser, MediaItem, TrendingGenre, TrendingTimeFilter } from "@pages/music/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addTrackToMusicPlaylist,
    addMusicLibraryItem,
    clearMusicSearchHistory,
    createMusicPlaylist,
    deleteMusicPlaylist,
    deleteMusicSearchHistory,
    getMusicLibrary,
    getLikedMusic,
    getMusicPlaylists,
    getMusicSearchHistory,
    getRecentMusic,
    likeMusic,
    removeMusicLibraryItem,
    unlikeMusic,
} from "@services/musicBackendService";
import type { AddMusicLibraryItem } from "@services/musicBackendService";
import {
    getArtistAlbums,
    getArtistFollowers,
    getArtistFollowing,
    getArtistPlaylists,
    getArtistRadio,
    getArtistTracks,
    getPlaylistTracks,
    getRecommendations,
    getSimilarArtists,
    getTrackRadio,
    getTrendingAlbums,
    getTrendingArtists,
    getTrendingPlaylists,
    getTrendingTracks,
    getUndergroundTrendingTracks,
    getTrackLyrics,
    searchArtists,
    searchPlaylists,
    searchPreferredTracks,
    searchYouTubeVideos,
} from "@services/musicService";


// ─── Lyrics ───────────────────────────────────────────────────────────────────

export const useLyricsQuery = (item: MediaItem | null) =>
    useQuery({
        queryKey: [
            "music",
            "lyrics",
            item?.type ?? "",
            item?.artist ?? "",
            item?.title ?? "",
        ],
        queryFn: () => getTrackLyrics(item!.artist, item!.title),
        enabled: Boolean(item?.artist) && Boolean(item?.title),
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

// ─── Trending ─────────────────────────────────────────────────────────────────

export const useTrendingQuery = (
    options: {
        genre?: TrendingGenre;
        time?: TrendingTimeFilter;
    } = {},
) =>
    useQuery({
        queryKey: ["music", "trending", options.genre ?? "All", options.time ?? "week"],
        queryFn: () => getTrendingTracks(options),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useTrendingArtistsQuery = () =>
    useQuery({
        queryKey: ["music", "trending-artists"],
        queryFn: getTrendingArtists,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useTrendingPlaylistsQuery = () =>
    useQuery({
        queryKey: ["music", "trending-playlists"],
        queryFn: getTrendingPlaylists,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useTrendingAlbumsQuery = () =>
    useQuery({
        queryKey: ["music", "trending-albums"],
        queryFn: getTrendingAlbums,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useUndergroundTrendingQuery = () =>
    useQuery({
        queryKey: ["music", "trending-underground"],
        queryFn: getUndergroundTrendingTracks,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useRecommendationsQuery = (seedTrackId: string | undefined) =>
    useQuery({
        queryKey: ["music", "recommendations", seedTrackId],
        queryFn: () => getRecommendations(seedTrackId!),
        enabled: Boolean(seedTrackId),
        staleTime: 10 * 60 * 1000,
        retry: false,
    });

export const useTrackRadioQuery = (seedTrackId: string | undefined) =>
    useQuery({
        queryKey: ["music", "track-radio", seedTrackId],
        queryFn: () => getTrackRadio(seedTrackId!, 30),
        enabled: Boolean(seedTrackId),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useArtistRadioQuery = (artist: AudiusUser | null) =>
    useQuery({
        queryKey: ["music", "artist-radio", artist?.id],
        queryFn: () => getArtistRadio(artist!, 30),
        enabled: Boolean(artist),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

export const useSimilarArtistsQuery = (artist: AudiusUser | null) =>
    useQuery({
        queryKey: ["music", "similar-artists", artist?.id],
        queryFn: () => getSimilarArtists(artist!, 12),
        enabled: Boolean(artist),
        staleTime: 10 * 60 * 1000,
        retry: false,
    });

// ─── Search ───────────────────────────────────────────────────────────────────

export const useTracksQuery = (searchKeyword: string, enabled: boolean) =>
    useInfiniteQuery({
        queryKey: ["music", "tracks", searchKeyword],
        queryFn: ({ pageParam }) =>
            searchPreferredTracks(searchKeyword, { limit: 10, offset: pageParam }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === 10 ? allPages.length * 10 : undefined,
        enabled,
        retry: false,
    });

export const useVideosQuery = (searchKeyword: string, enabled: boolean) =>
    useInfiniteQuery({
        queryKey: ["music", "videos", searchKeyword],
        queryFn: ({ pageParam }) => searchYouTubeVideos(searchKeyword, { pageToken: pageParam }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextPageToken,
        enabled,
        retry: false,
    });

export const useArtistsQuery = (searchKeyword: string, enabled: boolean) =>
    useQuery({
        queryKey: ["music", "artists", searchKeyword],
        queryFn: () => searchArtists(searchKeyword),
        enabled,
        retry: false,
    });

export const usePlaylistsQuery = (searchKeyword: string, enabled: boolean) =>
    useQuery({
        queryKey: ["music", "playlists", searchKeyword],
        queryFn: () => searchPlaylists(searchKeyword),
        enabled,
        retry: false,
    });

// ─── Playlist / Artist detail ─────────────────────────────────────────────────

const isAudiusId = (id: string | undefined): boolean =>
    Boolean(id) && !id!.startsWith("spotify:") && id!.length <= 13;

export const usePlaylistTracksQuery = (playlistId: string | undefined) =>
    useInfiniteQuery({
        queryKey: ["music", "playlist-tracks", playlistId],
        queryFn: ({ pageParam }) =>
            getPlaylistTracks(playlistId ?? "", { limit: 50, offset: pageParam }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === 50 ? allPages.length * 50 : undefined,
        enabled: Boolean(playlistId) && isAudiusId(playlistId),
        retry: false,
    });

export const useArtistTracksQuery = (artistId: string | undefined) =>
    useQuery({
        queryKey: ["music", "artist-tracks", artistId],
        queryFn: () => getArtistTracks(artistId ?? ""),
        enabled: Boolean(artistId),
    });

export const useArtistAlbumsQuery = (artistId: string | undefined) =>
    useQuery({
        queryKey: ["music", "artist-albums", artistId],
        queryFn: () => getArtistAlbums(artistId ?? ""),
        enabled: Boolean(artistId),
    });

export const useArtistPlaylistsQuery = (artistId: string | undefined) =>
    useQuery({
        queryKey: ["music", "artist-playlists", artistId],
        queryFn: () => getArtistPlaylists(artistId ?? ""),
        enabled: Boolean(artistId),
    });

export const useArtistFollowersQuery = (artistId: string | undefined) =>
    useQuery({
        queryKey: ["music", "artist-followers", artistId],
        queryFn: () => getArtistFollowers(artistId ?? ""),
        enabled: Boolean(artistId),
    });

export const useArtistFollowingQuery = (artistId: string | undefined) =>
    useQuery({
        queryKey: ["music", "artist-following", artistId],
        queryFn: () => getArtistFollowing(artistId ?? ""),
        enabled: Boolean(artistId),
    });

// ─── Backend (own server) ─────────────────────────────────────────────────────

export const useBackendLikedQuery = () =>
    useQuery({
        queryKey: ["music", "backend", "liked"],
        queryFn: getLikedMusic,
        retry: false,
    });

export const useBackendRecentQuery = () =>
    useQuery({
        queryKey: ["music", "backend", "recent"],
        queryFn: getRecentMusic,
        retry: false,
    });

export const useBackendSearchHistoryQuery = () =>
    useQuery({
        queryKey: ["music", "backend", "search-history"],
        queryFn: getMusicSearchHistory,
        retry: false,
    });

export const useBackendPlaylistsQuery = () =>
    useQuery({
        queryKey: ["music", "backend", "playlists"],
        queryFn: getMusicPlaylists,
        retry: false,
    });

export const useMusicLibraryQuery = () =>
    useQuery({
        queryKey: ["music", "backend", "library"],
        queryFn: getMusicLibrary,
        retry: false,
    });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreatePlaylistMutation = (onSuccess: () => void) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createMusicPlaylist,
        onSuccess: () => {
            onSuccess();
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "playlists"],
            });
        },
    });
};

export const useAddToPlaylistMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ playlistId, item }: { playlistId: number; item: MediaItem }) =>
            addTrackToMusicPlaylist(playlistId, item),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "playlists"],
            });
        },
    });
};

export const useAddLibraryItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (item: AddMusicLibraryItem) => addMusicLibraryItem(item),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "library"],
            });
        },
    });
};

export const useRemoveLibraryItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeMusicLibraryItem,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "library"],
            });
        },
    });
};

export const useDeleteMusicPlaylistMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteMusicPlaylist,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "playlists"],
            });
        },
    });
};

export const useLikeMusicMutation = (item: MediaItem, liked: boolean) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (liked) {
                await unlikeMusic(item);
                return;
            }
            await likeMusic(item);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: ["music", "backend", "liked"],
            });
            const previous = queryClient.getQueryData<MediaItem[]>(["music", "backend", "liked"]);
            queryClient.setQueryData<MediaItem[]>(["music", "backend", "liked"], (current = []) =>
                liked
                    ? current.filter((entry) => entry.id !== item.id)
                    : [item, ...current.filter((entry) => entry.id !== item.id)],
            );
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(["music", "backend", "liked"], context.previous);
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["music", "backend", "liked"],
            });
        },
    });
};

export const useDeleteSearchHistoryMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteMusicSearchHistory(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["music", "backend", "search-history"] });
        },
    });
};

export const useClearSearchHistoryMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: clearMusicSearchHistory,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["music", "backend", "search-history"] });
        },
    });
};
