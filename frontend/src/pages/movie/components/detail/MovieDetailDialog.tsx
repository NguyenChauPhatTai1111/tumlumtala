import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
	Box,
	Button,
	Dialog,
	DialogContent,
	Divider,
	Fade,
	Grow,
	Skeleton,
	Stack,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { useBatchCertifications } from "@pages/movie/hooks/useBatchCertifications";
import { useTMDBDetails } from "@pages/movie/hooks/useTMDBImages";
import type {
	OphimCategory,
	OphimCountry,
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
	OphimV1CatalogItem,
} from "@pages/movie/types";
import { formatDuration, getTrailerEmbedUrl } from "@pages/movie/utils";
import { useQuery } from "@tanstack/react-query";
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import type { EpisodePositionRow } from "@/services/movieBackendService";
import {
	getCachedEpisodes,
	getEpisodePositions,
	upsertCachedEpisodes,
} from "@/services/movieBackendService";
import {
	getMovieDetail,
	getMoviesByFilter,
	resolveThumb,
} from "@/services/movieService";
import type { TMDBEpisode } from "@/services/tmdbService";
import { getTMDBSeason } from "@/services/tmdbService";
import { MovieCastSection } from "./MovieCastSection";
import { MovieEpisodeList } from "./MovieEpisodeList";
import { MovieHeroSection } from "./MovieHeroSection";
import { MovieSimilarSection } from "./MovieSimilarSection";
import { PersonDialog } from "./PersonDialog";

const isValidEp = (ep: OphimEpisodeData) =>
	Boolean(ep.link_embed || ep.link_m3u8 || ep.slug);

export const MovieDetailDialog = ({
	movie,
	liked,
	autoPlay = false,
	onClose,
	onPlayEpisode,
	onLike,
	onBrowseGenre,
	onBrowseCountry,
	onBrowseYear,
	onShowInfo,
	onPlayAndOpen,
	onRatingResolved,
	episodeProgressMap,
	watchHistoryData: _watchHistoryData,
}: {
	movie: OphimMovieItem | null;
	liked: boolean;
	autoPlay?: boolean;
	onClose: () => void;
	onPlayEpisode: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onLike: (rating?: string) => void;
	onBrowseGenre: (item: OphimV1CatalogItem) => void;
	onBrowseCountry: (item: OphimV1CatalogItem) => void;
	onBrowseYear: (item: OphimV1CatalogItem) => void;
	onShowInfo?: (movie: OphimMovieItem) => void;
	onPlayAndOpen?: (movie: OphimMovieItem) => void;
	onRatingResolved?: (slug: string, rating: string) => void;
	episodeProgressMap?: Map<string, { position: number; duration: number }>;
	watchHistoryData?: Array<{
		slug: string;
		episode_slug: string | null;
		last_watched_position: number;
		duration: number;
	}>;
}) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const [selectedServer, setSelectedServer] = useState(0);
	const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
	const [episodesExpanded, setEpisodesExpanded] = useState(true);
	const [trailerState, dispatchTrailer] = useReducer(
		(
			s: {
				active: boolean;
				visible: boolean;
				ending: boolean;
				paused: boolean;
				muted: boolean;
				key: number;
				expandedHeight: number | null;
			},
			a:
				| { type: "reset" }
				| { type: "start" }
				| { type: "show"; height: number | null }
				| { type: "end" }
				| { type: "hide" }
				| { type: "stop" }
				| { type: "toggleMute" }
				| { type: "setMuted"; value: boolean }
				| { type: "togglePause" }
				| { type: "setPaused"; value: boolean }
				| { type: "reload" }
				| { type: "setExpandedHeight"; value: number | null },
		) => {
			switch (a.type) {
				case "reset":
					return {
						active: false,
						visible: false,
						ending: false,
						paused: false,
						muted: false,
						key: s.key,
						expandedHeight: null,
					};
				case "start":
					return {
						...s,
						active: true,
						visible: false,
						ending: false,
						paused: false,
						muted: false,
					};
				case "show":
					return { ...s, visible: true, expandedHeight: a.height };
				case "end":
					return { ...s, ending: true };
				case "hide":
					return { ...s, visible: false, ending: false };
				case "stop":
					return { ...s, active: false, visible: false };
				case "toggleMute":
					return { ...s, muted: !s.muted };
				case "setMuted":
					return { ...s, muted: a.value };
				case "togglePause":
					return { ...s, paused: !s.paused };
				case "setPaused":
					return { ...s, paused: a.value };
				case "reload":
					return { ...s, key: s.key + 1 };
				case "setExpandedHeight":
					return { ...s, expandedHeight: a.value };
			}
		},
		{
			active: false,
			visible: false,
			ending: false,
			paused: false,
			muted: false,
			key: 0,
			expandedHeight: null,
		},
	);
	const trailerActive = trailerState.active;
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [failedTrailerSlug, setFailedTrailerSlug] = useState<string | null>(
		null,
	);
	const trailerCountdownIntervalRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const heroRef = useRef<HTMLDivElement>(null);
	const trailerIframeRef = useRef<HTMLIFrameElement>(null);
	const trailerDismissedRef = useRef(false);
	const trailerHasPlayedRef = useRef(false);
	const trailerAutoUnmutedRef = useRef(false);
	const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dialogContentRef = useRef<HTMLDivElement>(null);
	const onPlayEpisodeRef = useRef(onPlayEpisode);
	onPlayEpisodeRef.current = onPlayEpisode;
	const movieRef = useRef(movie);
	movieRef.current = movie;

	useEffect(() => {
		if (movie?.slug) {
			dialogContentRef.current?.scrollTo({ top: 0, behavior: "instant" });
			setSelectedServer(0);
		}
	}, [movie?.slug]);

	const detailQuery = useQuery({
		queryKey: ["movie", "detail", movie?.slug],
		queryFn: () => getMovieDetail(movie?.slug ?? ""),
		enabled: Boolean(movie?.slug),
		retry: false,
		placeholderData: undefined,
	});

	// Khi đang fetch phim mới, không dùng data cũ để tránh hiện thông tin phim trước
	const detail = detailQuery.isFetching ? undefined : detailQuery.data?.movie;
	const episodes = useMemo(
		() => (detailQuery.isFetching ? [] : (detailQuery.data?.episodes ?? [])),
		[detailQuery.isFetching, detailQuery.data?.episodes],
	);
	const currentServer = episodes[selectedServer];

	const isTMDBSeries = Boolean(detail?.tmdb?.type === "tv" && detail?.tmdb?.id);
	const totalSeasons = detail?.tmdb?.season ?? 1;
	const playingSeason = Number(movie?.slug?.match(/-phan-(\d+)$/)?.[1] ?? 1);
	const baseMovieSlug = (movie?.slug ?? "").replace(/-phan-\d+$/, "");
	const [activeSeason, setActiveSeason] = useState(playingSeason);

	// Fetch all episode positions for this movie from API (covers all seasons, all episodes)
	const episodePositionsQuery = useQuery({
		queryKey: ["movie", "episode-positions", baseMovieSlug],
		queryFn: () => getEpisodePositions(baseMovieSlug),
		enabled: Boolean(baseMovieSlug && movie),
		staleTime: 0,
		refetchOnWindowFocus: true,
	});

	// Build progress map filtered to the currently viewed season from API data
	const activeSeasonProgressMap = useMemo(() => {
		const rows: EpisodePositionRow[] = episodePositionsQuery.data ?? [];
		if (rows.length > 0) {
			// Dùng cùng slug pattern với activeSeasonSlug: luôn dùng -phan-N
			// Ngoại trừ season đang phát (playingSeason) thì dùng movie.slug gốc
			const seasonSlug =
				activeSeason === playingSeason
					? (movie?.slug ?? baseMovieSlug)
					: `${baseMovieSlug}-phan-${activeSeason}`;
			const map = new Map<string, { position: number; duration: number }>();
			for (const row of rows) {
				if (
					row.slug === seasonSlug &&
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
		}
		return episodeProgressMap;
	}, [
		episodePositionsQuery.data,
		activeSeason,
		playingSeason,
		baseMovieSlug,
		movie?.slug,
		episodeProgressMap,
	]);

	const activeSeasonSlug =
		activeSeason === playingSeason
			? null
			: `${baseMovieSlug}-phan-${activeSeason}`;
	const activeSeasonQuery = useQuery({
		queryKey: ["movie", "detail", activeSeasonSlug],
		queryFn: () => getMovieDetail(activeSeasonSlug ?? ""),
		enabled: Boolean(activeSeasonSlug),
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
	const activeEpisodes =
		activeSeason === playingSeason
			? episodes
			: (activeSeasonQuery.data?.episodes ?? []);
	const [tmdbEpisodes, setTmdbEpisodes] = useState<TMDBEpisode[]>([]);
	const tmdbEpisodesRef = useRef<TMDBEpisode[]>([]);
	tmdbEpisodesRef.current = tmdbEpisodes;
	const [tmdbSeasonName, setTmdbSeasonName] = useState("");
	const [tmdbEpisodesLoading, setTmdbEpisodesLoading] = useState(false);
	const savedSeasonsRef = useRef<Set<string>>(new Set());
	const tmdbLoadedRef = useRef<Set<number>>(new Set());

	// Fetch TMDB episodes: DB cache → TMDB API
	useEffect(() => {
		if (!isTMDBSeries || !detail?.tmdb?.id || !baseMovieSlug) return;
		let cancelled = false;
		setTmdbEpisodesLoading(true);
		setTmdbEpisodes([]);

		const load = async () => {
			try {
				const cached = await getCachedEpisodes(baseMovieSlug, activeSeason);
				if (!cancelled && cached && cached.length > 0) {
					const fromCache: TMDBEpisode[] = cached
						.filter((e) => e.server_name === cached[0]?.server_name)
						.map((e, idx) => ({
							episode_number: idx + 1,
							name: e.episode_name || `Tập ${idx + 1}`,
							overview: e.overview || "",
							still_path: e.still_path || null,
							air_date: "",
							runtime: null,
						}));
					if (fromCache.length > 0) {
						setTmdbEpisodes(fromCache);
						setTmdbSeasonName(`Phần ${activeSeason}`);
						setTmdbEpisodesLoading(false);
						return;
					}
				}
			} catch {
				// fall through to API
			}

			try {
				const data = await getTMDBSeason(detail.tmdb?.id ?? "", activeSeason);
				if (cancelled) return;
				tmdbLoadedRef.current.add(activeSeason);
				setTmdbEpisodes(data.episodes ?? []);
				setTmdbSeasonName(data.name || `Phần ${activeSeason}`);
			} catch {
				// TMDB unreachable (e.g. VPN blocks it) — fallback to KKPhim episode list
				if (!cancelled) {
					try {
						const seasonSlug =
							activeSeason === 1
								? baseMovieSlug
								: `${baseMovieSlug}-phan-${activeSeason}`;
						let kkData = await getMovieDetail(seasonSlug);
						if (activeSeason === 1 && !kkData.episodes?.length) {
							kkData = await getMovieDetail(`${baseMovieSlug}-phan-1`);
						}
						const serverData = kkData.episodes?.[0]?.server_data ?? [];
						const fallbackEps: TMDBEpisode[] = serverData.map((ep, idx) => ({
							episode_number: idx + 1,
							name: ep.name || `Tập ${idx + 1}`,
							overview: "",
							still_path: null,
							air_date: "",
							runtime: null,
						}));
						if (!cancelled) {
							setTmdbEpisodes(fallbackEps);
							setTmdbSeasonName(`Phần ${activeSeason}`);
						}
					} catch {
						if (!cancelled) setTmdbEpisodes([]);
					}
				}
			} finally {
				if (!cancelled) setTmdbEpisodesLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [isTMDBSeries, detail?.tmdb?.id, baseMovieSlug, activeSeason]);

	// Fetch KKPhim episodes per season → persist to DB
	useEffect(() => {
		if (!isTMDBSeries || !baseMovieSlug) return;
		const cacheKey = `${baseMovieSlug}:${activeSeason}`;
		if (savedSeasonsRef.current.has(cacheKey)) return;
		let cancelled = false;

		const load = async () => {
			try {
				// Season 1: thử slug gốc trước (nhất quán với activeSeasonQuery), fallback sang -phan-1
				// Season N>1: dùng -phan-N
				const primarySlug =
					activeSeason === 1
						? baseMovieSlug
						: `${baseMovieSlug}-phan-${activeSeason}`;
				let kkData = await getMovieDetail(primarySlug);
				if (activeSeason === 1 && !kkData.episodes?.length) {
					kkData = await getMovieDetail(`${baseMovieSlug}-phan-1`);
				}
				if (cancelled || !kkData.episodes?.length) return;
				// Chỉ lưu DB khi TMDB đã load thành công — tránh lưu tên tập thiếu thông tin
				if (!tmdbLoadedRef.current.has(activeSeason)) return;
				savedSeasonsRef.current.add(cacheKey);
				const tmdbEps = tmdbEpisodesRef.current;
				const episodeInputs = kkData.episodes.flatMap((server) =>
					server.server_data.map((ep, idx) => ({
						server_name: server.server_name,
						episode_name: tmdbEps[idx]?.name || ep.name,
						episode_slug: ep.slug,
						overview: tmdbEps[idx]?.overview ?? "",
						still_path: tmdbEps[idx]?.still_path ?? "",
						filename: ep.filename,
						link_embed: ep.link_embed,
						link_m3u8: ep.link_m3u8,
					})),
				);
				void upsertCachedEpisodes(baseMovieSlug, activeSeason, episodeInputs);
			} catch {
				// ignore
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [isTMDBSeries, baseMovieSlug, activeSeason]);

	useEffect(() => {
		setActiveSeason(Number(movie?.slug?.match(/-phan-(\d+)$/)?.[1] ?? 1));
		savedSeasonsRef.current.clear();
		tmdbLoadedRef.current.clear();
	}, [movie?.slug]);

	const thumbUrl = resolveThumb(movie?.thumb_url || "");
	const posterUrl = resolveThumb(movie?.poster_url || "");

	const tmdbDetails = useTMDBDetails(
		detailQuery.isFetching ? null : detail?.tmdb?.id,
		detailQuery.isFetching ? null : detail?.tmdb?.type,
		movie?.origin_name || movie?.name,
		movie?.year,
		movie?.origin_name,
	);
	const heroImageUrl = detailQuery.isFetching
		? thumbUrl || posterUrl
		: tmdbDetails.data?.backdrop || thumbUrl || posterUrl;
	const posterImageUrl = detailQuery.isFetching
		? posterUrl || thumbUrl
		: tmdbDetails.data?.poster || posterUrl || thumbUrl;

	const rawCategories = detail?.category ?? movie?.category ?? [];
	const categories = rawCategories.filter(
		(cat, i, arr) => arr.findIndex((c) => c.id === cat.id) === i,
	);

	const randomGenreSlug = useMemo(() => {
		const cats = categories.length > 0 ? categories : (movie?.category ?? []);
		if (cats.length === 0) return undefined;
		let h = 0;
		const s = movie?.slug ?? "";
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
		return cats[h % cats.length].slug;
	}, [movie?.slug, movie?.category, categories]);
	const similarQuery = useQuery({
		queryKey: ["movie", "similar", randomGenreSlug, movie?.slug],
		queryFn: () =>
			getMoviesByFilter({ genreSlug: randomGenreSlug ?? "" }, 1, 15),
		enabled: Boolean(randomGenreSlug),
		retry: false,
		select: (data) =>
			data.items
				.filter((m: OphimMovieItem) => m.slug !== movie?.slug)
				.filter(
					(m: OphimMovieItem, i: number, arr: OphimMovieItem[]) =>
						arr.findIndex((x) => x.slug === m.slug) === i,
				)
				.slice(0, 15),
	});
	const similarCertRatings = useBatchCertifications(similarQuery.data ?? []);
	const rawCountries = detail?.country ?? movie?.country ?? [];
	const countries = rawCountries.filter(
		(c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
	);

	const formattedDuration = detail?.time ? formatDuration(detail.time) : null;
	const firstValidServer = episodes.find((s) => s.server_data.some(isValidEp));
	const firstValidEp = firstValidServer?.server_data.find(isValidEp);
	const hasValidEpisodes = Boolean(firstValidServer && firstValidEp);

	// Prefer the user-selected server; fall back to the first valid server
	const preferredServer = episodes[selectedServer]?.server_data.some(isValidEp)
		? episodes[selectedServer]
		: firstValidServer;

	const resumeEpSlug = movie?.watchProgress?.episodeSlug;
	const resumeServer = preferredServer;
	let resumeEp = preferredServer?.server_data.find(isValidEp);

	if (resumeEpSlug) {
		// Try to find the resume episode in the preferred server first
		const foundInPreferred = preferredServer?.server_data.find(
			(e) => e.slug === resumeEpSlug && isValidEp(e),
		);
		if (foundInPreferred) {
			resumeEp = foundInPreferred;
		} else {
			// Fall back: find the episode slug in any server, then mirror to preferred server by index
			let resumeEpIndex = -1;
			for (const s of episodes) {
				const idx = s.server_data.findIndex(
					(e) => e.slug === resumeEpSlug && isValidEp(e),
				);
				if (idx !== -1) {
					resumeEpIndex = idx;
					break;
				}
			}
			if (resumeEpIndex !== -1 && preferredServer) {
				resumeEp =
					preferredServer.server_data[resumeEpIndex] ??
					preferredServer.server_data.find(isValidEp);
			}
		}
	}

	const isMultiEpisodeMovie = movie?.type !== "single";

	const tmdbRating =
		tmdbDetails.data?.voteAverage ?? detail?.tmdb?.vote_average;
	const tmdbCount = tmdbDetails.data?.voteCount ?? detail?.tmdb?.vote_count;
	const imdbRating = detail?.imdb?.vote_average;

	const tmdbOverview = tmdbDetails.data?.overview ?? null;
	const tagline = tmdbDetails.data?.tagline ?? null;
	const ageRating = tmdbDetails.data?.rating ?? null;

	useEffect(() => {
		if (movie?.slug && ageRating) {
			onRatingResolved?.(movie.slug, ageRating);
		}
	}, [movie?.slug, ageRating, onRatingResolved]);

	const handleBrowseGenre = (cat: OphimCategory) => {
		onBrowseGenre({ _id: cat.id, name: cat.name, slug: cat.slug });
		onClose();
	};

	const handleBrowseCountry = (country: OphimCountry) => {
		onBrowseCountry({
			_id: country.id,
			name: country.name,
			slug: country.slug,
		});
		onClose();
	};

	const handleBrowseYear = (year: number) => {
		onBrowseYear({ _id: String(year), name: String(year), slug: String(year) });
		onClose();
	};

	const tmdbTrailerUrl = tmdbDetails.data?.trailerEmbedUrl || "";
	const kkphimTrailerUrl =
		movie && detail?.trailer_url ? getTrailerEmbedUrl(detail.trailer_url) : "";
	const trailerEmbedUrl = tmdbTrailerUrl || kkphimTrailerUrl;
	const trailerSrcFailed =
		failedTrailerSlug === movie?.slug &&
		Boolean(tmdbTrailerUrl) &&
		Boolean(kkphimTrailerUrl);
	const effectiveIframeUrl =
		trailerSrcFailed && kkphimTrailerUrl ? kkphimTrailerUrl : trailerEmbedUrl;

	useEffect(() => {
		if (
			!trailerActive ||
			!tmdbTrailerUrl ||
			!kkphimTrailerUrl ||
			trailerSrcFailed
		)
			return;
		const handler = (event: MessageEvent) => {
			try {
				const data =
					typeof event.data === "string" ? JSON.parse(event.data) : event.data;
				const errorCode =
					data?.event === "infoDelivery"
						? data?.info?.error
						: data?.event === "onError"
							? data?.info
							: null;
				if (errorCode != null) setFailedTrailerSlug(movie?.slug ?? null);
			} catch {
				// not a YouTube message
			}
		};
		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, [
		trailerActive,
		tmdbTrailerUrl,
		kkphimTrailerUrl,
		trailerSrcFailed,
		movie?.slug,
	]);

	// Detect video end via postMessage events (onStateChange=0) + polling fallback.
	useEffect(() => {
		if (!trailerActive) return;

		let endTimer: ReturnType<typeof setTimeout> | null = null;
		let ended = false;

		const triggerEnd = () => {
			if (ended) return;
			ended = true;
			dispatchTrailer({ type: "end" });
			endTimer = setTimeout(() => {
				dispatchTrailer({ type: "stop" });
			}, 2000);
		};

		// Subscribe to YouTube events via postMessage
		const subscribeAndListen = () => {
			trailerIframeRef.current?.contentWindow?.postMessage(
				JSON.stringify({ event: "listening" }),
				"*",
			);
		};

		const handler = (event: MessageEvent) => {
			try {
				const data =
					typeof event.data === "string" ? JSON.parse(event.data) : event.data;
				// state 0 = ended, state -1 = unstarted (skip), 1 = playing, 2 = paused
				if (data?.event === "onStateChange" && data?.info === 0) {
					triggerEnd();
				}
				// Fallback: infoDelivery currentTime reaches duration
				if (data?.event === "infoDelivery" && data?.info) {
					const { currentTime, duration } = data.info;
					if (duration > 0 && currentTime > 0 && duration - currentTime < 1.2) {
						triggerEnd();
					}
				}
			} catch {
				// not a YouTube message
			}
		};

		window.addEventListener("message", handler);

		// Re-send listening subscription periodically so YouTube keeps pushing events
		const pollInterval = setInterval(() => {
			subscribeAndListen();
		}, 500);

		return () => {
			window.removeEventListener("message", handler);
			clearInterval(pollInterval);
			if (endTimer) clearTimeout(endTimer);
		};
	}, [trailerActive]);

	// Auto-unmute: start muted so autoplay is allowed, then unmute after a short delay.
	// Using a timeout instead of YouTube postMessage events because the iframe loads
	// before trailerActive=true, so the playing event fires before our listener is registered.
	useEffect(() => {
		if (!trailerActive) return;
		const timer = setTimeout(() => {
			if (trailerAutoUnmutedRef.current) return;
			trailerAutoUnmutedRef.current = true;
			trailerIframeRef.current?.contentWindow?.postMessage(
				JSON.stringify({ event: "command", func: "unMute", args: [] }),
				"*",
			);
			dispatchTrailer({ type: "setMuted", value: false });
		}, 1500);
		return () => clearTimeout(timer);
	}, [trailerActive]);

	useEffect(() => {
		const handleFullscreenChange = () =>
			setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () =>
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	useEffect(() => {
		if (!movie?.slug) return;
		heroRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
	}, [movie?.slug]);

	useEffect(() => {
		trailerDismissedRef.current = false;
		trailerHasPlayedRef.current = false;
		trailerAutoUnmutedRef.current = false;
		dispatchTrailer({ type: "reset" });

		if (trailerCountdownIntervalRef.current) {
			clearTimeout(trailerCountdownIntervalRef.current);
			trailerCountdownIntervalRef.current = null;
		}

		if (!trailerEmbedUrl) return;

		trailerHasPlayedRef.current = true;

		// Start iframe immediately so audio plays, then show trailer over info after 5s
		dispatchTrailer({ type: "start" });

		trailerCountdownIntervalRef.current = setTimeout(() => {
			const height = heroRef.current
				? Math.round((heroRef.current.offsetWidth * 9) / 16)
				: null;
			dispatchTrailer({ type: "show", height });
		}, 5000);

		return () => {
			if (trailerCountdownIntervalRef.current) {
				clearTimeout(trailerCountdownIntervalRef.current);
				trailerCountdownIntervalRef.current = null;
			}
			dispatchTrailer({ type: "stop" });
		};
	}, [trailerEmbedUrl]);

	const stopTrailer = useCallback(() => {
		if (trailerActive) {
			trailerIframeRef.current?.contentWindow?.postMessage(
				JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
				"*",
			);
			dispatchTrailer({ type: "setPaused", value: true });
		}
		if (autoPlayTimerRef.current) {
			clearTimeout(autoPlayTimerRef.current);
			autoPlayTimerRef.current = null;
		}
	}, [trailerActive]);
	const stopTrailerRef = useRef(stopTrailer);
	stopTrailerRef.current = stopTrailer;

	const handlePlayEpisode = (
		m: OphimMovieItem,
		d: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => {
		stopTrailer();
		onPlayEpisode(m, { ...d, episodes }, server, ep);
	};

	useEffect(() => {
		const m = movieRef.current;
		if (!autoPlay || !m || !episodes.length) return;
		const server = episodes.find((s) => s.server_data.some(isValidEp));
		const ep = server?.server_data.find(isValidEp);
		if (server && ep && detail) {
			stopTrailerRef.current();
			onPlayEpisodeRef.current(m, { ...detail, episodes }, server, ep);
		}
	}, [autoPlay, episodes.length, detail, episodes.find, episodes]);

	const trailerPending = false;

	const episodeCurrent = detail?.episode_current ?? movie?.episode_current;
	const episodeTotal = detail?.episode_total ?? movie?.episode_total;
	const hasTapWord = /tập/i.test(String(episodeTotal));

	return (
		<>
			<Dialog
				open={Boolean(movie)}
				onClose={onClose}
				fullWidth
				fullScreen={isMobile}
				maxWidth="lg"
				scroll="body"
				TransitionComponent={Grow}
				TransitionProps={{ timeout: 300 }}
				sx={{
					"& .MuiDialog-paper": {
						transformOrigin: "center center",
					},
				}}
			>
				{movie && (
					<>
						<MovieHeroSection
							movie={movie}
							heroRef={heroRef}
							trailerIframeRef={trailerIframeRef}
							trailerState={trailerState}
							dispatchTrailer={dispatchTrailer}
							trailerEmbedUrl={trailerEmbedUrl}
							effectiveIframeUrl={effectiveIframeUrl}
							trailerDismissedRef={trailerDismissedRef}
							isFullscreen={isFullscreen}
							heroImageUrl={heroImageUrl}
							posterImageUrl={posterImageUrl}
							tmdbRating={tmdbRating}
							tmdbCount={tmdbCount}
							tmdbDetails={tmdbDetails}
							imdbRating={imdbRating}
							detail={detail}
							episodes={episodes}
							hasValidEpisodes={hasValidEpisodes}
							resumeServer={resumeServer}
							resumeEp={resumeEp}
							tagline={tagline}
							categories={categories}
							countries={countries}
							ageRating={ageRating}
							liked={liked}
							episodeCurrent={episodeCurrent}
							isMultiEpisodeMovie={isMultiEpisodeMovie}
							episodeTotal={episodeTotal}
							hasTapWord={hasTapWord}
							isMobile={isMobile}
							autoPlayTimerRef={autoPlayTimerRef}
							trailerCountdownIntervalRef={trailerCountdownIntervalRef}
							trailerAutoUnmutedRef={trailerAutoUnmutedRef}
							isLoading={detailQuery.isFetching}
							onClose={onClose}
							onLike={onLike}
							handleBrowseGenre={handleBrowseGenre}
							handleBrowseCountry={handleBrowseCountry}
							handleBrowseYear={handleBrowseYear}
							handlePlayEpisode={handlePlayEpisode}
						/>

						<DialogContent dividers ref={dialogContentRef}>
							{detailQuery.isFetching ? (
								<Box>
									<Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
										{[80, 56, 64, 72, 48].map((w) => (
											<Skeleton
												key={w}
												variant="rounded"
												width={w}
												height={20}
												sx={{ borderRadius: 10 }}
											/>
										))}
									</Stack>
									<Skeleton
										variant="text"
										width="30%"
										height={16}
										sx={{ mb: 0.5 }}
									/>
									<Skeleton variant="text" width="100%" height={14} />
									<Skeleton variant="text" width="95%" height={14} />
									<Skeleton
										variant="text"
										width="80%"
										height={14}
										sx={{ mb: 2 }}
									/>
									<Skeleton
										variant="rounded"
										width={148}
										height={42}
										sx={{ borderRadius: 1.5, mb: 2 }}
									/>
								</Box>
							) : (
								<Fade in timeout={200}>
									<Box>
										<Stack
											spacing={0.5}
											sx={{ mb: formattedDuration ? 1.5 : 0 }}
										>
											{formattedDuration && (
												<Stack direction="row" spacing={0.5}>
													<Typography variant="caption" color="text.secondary">
														Thời lượng:
													</Typography>
													<Typography
														variant="caption"
														sx={{ color: "primary.main", fontWeight: 600 }}
													>
														{formattedDuration}
													</Typography>
												</Stack>
											)}
										</Stack>

										<MovieCastSection
											tmdbDirectors={tmdbDetails.data?.directors ?? []}
											tmdbCast={tmdbDetails.data?.cast ?? []}
											kkDirectors={(detail?.director ?? []).filter(Boolean)}
											kkActors={(detail?.actor ?? []).filter(Boolean)}
											onPersonClick={(id) => setSelectedPersonId(id)}
										/>

										{(tagline || tmdbOverview || detail?.content) && (
											<Box sx={{ mb: 2 }}>
												{tagline && (
													<Typography
														variant="body2"
														sx={{
															fontStyle: "italic",
															mb: 1.5,
															color: "text.secondary",
														}}
													>
														{tagline}
													</Typography>
												)}
												{(tmdbOverview || detail?.content) && (
													<Typography variant="body2" sx={{ lineHeight: 1.7 }}>
														{tmdbOverview ??
															detail?.content?.replace(/<[^>]*>/g, "")}
													</Typography>
												)}
											</Box>
										)}
										{episodes.length > 0 && (
											<Stack
												direction="row"
												spacing={1.5}
												flexWrap="wrap"
												useFlexGap
												sx={{ mb: 2 }}
											>
												{trailerPending ? (
													<Skeleton
														variant="rounded"
														width={148}
														height={42}
														sx={{ borderRadius: 1.5 }}
													/>
												) : (
													<Tooltip
														title={
															!hasValidEpisodes ? "Phim chưa có tập nào" : ""
														}
													>
														<span>
															<Button
																variant="contained"
																size="large"
																startIcon={<PlayArrowIcon />}
																disabled={!hasValidEpisodes}
																onClick={() => {
																	if (!detail || !resumeServer || !resumeEp)
																		return;
																	handlePlayEpisode(
																		movie,
																		detail,
																		resumeServer,
																		resumeEp,
																	);
																}}
																sx={{ fontWeight: 800, px: 4 }}
															>
																{hasValidEpisodes
																	? movie.watchProgress &&
																		!movie.watchProgress.completed
																		? "Tiếp tục"
																		: "Xem ngay"
																	: "Sắp chiếu"}
															</Button>
														</span>
													</Tooltip>
												)}
											</Stack>
										)}
										{hasValidEpisodes &&
											(isMultiEpisodeMovie || episodes.length > 1) && (
												<Box>
													<Divider sx={{ mb: 1.5 }} />
													<MovieEpisodeList
														movie={movie}
														detail={detail}
														episodes={episodes}
														activeEpisodes={activeEpisodes}
														currentServer={currentServer}
														selectedServer={selectedServer}
														setSelectedServer={setSelectedServer}
														episodesExpanded={episodesExpanded}
														setEpisodesExpanded={setEpisodesExpanded}
														isTMDBSeries={isTMDBSeries}
														totalSeasons={totalSeasons}
														activeSeason={activeSeason}
														setActiveSeason={setActiveSeason}
														tmdbSeasonName={tmdbSeasonName}
														tmdbEpisodes={tmdbEpisodes}
														tmdbEpisodesLoading={tmdbEpisodesLoading}
														isMultiEpisodeMovie={isMultiEpisodeMovie}
														activeSeasonProgressMap={activeSeasonProgressMap}
														activeSeasonSlug={activeSeasonSlug}
														activeSeasonQuery={activeSeasonQuery}
														playingSeason={playingSeason}
														handlePlayEpisode={handlePlayEpisode}
													/>
												</Box>
											)}
										{detailQuery.isError && (
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography color="error" variant="body2">
													Không tải được chi tiết phim.
												</Typography>
												<Button
													size="small"
													startIcon={<RefreshIcon />}
													onClick={() => void detailQuery.refetch()}
												>
													Thử lại
												</Button>
											</Stack>
										)}

										{/* Similar content */}
										{(similarQuery.data?.length ?? 0) > 0 && (
											<MovieSimilarSection
												movies={similarQuery.data ?? []}
												certRatings={similarCertRatings}
												onShowInfo={onShowInfo}
												onPlayAndOpen={onPlayAndOpen}
											/>
										)}
									</Box>
								</Fade>
							)}
						</DialogContent>
					</>
				)}
			</Dialog>

			<PersonDialog
				personId={selectedPersonId}
				onClose={() => setSelectedPersonId(null)}
			/>
		</>
	);
};
