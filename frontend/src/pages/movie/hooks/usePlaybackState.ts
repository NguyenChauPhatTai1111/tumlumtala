import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import { mapContentRating } from "@pages/movie/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { getEpisodePositions } from "@/services/movieBackendService";
import {
	getMovieDetail,
	proxyM3u8Url,
	resolveRawUrl,
} from "@/services/movieService";

type RecordWatchArgs = {
	slug: string;
	name: string;
	origin_name: string | undefined;
	thumbnail: string;
	poster_url: string;
	episode_name: string;
	episode_slug: string;
	type: string | undefined;
	year: number | undefined;
	quality: string | undefined;
	lang: string | undefined;
	rating: string | undefined;
};

type RecordWatchRow =
	| {
			last_watched_position?: number;
	  }
	| null
	| undefined;

type WatchHistoryRow = {
	slug: string;
	episode_slug: string | null;
	last_watched_position: number;
	duration: number;
};

export function usePlaybackState(
	ratingCacheRef: React.MutableRefObject<Map<string, string>>,
	watchHistoryData: WatchHistoryRow[] | undefined,
	recordWatchMutate: (
		args: RecordWatchArgs,
		opts?: { onSuccess?: (row: RecordWatchRow) => void },
	) => void,
) {
	const queryClient = useQueryClient();
	const [playingTitle, setPlayingTitle] = useState("");
	const [playingEmbed, setPlayingEmbed] = useState("");
	const [playingM3u8, setPlayingM3u8] = useState("");
	const [playingRawM3u8, setPlayingRawM3u8] = useState("");
	const [playingMovie, setPlayingMovie] = useState<OphimMovieItem | null>(null);
	const [playingDetail, setPlayingDetail] = useState<OphimMovieDetail | null>(
		null,
	);
	const [playingEpSlug, setPlayingEpSlug] = useState("");
	const [playingLastPosition, setPlayingLastPosition] = useState(0);

	// Keep refs for use inside async callbacks without stale closure issues
	const playingMovieRef = useRef<OphimMovieItem | null>(null);
	const playingDetailRef = useRef<OphimMovieDetail | null>(null);
	playingMovieRef.current = playingMovie;
	playingDetailRef.current = playingDetail;
	const watchHistoryDataRef = useRef(watchHistoryData);
	watchHistoryDataRef.current = watchHistoryData;

	const episodeProgressMap = useMemo(() => {
		const map = new Map<string, { position: number; duration: number }>();
		if (!playingMovie?.slug) return map;
		const baseSlug = playingMovie.slug.replace(/-phan-\d+$/, "");
		for (const row of watchHistoryData ?? []) {
			if (
				row.slug.replace(/-phan-\d+$/, "") === baseSlug &&
				row.episode_slug &&
				row.last_watched_position > 0 &&
				row.duration > 0
			) {
				map.set(row.episode_slug, {
					position: row.last_watched_position,
					duration: row.duration,
				});
			}
		}
		return map;
	}, [watchHistoryData, playingMovie?.slug]);

	const handlePlayEpisode = useCallback(
		(
			movie: OphimMovieItem,
			detail: OphimMovieDetail,
			_server: OphimEpisodeServer,
			ep: OphimEpisodeData,
		) => {
			const epLabel =
				ep.name !== "Full"
					? /^tập\s/i.test(ep.name)
						? ` - ${ep.name}`
						: ` - Tập ${ep.name}`
					: "";
			setPlayingTitle(`${movie.name}${epLabel}`);
			setPlayingEmbed(ep.link_embed ?? "");
			setPlayingM3u8(ep.link_m3u8 ? proxyM3u8Url(ep.link_m3u8) : "");
			setPlayingRawM3u8(ep.link_m3u8 ?? "");
			setPlayingMovie(movie);
			setPlayingDetail(detail);
			setPlayingEpSlug(ep.slug);
			// 1. Lookup from local cache first (instant)
			const cachedRow = watchHistoryDataRef.current?.find(
				(r) =>
					r.slug === movie.slug &&
					r.episode_slug === ep.slug &&
					r.last_watched_position > 5,
			);
			if (cachedRow) {
				setPlayingLastPosition(cachedRow.last_watched_position);
			} else {
				setPlayingLastPosition(0);
				// 2. Fallback: fetch all episode positions for this movie (covers all seasons)
				const baseSlug = movie.slug.replace(/-phan-\d+$/, "");
				void getEpisodePositions(baseSlug)
					.then((rows) => {
						const row = rows?.find(
							(r) => r.slug === movie.slug && r.episode_slug === ep.slug,
						);
						if (row && row.last_watched_position > 5) {
							setPlayingLastPosition(row.last_watched_position);
						}
					})
					.catch(() => null);
			}

			if (movie.slug && !ratingCacheRef.current.has(movie.slug)) {
				const mapped = movie.rated ?? mapContentRating(detail.rated);
				if (mapped) ratingCacheRef.current.set(movie.slug, mapped);
			}

			recordWatchMutate(
				{
					slug: movie.slug,
					name: movie.name,
					origin_name: movie.origin_name,
					thumbnail: resolveRawUrl(movie.thumb_url),
					poster_url: resolveRawUrl(movie.poster_url),
					episode_name: ep.name,
					episode_slug: ep.slug,
					type: movie.type,
					year: movie.year,
					quality: detail.quality || movie.quality,
					lang: detail.lang || movie.lang,
					rating: ratingCacheRef.current.get(movie.slug),
				},
				{
					onSuccess: (row) => {
						if (row?.last_watched_position && row.last_watched_position > 5) {
							setPlayingLastPosition(row.last_watched_position);
						}
					},
				},
			);
		},
		[ratingCacheRef, recordWatchMutate],
	);

	const handlePlayTMDBEpisode = useCallback(
		async (
			server: OphimEpisodeServer,
			ep: OphimEpisodeData,
			seasonSlug: string,
			tmdbEpName: string,
		) => {
			const movie = playingMovieRef.current;
			const detail = playingDetailRef.current;
			if (!movie) return;
			try {
				const { movie: seasonMovie, episodes: seasonEpisodes } =
					await getMovieDetail(seasonSlug);
				// Preserve totalSeasons from the original detail so VideoPlayerDialog
				// keeps the season selector visible after switching seasons.
				const originalTotalSeasons = detail?.tmdb?.season ?? movie.tmdb?.season;
				const seasonDetail = {
					...seasonMovie,
					episodes: seasonEpisodes,
					...(originalTotalSeasons && seasonMovie.tmdb
						? { tmdb: { ...seasonMovie.tmdb, season: originalTotalSeasons } }
						: {}),
				};
				handlePlayEpisode(
					{
						...movie,
						slug: seasonSlug,
						name: seasonMovie.name || movie.name,
						origin_name: seasonMovie.origin_name || movie.origin_name,
					},
					seasonDetail,
					server,
					{ ...ep, name: tmdbEpName },
				);
			} catch {
				if (detail) handlePlayEpisode(movie, detail, server, ep);
			}
		},
		[handlePlayEpisode],
	);

	const closePlayer = useCallback(() => {
		setPlayingEmbed("");
		setPlayingM3u8("");
		setPlayingRawM3u8("");
		setPlayingTitle("");
		void queryClient.invalidateQueries({
			queryKey: ["movie", "episode-positions"],
		});
		void queryClient.invalidateQueries({
			queryKey: ["movie", "backend", "watch-history-raw"],
		});
	}, [queryClient]);

	return {
		playingTitle,
		playingEmbed,
		playingM3u8,
		playingRawM3u8,
		playingMovie,
		playingDetail,
		playingEpSlug,
		playingLastPosition,
		episodeProgressMap,
		handlePlayEpisode,
		handlePlayTMDBEpisode,
		closePlayer,
	};
}
