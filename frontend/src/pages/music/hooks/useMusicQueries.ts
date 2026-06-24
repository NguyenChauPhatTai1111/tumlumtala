import type { MediaItem } from "@pages/music/types";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	addTrackToMusicPlaylist,
	createMusicPlaylist,
	getLikedMusic,
	getMusicPlaylists,
	getMusicSearchHistory,
	getRecentMusic,
	likeMusic,
	unlikeMusic,
} from "@services/musicBackendService";
import {
	getArtistTracks,
	getPlaylistTracks,
	getTrendingTracks,
	searchArtists,
	searchPlaylists,
	searchTracks,
	searchYouTubeVideos,
} from "@services/musicService";

export const useTrendingQuery = () =>
	useQuery({
		queryKey: ["music", "trending"],
		queryFn: getTrendingTracks,
		retry: false,
	});

export const useTracksQuery = (searchKeyword: string, enabled: boolean) =>
	useInfiniteQuery({
		queryKey: ["music", "tracks", searchKeyword],
		queryFn: ({ pageParam }) =>
			searchTracks(searchKeyword, { limit: 50, offset: pageParam }),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) =>
			lastPage.length === 50 ? allPages.length * 50 : undefined,
		enabled,
		retry: false,
	});

export const useVideosQuery = (searchKeyword: string, enabled: boolean) =>
	useInfiniteQuery({
		queryKey: ["music", "videos", searchKeyword],
		queryFn: ({ pageParam }) =>
			searchYouTubeVideos(searchKeyword, { pageToken: pageParam }),
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

export const usePlaylistTracksQuery = (playlistId: string | undefined) =>
	useInfiniteQuery({
		queryKey: ["music", "playlist-tracks", playlistId],
		queryFn: ({ pageParam }) =>
			getPlaylistTracks(playlistId ?? "", { limit: 50, offset: pageParam }),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) =>
			lastPage.length === 50 ? allPages.length * 50 : undefined,
		enabled: Boolean(playlistId),
		retry: false,
	});

export const useArtistTracksQuery = (artistId: string | undefined) =>
	useQuery({
		queryKey: ["music", "artist-tracks", artistId],
		queryFn: () => getArtistTracks(artistId ?? ""),
		enabled: Boolean(artistId),
	});

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
		mutationFn: ({
			playlistId,
			item,
		}: {
			playlistId: number;
			item: MediaItem;
		}) => addTrackToMusicPlaylist(playlistId, item),
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
			const previous = queryClient.getQueryData<MediaItem[]>([
				"music",
				"backend",
				"liked",
			]);
			queryClient.setQueryData<MediaItem[]>(
				["music", "backend", "liked"],
				(current = []) =>
					liked
						? current.filter((entry) => entry.id !== item.id)
						: [item, ...current.filter((entry) => entry.id !== item.id)],
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(
					["music", "backend", "liked"],
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["music", "backend", "liked"],
			});
		},
	});
};
