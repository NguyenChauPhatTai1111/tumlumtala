import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ScreenRotationIcon from "@mui/icons-material/ScreenRotation";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeMuteIcon from "@mui/icons-material/VolumeMute";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
	Box,
	Dialog,
	DialogContent,
	IconButton,
	Slider,
	Stack,
	Tooltip,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import type { OphimEpisodeData, OphimEpisodeServer } from "@pages/movie/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Hls from "hls.js";
import React, {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Transition } from "react-transition-group";
import type {
	TransitionProps,
	TransitionStatus,
} from "react-transition-group/Transition";
import {
	getCachedEpisodes,
	getEpisodePositions,
	updateWatchPosition,
	upsertCachedEpisodes,
	upsertCachedSeasons,
} from "@/services/movieBackendService";
import { getMovieDetail } from "@/services/movieService";
import type { TMDBEpisode } from "@/services/tmdbService";
import { getTMDBSeason } from "@/services/tmdbService";
import { EpisodePanel } from "./EpisodePanel";
import { EpisodePopover } from "./EpisodePopover";
import { PlayerCenterControls } from "./PlayerCenterControls";
import { PlayerSpeedMenu } from "./PlayerSpeedMenu";
import { PlayerTimeline } from "./PlayerTimeline";
import { PlayerTopBar } from "./PlayerTopBar";
import { RatingBanner } from "./RatingBanner";

const ENTER_DURATION = 2000;
const EXIT_DURATION = 400;

const NetflixTransition = forwardRef<
	unknown,
	TransitionProps & { children: React.ReactElement }
>(({ children, in: inProp, timeout: _timeout, ...props }, ref) => {
	return (
		<Transition
			in={inProp}
			timeout={{ enter: ENTER_DURATION, exit: EXIT_DURATION }}
			unmountOnExit
			mountOnEnter
			nodeRef={ref as React.RefObject<HTMLElement>}
			{...props}
		>
			{(state: TransitionStatus) =>
				React.cloneElement(children, {
					ref,
					style: {
						...children.props.style,
						animation:
							state === "entering"
								? `netflixEnter ${ENTER_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`
								: state === "exiting"
									? `netflixExit ${EXIT_DURATION}ms cubic-bezier(0.4, 0, 1, 1) forwards`
									: undefined,
					},
				})
			}
		</Transition>
	);
});
NetflixTransition.displayName = "NetflixTransition";

const isValidEp = (ep: OphimEpisodeData) =>
	Boolean(ep.link_embed || ep.link_m3u8 || ep.slug);

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
export const SEEK_SECONDS = 30;
const MILESTONES = [0.05, 0.1, 0.15, 0.2];


function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
	if (muted || volume === 0) return <VolumeOffIcon fontSize="small" />;
	if (volume < 0.33) return <VolumeMuteIcon fontSize="small" />;
	if (volume < 0.66) return <VolumeDownIcon fontSize="small" />;
	return <VolumeUpIcon fontSize="small" />;
}

export const VideoPlayerDialog = ({
	open,
	title,
	embedUrl,
	m3u8Url,
	rawM3u8Url,
	onClose,
	episodes,
	currentEpSlug,
	onPlayEpisode,
	onPlayTMDBEpisode,
	movieSlug,
	lastWatchedPosition,
	ageRating,
	categories,
	tmdb,
	episodeProgressMap,
}: {
	open: boolean;
	title: string;
	embedUrl: string;
	m3u8Url?: string;
	rawM3u8Url?: string;
	onClose: () => void;
	episodes?: OphimEpisodeServer[];
	currentEpSlug?: string;
	onPlayEpisode?: (server: OphimEpisodeServer, ep: OphimEpisodeData) => void;
	onPlayTMDBEpisode?: (
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
		seasonSlug: string,
		tmdbEpName: string,
	) => void;
	movieSlug?: string;
	lastWatchedPosition?: number;
	ageRating?: string | null;
	categories?: { id: string; name: string; slug: string }[];
	tmdb?: { type?: string; id?: string | null; season?: number } | null;
	episodeProgressMap?: Map<string, { position: number; duration: number }>;
}) => {
	const theme = useTheme();
	const useNativePlayer = Boolean(m3u8Url);

	const validServers = useMemo(
		() => (episodes ?? []).filter((s) => s.server_data.some(isValidEp)),
		[episodes],
	);
	const hasMultipleServers = validServers.length > 1;

	const [panelOpen, setPanelOpen] = useState(false);
	const [selectedServer, setSelectedServer] = useState(0);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isLandscape, setIsLandscape] = useState(false);
	const [overlayVisible, setOverlayVisible] = useState(true);

	// Native player state
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const [speed, setSpeed] = useState(1);
	const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
	const [_episodePopoverOpen, _setEpisodePopoverOpen] = useState(false);
	const [nextEpPopoverOpen, setNextEpPopoverOpen] = useState(false);
	const [prevEpPopoverOpen, setPrevEpPopoverOpen] = useState(false);
	const [_seeking, setSeeking] = useState(false);
	const seekingRef = useRef(false);
	const [buffered, setBuffered] = useState(0);
	const [buffering, setBuffering] = useState(false);
	// bumped when <video> element mounts so event-listener effect re-runs
	const [_videoMounted, setVideoMounted] = useState(0);
	const [ratingBannerVisible, setRatingBannerVisible] = useState(false);
	const ratingBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [_streamError, _setStreamError] = useState<string | null>(null);

	// TMDB season panel state
	const isTMDBSeries = tmdb?.type === "tv" && Boolean(tmdb?.id);
	const totalSeasons = tmdb?.season ?? 1;
	// Strip any trailing -phan-N suffix so we always have the root slug
	const baseMovieSlug = movieSlug?.replace(/-phan-\d+$/, "") ?? "";
	// Season currently playing — derived from movieSlug, never changes by user selection
	const playingSeason = Number(movieSlug?.match(/-phan-(\d+)$/)?.[1] ?? 1);

	const queryClient = useQueryClient();
	const episodePositionsQuery = useQuery({
		queryKey: ["movie", "episode-positions", baseMovieSlug],
		queryFn: () => getEpisodePositions(baseMovieSlug),
		enabled: Boolean(open && baseMovieSlug),
		staleTime: 0,
	});
	// Season currently shown in the panel — can differ from playingSeason after user switches
	const [activeSeason, setActiveSeason] = useState(playingSeason);

	// Build progress map from API data, filtered to the season currently shown in panel
	const activeEpisodeProgressMap = useMemo(() => {
		const rows = episodePositionsQuery.data ?? [];
		if (rows.length > 0) {
			const seasonSlug =
				activeSeason === playingSeason
					? (movieSlug ?? baseMovieSlug)
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
		movieSlug,
		baseMovieSlug,
		episodeProgressMap,
	]);
	const [seasonSelectorOpen, setSeasonSelectorOpen] = useState(false);
	const [tmdbEpisodes, setTmdbEpisodes] = useState<TMDBEpisode[]>([]);
	const tmdbEpisodesRef = useRef<TMDBEpisode[]>([]);
	tmdbEpisodesRef.current = tmdbEpisodes;
	const [tmdbLoading, setTmdbLoading] = useState(false);
	const [tmdbSeasonName, setTmdbSeasonName] = useState("");
	// Tracks which seasons have already been saved to DB cache in this session
	const savedSeasonsRef = useRef<Set<string>>(new Set());
	// Tracks which seasons were loaded from real TMDB API (not fallback) — guard for DB upsert
	const tmdbLoadedRef = useRef<Set<number>>(new Set());
	// Selected server index in TMDB series panel
	const [selectedTMDBServer, setSelectedTMDBServer] = useState(0);
	// Available KK servers for the active season (populated after KKPhim fetch)
	const [kkActiveServers, setKkActiveServers] = useState<OphimEpisodeServer[]>(
		[],
	);

	const videoBoxRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const hlsRef = useRef<Hls | null>(null);
	const startHlsRef = useRef<
		| ((video: HTMLVideoElement, src: string, isFallback?: boolean) => void)
		| null
	>(null);
	const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentEpRef = useRef<HTMLDivElement>(null);
	const speedMenuRef = useRef<HTMLDivElement>(null);
	// track latest m3u8 so callback ref can start HLS when element mounts
	const pendingM3u8Ref = useRef<string>("");
	const pendingRawM3u8Ref = useRef<string>("");
	// track whether we've already seeked to lastWatchedPosition for this episode
	const seekedToPositionRef = useRef(false);
	const firedMilestonesRef = useRef<Set<number>>(new Set());
	const lastWatchedPositionRef = useRef(lastWatchedPosition);
	lastWatchedPositionRef.current = lastWatchedPosition;

	const currentServer = validServers[selectedServer];
	const validEpisodes = currentServer?.server_data.filter(isValidEp) ?? [];

	const flatEps = useMemo(
		() =>
			validServers.flatMap((server) =>
				server.server_data.filter(isValidEp).map((ep) => ({ server, ep })),
			),
		[validServers],
	);
	// unique episode count by slug — multiple servers with same episode slugs still count as 1 ep
	const uniqueEpCount = useMemo(() => {
		const seen = new Set<string>();
		for (const { ep } of flatEps) seen.add(ep.slug);
		return seen.size;
	}, [flatEps]);
	const hasMultipleEpisodes = uniqueEpCount > 1;
	const currentFlatIdx = flatEps.findIndex((x) => x.ep.slug === currentEpSlug);
	const hasPrev = currentFlatIdx > 0;
	const hasNext = currentFlatIdx >= 0 && currentFlatIdx < flatEps.length - 1;
	const totalEps = uniqueEpCount;
	const currentEpNum = currentFlatIdx >= 0 ? currentFlatIdx + 1 : null;

	// Core: attach HLS to a video element and start playback
	const startHls = useCallback(
		(video: HTMLVideoElement, src: string, isFallback = false) => {
			// destroy previous instance
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
			video.currentTime = 0;
			setCurrentTime(0);
			setDuration(0);
			setPlaying(false);
			setBuffered(0);

			const syncVideoSnapshot = (v: HTMLVideoElement) => {
				setPlaying(!v.paused && !v.ended);
				if (!seekingRef.current) setCurrentTime(v.currentTime || 0);
				if (v.buffered.length > 0) {
					setBuffered(v.buffered.end(v.buffered.length - 1));
				}
				if (Number.isFinite(v.duration) && v.duration > 0) {
					setDuration(v.duration);
				}
				setVolume(v.volume);
				setMuted(v.muted);
				setSpeed(v.playbackRate);
			};

			const setManifestDuration = (value?: number) => {
				if (Number.isFinite(value) && value && value > 0) {
					setDuration(value);
				}
			};

			const tryPlay = (v: HTMLVideoElement) => {
				v.play()
					.then(() => syncVideoSnapshot(v))
					.catch((err: unknown) => {
						// NotAllowedError = autoplay blocked → retry muted once
						if (err instanceof DOMException && err.name === "NotAllowedError") {
							v.muted = true;
							v.play()
								.then(() => syncVideoSnapshot(v))
								.catch(() => syncVideoSnapshot(v));
							return;
						}
						syncVideoSnapshot(v);
					});
			};

			if (Hls.isSupported()) {
				const hls = new Hls({
					autoStartLoad: true,
					startLevel: -1,
					enableWorker: true,
				});
				hlsRef.current = hls;
				hls.loadSource(src);
				hls.attachMedia(video);
				hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
					setManifestDuration(data.levels?.[0]?.details?.totalduration);
					tryPlay(video);
				});
				hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
					setManifestDuration(data.details?.totalduration);
					syncVideoSnapshot(video);
				});
				hls.on(Hls.Events.ERROR, (_evt, data) => {
					if (data.fatal && !isFallback) {
						const fallback = rawM3u8Url ?? pendingRawM3u8Ref.current;
						if (fallback && fallback !== src) {
							hls.destroy();
							hlsRef.current = null;
							startHlsRef.current?.(video, fallback, true);
						}
					}
				});
			} else if (video.canPlayType("application/vnd.apple.mpegurl")) {
				// Safari native HLS
				video.src = src;
				video.load();
				const onMeta = () => {
					syncVideoSnapshot(video);
					tryPlay(video);
				};
				video.addEventListener("loadedmetadata", onMeta, { once: true });
			}
		},
		[rawM3u8Url],
	);
	startHlsRef.current = startHls;

	// Callback ref: fires when <video> element is mounted/unmounted
	const setVideoRef = useCallback(
		(el: HTMLVideoElement | null) => {
			videoRef.current = el;
			if (el) {
				setVideoMounted((n) => n + 1); // trigger event-listener effect
				if (pendingM3u8Ref.current) {
					startHls(el, pendingM3u8Ref.current);
				}
			}
		},
		[startHls],
	);

	// Auto-hide overlay
	const resetOverlayTimer = useCallback(() => {
		setOverlayVisible(true);
		if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
		overlayTimerRef.current = setTimeout(() => setOverlayVisible(false), 3300);
	}, []);

	const toggleFullscreen = useCallback(() => {
		if (isFullscreen) {
			document.exitFullscreen();
		} else {
			videoBoxRef.current?.requestFullscreen();
		}
	}, [isFullscreen]);

	const toggleRotate = useCallback(() => {
		const orientation = screen.orientation as ScreenOrientation & {
			lock?: (o: string) => Promise<void>;
		};
		if (!orientation?.lock) return;
		if (isLandscape) {
			orientation.lock("portrait").catch(() => null);
			setIsLandscape(false);
		} else {
			orientation.lock("landscape").catch(() => null);
			setIsLandscape(true);
		}
	}, [isLandscape]);

	const togglePlayPause = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) void video.play().catch(() => null);
		else video.pause();
	}, []);

	const handleSeek = (_: unknown, value: number | number[]) => {
		const val = Array.isArray(value) ? value[0] : value;
		setCurrentTime(val);
		if (videoRef.current) videoRef.current.currentTime = val;
	};

	const handleSeekStart = () => {
		seekingRef.current = true;
		setSeeking(true);
	};
	const handleSeekEnd = (_: unknown, value: number | number[]) => {
		seekingRef.current = false;
		setSeeking(false);
		const val = Array.isArray(value) ? value[0] : value;
		if (videoRef.current) videoRef.current.currentTime = val;
		savePosition();
	};

	const handleVolumeChange = (_: unknown, value: number | number[]) => {
		const val = Array.isArray(value) ? value[0] : value;
		if (videoRef.current) {
			videoRef.current.volume = val;
			videoRef.current.muted = val === 0;
		}
	};

	const toggleMute = useCallback(() => {
		if (videoRef.current) {
			videoRef.current.muted = !videoRef.current.muted;
		}
	}, []);

	const seek = useCallback(
		(delta: number) => {
			const video = videoRef.current;
			if (!video) return;
			video.currentTime = Math.max(
				0,
				Math.min(duration, video.currentTime + delta),
			);
		},
		[duration],
	);

	const setPlaybackSpeed = (s: number) => {
		if (videoRef.current) videoRef.current.playbackRate = s;
		setSpeed(s);
		setSpeedMenuOpen(false);
	};

	const handlePrev = () => {
		if (!hasPrev) return;
		const { server, ep } = flatEps[currentFlatIdx - 1];
		onPlayEpisode?.(server, ep);
	};

	const handleNext = () => {
		if (!hasNext) return;
		const { server, ep } = flatEps[currentFlatIdx + 1];
		onPlayEpisode?.(server, ep);
	};

	const savePositionAndRefresh = useCallback(
		(slug: string, epSlug: string, pos: number, dur: number) => {
			void updateWatchPosition(slug, epSlug, pos, dur)
				.then(() => {
					const base = slug.replace(/-phan-\d+$/, "");
					void queryClient.invalidateQueries({
						queryKey: ["movie", "episode-positions", base],
					});
				})
				.catch(() => {});
		},
		[queryClient],
	);

	const savePosition = useCallback(() => {
		const video = videoRef.current;
		if (!video || !movieSlug || !currentEpSlug) return;
		const pos = video.currentTime;
		const dur = video.duration;
		if (pos > 5) {
			savePositionAndRefresh(
				movieSlug,
				currentEpSlug,
				pos,
				Number.isFinite(dur) ? dur : 0,
			);
		}
	}, [movieSlug, currentEpSlug, savePositionAndRefresh]);

	const handleClose = () => {
		setPanelOpen(false);
		if (videoRef.current) {
			videoRef.current.pause();
			savePosition();
		}
		onClose();
	};

	// Hide rating banner when dialog closes; actual show logic is in the play event handler below
	useEffect(() => {
		if (!open) {
			setRatingBannerVisible(false);
			if (ratingBannerTimerRef.current)
				clearTimeout(ratingBannerTimerRef.current);
		}
	}, [open]);

	// When m3u8Url or open changes, (re)start HLS
	useEffect(() => {
		pendingM3u8Ref.current = m3u8Url ?? "";
		pendingRawM3u8Ref.current = rawM3u8Url ?? "";
		seekedToPositionRef.current = false;
		firedMilestonesRef.current = new Set();
		setRatingBannerVisible(false);
		if (ratingBannerTimerRef.current)
			clearTimeout(ratingBannerTimerRef.current);

		if (!open || !m3u8Url) {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
			setPlaying(false);
			setCurrentTime(0);
			setDuration(0);
			setBuffered(0);
			return;
		}

		// If <video> is already mounted, start immediately
		if (videoRef.current) {
			startHls(videoRef.current, m3u8Url);
		}
		// Otherwise setVideoRef callback will fire startHls once element mounts

		return () => {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
		};
	}, [m3u8Url, rawM3u8Url, open, startHls]);

	// Seek whenever lastWatchedPosition changes to a valid value
	useEffect(() => {
		seekedToPositionRef.current = false; // allow durationchange to seek if video not ready
		const video = videoRef.current;

		if (!lastWatchedPosition || lastWatchedPosition <= 5) {
			if (video) video.currentTime = 0;
			setCurrentTime(0);
			return;
		}

		if (
			video &&
			video.duration > 0 &&
			lastWatchedPosition < video.duration - 10
		) {
			seekedToPositionRef.current = true;
			video.currentTime = lastWatchedPosition;
			setCurrentTime(lastWatchedPosition);
		}
	}, [lastWatchedPosition]);

	// Video event listeners — re-run when the <video> element mounts (videoMounted bump)
	useEffect(() => {
		if (!useNativePlayer) return;
		const video = videoRef.current;
		if (!video) return;

		// Sync initial state in case events fired before effect attachment
		setPlaying(!video.paused && !video.ended);
		setCurrentTime(video.currentTime);
		if (Number.isFinite(video.duration) && video.duration > 0) {
			setDuration(video.duration);
		}
		if (video.buffered.length > 0)
			setBuffered(video.buffered.end(video.buffered.length - 1));

		const onPlay = () => {
			setPlaying(true);
			resetOverlayTimer();
			if (ageRating || (categories && categories.length > 0)) {
				setRatingBannerVisible(true);
				if (ratingBannerTimerRef.current)
					clearTimeout(ratingBannerTimerRef.current);
				ratingBannerTimerRef.current = setTimeout(
					() => setRatingBannerVisible(false),
					10000,
				);
			}
		};
		const onPlaying = () => {
			setPlaying(true);
			setBuffering(false);
			if (Number.isFinite(video.duration) && video.duration > 0) {
				setDuration(video.duration);
			}
		};
		const onPause = () => {
			setPlaying(false);
			// clear auto-hide timer so controls stay visible while paused
			if (overlayTimerRef.current) {
				clearTimeout(overlayTimerRef.current);
				overlayTimerRef.current = null;
			}
			setOverlayVisible(true);
		};
		const onTimeUpdate = () => {
			if (!seekingRef.current) setCurrentTime(video.currentTime);
			if (video.buffered.length > 0) {
				setBuffered(video.buffered.end(video.buffered.length - 1));
			}
			const dur = video.duration;
			if (Number.isFinite(dur) && dur > 0 && video.paused === false) {
				const pct = video.currentTime / dur;
				for (const m of MILESTONES) {
					if (pct >= m && !firedMilestonesRef.current.has(m)) {
						firedMilestonesRef.current.add(m);
						savePositionAndRefresh(
							movieSlug ?? "",
							currentEpSlug ?? "",
							video.currentTime,
							dur,
						);
						break;
					}
				}
			}
		};
		const onLoadedMetadata = () => {
			if (Number.isFinite(video.duration) && video.duration > 0) {
				setDuration(video.duration);
			}
			if (!seekingRef.current) setCurrentTime(video.currentTime);
		};
		const onDurationChange = () => {
			if (Number.isFinite(video.duration) && video.duration > 0) {
				setDuration(video.duration);
			}
			// Seek to last watched position once when duration becomes available
			const pos = lastWatchedPositionRef.current;
			if (
				!seekedToPositionRef.current &&
				pos &&
				pos > 5 &&
				video.duration > 0 &&
				pos < video.duration - 10
			) {
				seekedToPositionRef.current = true;
				video.currentTime = pos;
				setCurrentTime(pos);
			}
		};
		const onVolumeChange = () => {
			setVolume(video.volume);
			setMuted(video.muted);
		};
		const onRateChange = () => setSpeed(video.playbackRate);
		const onWaiting = () => {
			if (!video.paused) setBuffering(true);
		};
		const onStalled = () => setBuffering(true);
		const onCanPlay = () => setBuffering(false);
		const onEnded = () => {
			setPlaying(false);
			setBuffering(false);
			setOverlayVisible(true);
		};

		video.addEventListener("play", onPlay);
		video.addEventListener("playing", onPlaying);
		video.addEventListener("pause", onPause);
		video.addEventListener("timeupdate", onTimeUpdate);
		video.addEventListener("loadedmetadata", onLoadedMetadata);
		video.addEventListener("durationchange", onDurationChange);
		video.addEventListener("volumechange", onVolumeChange);
		video.addEventListener("ratechange", onRateChange);
		video.addEventListener("waiting", onWaiting);
		video.addEventListener("stalled", onStalled);
		video.addEventListener("canplay", onCanPlay);
		video.addEventListener("ended", onEnded);

		return () => {
			video.removeEventListener("play", onPlay);
			video.removeEventListener("playing", onPlaying);
			video.removeEventListener("pause", onPause);
			video.removeEventListener("timeupdate", onTimeUpdate);
			video.removeEventListener("loadedmetadata", onLoadedMetadata);
			video.removeEventListener("durationchange", onDurationChange);
			video.removeEventListener("volumechange", onVolumeChange);
			video.removeEventListener("ratechange", onRateChange);
			video.removeEventListener("waiting", onWaiting);
			video.removeEventListener("stalled", onStalled);
			video.removeEventListener("canplay", onCanPlay);
			video.removeEventListener("ended", onEnded);
		};
	}, [
		useNativePlayer,
		resetOverlayTimer,
		savePositionAndRefresh,
		movieSlug,
		currentEpSlug,
		ageRating,
		categories,
	]);

	// Keyboard shortcuts (only when dialog is open and native player active)
	useEffect(() => {
		if (!open || !useNativePlayer) return;
		const handler = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.code === "Space") {
				e.preventDefault();
				togglePlayPause();
			} else if (e.code === "KeyF") {
				e.preventDefault();
				toggleFullscreen();
			} else if (e.code === "ArrowLeft") {
				e.preventDefault();
				seek(-SEEK_SECONDS);
			} else if (e.code === "ArrowRight") {
				e.preventDefault();
				seek(SEEK_SECONDS);
			} else if (e.code === "ArrowUp") {
				e.preventDefault();
				if (videoRef.current) {
					videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
					videoRef.current.muted = false;
				}
			} else if (e.code === "ArrowDown") {
				e.preventDefault();
				if (videoRef.current) {
					videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
				}
			} else if (e.code === "KeyM") {
				e.preventDefault();
				toggleMute();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		open,
		useNativePlayer,
		togglePlayPause,
		toggleFullscreen,
		toggleMute,
		seek,
	]);

	// Fullscreen change handler
	useEffect(() => {
		const handleFsChange = () => {
			const entering = Boolean(
				videoBoxRef.current &&
					(document.fullscreenElement === videoBoxRef.current ||
						videoBoxRef.current.contains(document.fullscreenElement)),
			);
			setIsFullscreen(entering);
			if (entering) {
				setPanelOpen(false);
			} else {
				setOverlayVisible(true);
			}
		};
		document.addEventListener("fullscreenchange", handleFsChange);
		return () =>
			document.removeEventListener("fullscreenchange", handleFsChange);
	}, []);

	useEffect(() => {
		const el = videoBoxRef.current;
		if (!el) return;
		const handleMouseLeave = () => {
			if (overlayTimerRef.current) {
				clearTimeout(overlayTimerRef.current);
				overlayTimerRef.current = null;
			}
			setOverlayVisible(false);
		};
		el.addEventListener("mousemove", resetOverlayTimer);
		el.addEventListener("mouseenter", resetOverlayTimer);
		el.addEventListener("mouseleave", handleMouseLeave);
		resetOverlayTimer();
		return () => {
			el.removeEventListener("mousemove", resetOverlayTimer);
			el.removeEventListener("mouseenter", resetOverlayTimer);
			el.removeEventListener("mouseleave", handleMouseLeave);
			if (overlayTimerRef.current) {
				clearTimeout(overlayTimerRef.current);
				overlayTimerRef.current = null;
			}
		};
	}, [resetOverlayTimer]);

	// Sync server tab with current episode
	useEffect(() => {
		if (!currentEpSlug || !validServers.length) return;
		const idx = validServers.findIndex((s) =>
			s.server_data.some((ep) => ep.slug === currentEpSlug),
		);
		if (idx < 0) return;
		const t = setTimeout(() => setSelectedServer(idx), 0);
		return () => clearTimeout(t);
	}, [currentEpSlug, validServers]);

	// Scroll current episode into view
	useEffect(() => {
		if (!panelOpen || !currentEpRef.current) return;
		const t = setTimeout(() => {
			currentEpRef.current?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}, 350);
		return () => clearTimeout(t);
	}, [panelOpen]);

	// Close speed menu on outside click
	useEffect(() => {
		if (!speedMenuOpen) return;
		const handler = (e: MouseEvent) => {
			if (
				speedMenuRef.current &&
				!speedMenuRef.current.contains(e.target as Node)
			) {
				setSpeedMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [speedMenuOpen]);

	// Save position when tab/window is closed
	useEffect(() => {
		if (!open || !useNativePlayer) return;
		const handler = () => savePosition();
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [open, useNativePlayer, savePosition]);

	// Refresh episode progress bars whenever the playing episode changes
	useEffect(() => {
		if (!open || !baseMovieSlug) return;
		void queryClient.invalidateQueries({
			queryKey: ["movie", "episode-positions", baseMovieSlug],
		});
	}, [open, baseMovieSlug, queryClient]);

	// Cache KKPhim server_data per season so we don't re-fetch on every ep click
	const kkSeasonCacheRef = useRef<Map<number, OphimEpisodeServer[]>>(new Map());

	// Pre-populate cache only when movieSlug explicitly has -phan-N (season detected from slug)
	const playingSeasonExplicit = Boolean(movieSlug?.match(/-phan-(\d+)$/));
	useEffect(() => {
		if (!isTMDBSeries || !episodes?.length || !playingSeasonExplicit) return;
		kkSeasonCacheRef.current.set(playingSeason, episodes);
	}, [isTMDBSeries, episodes, playingSeason, playingSeasonExplicit]);

	// Fetch TMDB episodes: load from DB cache first, fallback to TMDB API then persist
	useEffect(() => {
		if (!open || !isTMDBSeries || !tmdb?.id || !baseMovieSlug) return;
		let cancelled = false;
		setTmdbLoading(true);
		setTmdbEpisodes([]);

		const load = async () => {
			// Try DB cache first
			try {
				const cached = await getCachedEpisodes(baseMovieSlug, activeSeason);
				if (!cancelled && cached && cached.length > 0) {
					// Reconstruct TMDBEpisode shape from cache for episode list rendering
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
						setTmdbLoading(false);
						return;
					}
				}
			} catch {
				// ignore cache errors, fall through to API
			}

			// Fallback: fetch from TMDB API
			try {
				const tmdbData = await getTMDBSeason(tmdb.id ?? "", activeSeason);
				if (cancelled) return;
				tmdbLoadedRef.current.add(activeSeason);
				setTmdbEpisodes(tmdbData.episodes ?? []);
				setTmdbSeasonName(tmdbData.name || `Phần ${activeSeason}`);
			} catch {
				// TMDB unreachable (e.g. VPN) — fallback to KKPhim episode list
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
				if (!cancelled) setTmdbLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [open, isTMDBSeries, tmdb?.id, baseMovieSlug, activeSeason]);

	// Fetch KKPhim when panel opens or season changes: DB cache → API → persist
	// Sync kkActiveServers from cache when activeSeason changes or panel opens
	useEffect(() => {
		if (!isTMDBSeries) return;
		const cached = kkSeasonCacheRef.current.get(activeSeason);
		const valid = (cached ?? []).filter((s) =>
			s.server_data.some((e) => e.link_m3u8 || e.link_embed),
		);
		setKkActiveServers(valid);
		setSelectedTMDBServer(0);
	}, [activeSeason, isTMDBSeries]);

	useEffect(() => {
		if (!panelOpen || !isTMDBSeries || !baseMovieSlug) return;
		if ((kkSeasonCacheRef.current.get(activeSeason)?.length ?? 0) > 0) return;
		let cancelled = false;

		const seasonSlug = `${baseMovieSlug}-phan-${activeSeason}`;
		const cacheKey = `${baseMovieSlug}:${activeSeason}`;

		const load = async () => {
			// Try DB cache first
			try {
				const cached = await getCachedEpisodes(baseMovieSlug, activeSeason);
				if (!cancelled && cached && cached.length > 0) {
					// Reconstruct OphimEpisodeServer[] from flat cached rows
					const serverMap = new Map<string, typeof cached>();
					for (const ep of cached) {
						if (!serverMap.has(ep.server_name))
							serverMap.set(ep.server_name, []);
						serverMap.get(ep.server_name)?.push(ep);
					}
					const servers = Array.from(serverMap.entries()).map(
						([serverName, eps]) => ({
							server_name: serverName,
							server_data: eps.map((e) => ({
								name: e.episode_name,
								slug: e.episode_slug,
								filename: e.filename,
								link_embed: e.link_embed,
								link_m3u8: e.link_m3u8,
							})),
						}),
					);
					kkSeasonCacheRef.current.set(activeSeason, servers);
					if (!cancelled) {
						const valid = servers.filter((s) =>
							s.server_data.some((e) => e.link_m3u8 || e.link_embed),
						);
						setKkActiveServers(valid);
					}
					return;
				}
			} catch {
				// ignore, fall through
			}

			// Fallback: fetch from KKPhim API
			try {
				let kkData = await getMovieDetail(seasonSlug);
				// Fallback: season 1 đôi khi dùng slug gốc không có -phan-1
				if (activeSeason === 1 && !kkData.episodes?.length) {
					kkData = await getMovieDetail(baseMovieSlug);
				}
				if (cancelled) return;
				if (kkData.episodes?.length) {
					kkSeasonCacheRef.current.set(activeSeason, kkData.episodes);
					const validKK = kkData.episodes.filter((s) =>
						s.server_data.some((e) => e.link_m3u8 || e.link_embed),
					);
					if (!cancelled) setKkActiveServers(validKK);

					// Persist to DB only when TMDB data was successfully loaded this session
					if (
						!savedSeasonsRef.current.has(cacheKey) &&
						tmdbLoadedRef.current.has(activeSeason)
					) {
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
						void upsertCachedEpisodes(
							baseMovieSlug,
							activeSeason,
							episodeInputs,
						);
					}
				}
			} catch {
				// ignore
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [panelOpen, isTMDBSeries, baseMovieSlug, activeSeason]);

	// Sync panel to match playing season whenever the playing movie changes
	useEffect(() => {
		setActiveSeason(playingSeason);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [playingSeason]);

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setPanelOpen(false);
			setSeasonSelectorOpen(false);
			setTmdbEpisodes([]);
			kkSeasonCacheRef.current.clear();
			savedSeasonsRef.current.clear();
			tmdbLoadedRef.current.clear();
		}
	}, [open]);

	const handleTMDBEpisodeClick = useCallback(
		async (ep: TMDBEpisode) => {
			if (!baseMovieSlug) return;

			// Use cached KKPhim data if available, else fetch
			let kkServers = kkSeasonCacheRef.current.get(activeSeason);
			if (!kkServers) {
				const seasonSlug =
					activeSeason === 1
						? baseMovieSlug
						: `${baseMovieSlug}-phan-${activeSeason}`;
				try {
					let kkData = await getMovieDetail(seasonSlug);
					if (activeSeason === 1 && !kkData.episodes?.length) {
						kkData = await getMovieDetail(`${baseMovieSlug}-phan-1`);
					}
					if (kkData.episodes?.length)
						kkSeasonCacheRef.current.set(activeSeason, kkData.episodes);
					kkServers = kkData.episodes ?? [];
				} catch {
					kkServers = [];
				}
			}

			const validKKServers = kkServers.filter((s) =>
				s.server_data.some((e) => e.link_m3u8 || e.link_embed),
			);
			if (!validKKServers.length) return;
			const server = validKKServers[selectedTMDBServer] ?? validKKServers[0];
			if (!server) return;

			// KKPhim slug: "tap-01"; name: "Tập 01" or "01" or "1"
			const padded = String(ep.episode_number).padStart(2, "0");
			const targetEp =
				server.server_data.find((e) => e.slug === `tap-${padded}`) ??
				server.server_data.find((e) => e.slug === `tap-${ep.episode_number}`) ??
				server.server_data.find((e) => e.name === `Tập ${padded}`) ??
				server.server_data.find((e) => e.name === `Tap ${padded}`) ??
				server.server_data.find((e) => e.name === padded) ??
				server.server_data.find((e) => e.name === String(ep.episode_number)) ??
				server.server_data[ep.episode_number - 1] ??
				server.server_data[0];
			if (!targetEp) return;

			const seasonSlug = `${baseMovieSlug}-phan-${activeSeason}`;
			if (onPlayTMDBEpisode) {
				onPlayTMDBEpisode(
					server,
					targetEp,
					seasonSlug,
					String(ep.episode_number),
				);
			} else {
				onPlayEpisode?.(server, targetEp);
			}
			setPanelOpen(false);
		},
		[
			baseMovieSlug,
			activeSeason,
			onPlayEpisode,
			onPlayTMDBEpisode,
			selectedTMDBServer,
		],
	);

	// true khi màn hình < md (tablet/mobile) → double-click seek, desktop → fullscreen
	const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

	// Single-click: toggle overlay. Double-click: fullscreen (desktop) or seek ±30s (touch).
	const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleVideoAreaClick = (side: "left" | "right") => {
		if (clickTimerRef.current) {
			clearTimeout(clickTimerRef.current);
			clickTimerRef.current = null;
			if (isMobileOrTablet) {
				seek(side === "right" ? SEEK_SECONDS : -SEEK_SECONDS);
			} else {
				toggleFullscreen();
			}
			return;
		}
		clickTimerRef.current = setTimeout(() => {
			clickTimerRef.current = null;
			setOverlayVisible((v) => !v);
		}, 230);
	};

	const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

	// hide all overlay controls when episode panel is open
	const controlsOpaque =
		!panelOpen && (overlayVisible || (useNativePlayer && !playing));

	return (
		<Dialog
			open={open}
			onClose={handleClose}
			fullWidth
			fullScreen
			maxWidth="lg"
			TransitionComponent={NetflixTransition}
			transitionDuration={{ enter: ENTER_DURATION, exit: EXIT_DURATION }}
			sx={{
				"@keyframes netflixEnter": {
					"0%": { opacity: 0, transform: "scale(0.08)" },
					"40%": { opacity: 0.7, transform: "scale(0.6)" },
					"75%": { opacity: 1, transform: "scale(1.01)" },
					"100%": { opacity: 1, transform: "scale(1)" },
				},
				"@keyframes netflixExit": {
					"0%": { opacity: 1, transform: "scale(1)" },
					"100%": { opacity: 0, transform: "scale(0.9)" },
				},
				"& .MuiDialog-paper": { display: "flex", flexDirection: "column" },
			}}
		>
			<DialogContent
				sx={{ p: 0, bgcolor: "black", flex: 1, overflow: "hidden" }}
			>
				<Box
					ref={videoBoxRef}
					sx={{
						width: "100%",
						height: "100%",
						position: "relative",
						bgcolor: "black",
						overflow: "hidden",
						userSelect: "none",
						cursor: "pointer",
					}}
					onMouseMove={resetOverlayTimer}
				>
					{/* Click-catchers: only for native player — don't block iframe interaction */}
					{useNativePlayer && (
						<>
							{/* Left half: single = toggle overlay, double = seek back / fullscreen */}
							<Box
								sx={{
									position: "absolute",
									inset: 0,
									right: "50%",
									zIndex: 1,
									cursor: "pointer",
								}}
								onClick={(e) => {
									e.stopPropagation();
									handleVideoAreaClick("left");
								}}
							/>
							{/* Right half: single = toggle overlay, double = seek forward / fullscreen */}
							<Box
								sx={{
									position: "absolute",
									inset: 0,
									left: "50%",
									zIndex: 1,
									cursor: "pointer",
								}}
								onClick={(e) => {
									e.stopPropagation();
									handleVideoAreaClick("right");
								}}
							/>
						</>
					)}

					{/* ── Top overlay: back + title (left) | episode list (right) ── */}
					{/* Embed mode: always show top bar so back button is accessible */}
					<PlayerTopBar
						title={title}
						hasMultipleEpisodes={hasMultipleEpisodes}
						hasMultipleServers={hasMultipleServers}
						isTMDBSeries={isTMDBSeries}
						panelOpen={panelOpen}
						controlsOpaque={useNativePlayer ? controlsOpaque : true}
						currentEpNum={currentEpNum}
						totalEps={totalEps}
						onClose={handleClose}
						onTogglePanel={() => setPanelOpen((v) => !v)}
					/>

					{/* ── Age rating + categories banner (10s then fades out) ── */}
					<RatingBanner
						ageRating={ageRating}
						categories={categories}
						visible={ratingBannerVisible}
					/>

					{/* ── Native HLS player ── */}
					{useNativePlayer ? (
						<video
							ref={setVideoRef}
							style={{
								width: "100%",
								height: "100%",
								display: "block",
								outline: "none",
							}}
							playsInline
						>
							<track kind="captions" />
						</video>
					) : (
						<>
							<iframe
								src={embedUrl}
								title={title}
								width="100%"
								height="100%"
								style={{ border: 0, display: "block" }}
								allowFullScreen
								allow="autoplay; encrypted-media; fullscreen"
							/>
							{/* cover bottom bar of embedded player */}
							<Box
								sx={{
									position: "absolute",
									bottom: 0,
									left: 0,
									right: 0,
									height: "8.5%",
									background: "black",
									pointerEvents: "none",
								}}
							/>
						</>
					)}

					{/* ── Buffering spinner — always visible, outside overlay ── */}
					{useNativePlayer && buffering && (
						<Box
							sx={{
								position: "absolute",
								inset: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								pointerEvents: "none",
								zIndex: 5,
							}}
						>
							<Box
								sx={{
									width: 44,
									height: 44,
									borderRadius: "50%",
									border: "3px solid rgba(255,255,255,0.2)",
									borderTopColor: "white",
									animation: "spin 0.8s linear infinite",
									"@keyframes spin": {
										to: { transform: "rotate(360deg)" },
									},
								}}
							/>
						</Box>
					)}

					{/* ── Custom controls overlay (native player only) ── */}
					{useNativePlayer && (
						<Box
							sx={{
								position: "absolute",
								inset: 0,
								display: "flex",
								flexDirection: "column",
								justifyContent: "flex-end",
								background: controlsOpaque
									? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)"
									: "transparent",
								opacity: controlsOpaque ? 1 : 0,
								transition: "opacity 0.3s ease",
								pointerEvents: controlsOpaque ? "auto" : "none",
								zIndex: 3,
							}}
							onClick={(e) => {
								// Click on the overlay background (not on any control) → toggle overlay
								if (e.target === e.currentTarget) handleVideoAreaClick("left");
							}}
						>
							{/* Center controls */}
							<PlayerCenterControls
								playing={playing}
								buffering={buffering}
								controlsOpaque={controlsOpaque}
								onSeekBack={() => seek(-SEEK_SECONDS)}
								onSeekForward={() => seek(SEEK_SECONDS)}
								onTogglePlay={togglePlayPause}
								seekSeconds={SEEK_SECONDS}
							/>

							{/* Timeline */}
							<PlayerTimeline
								currentTime={currentTime}
								duration={duration}
								bufferedPct={bufferedPct}
								controlsOpaque={controlsOpaque}
								onSeek={handleSeek}
								onSeekStart={handleSeekStart}
								onSeekEnd={handleSeekEnd}
							/>

							{/* Bottom controls row */}
							<Stack
								direction="row"
								alignItems="center"
								spacing={0.5}
								sx={{
									px: 1.5,
									pb: 1.25,
									pointerEvents: controlsOpaque ? "auto" : "none",
								}}
								onClick={(e) => e.stopPropagation()}
							>
								{/* Seek back 30s — hidden on mobile (use center controls) */}
								<Tooltip title={`Lùi ${SEEK_SECONDS}s`}>
									<IconButton
										onClick={() => seek(-SEEK_SECONDS)}
										size="small"
										sx={{
											color: "white",
											display: { xs: "none", sm: "inline-flex" },
										}}
									>
										<FastRewindIcon sx={{ fontSize: 24 }} />
									</IconButton>
								</Tooltip>
								{/* Play/Pause */}
								<Tooltip title={playing ? "Dừng" : "Phát"}>
									<IconButton
										onClick={togglePlayPause}
										size="small"
										sx={{ color: "white" }}
									>
										{playing ? (
											<PauseIcon sx={{ fontSize: 24 }} />
										) : (
											<PlayArrowIcon sx={{ fontSize: 24 }} />
										)}
									</IconButton>
								</Tooltip>

								{/* Seek forward 30s — hidden on mobile */}
								<Tooltip title={`Tiến ${SEEK_SECONDS}s`}>
									<IconButton
										onClick={() => seek(SEEK_SECONDS)}
										size="small"
										sx={{
											color: "white",
											display: { xs: "none", sm: "inline-flex" },
										}}
									>
										<FastForwardIcon sx={{ fontSize: 24 }} />
									</IconButton>
								</Tooltip>

								{/* Volume */}
								<Tooltip title={muted ? "Bật âm thanh" : "Tắt âm thanh"}>
									<IconButton
										onClick={toggleMute}
										size="large"
										sx={{ color: "white", fontSize: 30 }}
									>
										<VolumeIcon volume={volume} muted={muted} />
									</IconButton>
								</Tooltip>
								<Box sx={{ width: { xs: 56, sm: 100 }, flexShrink: 0 }}>
									<Slider
										value={muted ? 0 : volume}
										min={0}
										max={1}
										step={0.05}
										onChange={handleVolumeChange}
										size="small"
										sx={{
											color: "white",
											"& .MuiSlider-track": { bgcolor: "white" },
											"& .MuiSlider-thumb": {
												bgcolor: "white",
												width: 12,
												height: 12,
											},
											"& .MuiSlider-rail": {
												bgcolor: "rgba(255,255,255,0.35)",
											},
											mt: 0.5,
										}}
									/>
								</Box>

								<Box sx={{ flex: 1 }} />

								{/* Speed */}
								<PlayerSpeedMenu
									speed={speed}
									speedOptions={SPEED_OPTIONS}
									speedMenuOpen={speedMenuOpen}
									speedMenuRef={speedMenuRef}
									onToggleMenu={() => setSpeedMenuOpen((v) => !v)}
									onSelectSpeed={setPlaybackSpeed}
								/>

								{/* Previous episode button — non-TMDB */}
								{!isTMDBSeries && hasMultipleEpisodes && hasPrev && (
									<Tooltip
										title={`Tập trước: ${flatEps[currentFlatIdx - 1]?.ep.name}`}
									>
										<IconButton
											onClick={(e) => {
												e.stopPropagation();
												handlePrev();
											}}
											size="small"
											sx={{ color: "white" }}
										>
											<SkipPreviousIcon sx={{ fontSize: 24 }} />
										</IconButton>
									</Tooltip>
								)}

								{/* Next episode button — non-TMDB */}
								{!isTMDBSeries && hasMultipleEpisodes && hasNext && (
									<Tooltip
										title={`Tập tiếp: ${flatEps[currentFlatIdx + 1]?.ep.name}`}
									>
										<IconButton
											onClick={(e) => {
												e.stopPropagation();
												handleNext();
											}}
											size="small"
											sx={{ color: "white" }}
										>
											<SkipNextIcon sx={{ fontSize: 24 }} />
										</IconButton>
									</Tooltip>
								)}

								{/* Previous episode button — TMDB with hover popover */}
								{isTMDBSeries &&
									(() => {
										const match = currentEpSlug?.match(/tap-0*(\d+)$/i);
										const currentNum = match ? Number(match[1]) : null;
										const prevTmdbEp =
											currentNum != null && currentNum > 1
												? tmdbEpisodes.find(
														(e) => e.episode_number === currentNum - 1,
													)
												: null;
										if (!prevTmdbEp) return null;
										return (
											<EpisodePopover
												direction="prev"
												tmdbEp={prevTmdbEp}
												popoverOpen={prevEpPopoverOpen}
												onMouseEnter={() => setPrevEpPopoverOpen(true)}
												onMouseLeave={() => setPrevEpPopoverOpen(false)}
												onClick={() => void handleTMDBEpisodeClick(prevTmdbEp)}
											/>
										);
									})()}

								{/* Next episode button — TMDB with hover popover */}
								{isTMDBSeries &&
									(() => {
										const match = currentEpSlug?.match(/tap-0*(\d+)$/i);
										const currentNum = match ? Number(match[1]) : null;
										const nextTmdbEp =
											currentNum != null
												? tmdbEpisodes.find(
														(e) => e.episode_number === currentNum + 1,
													)
												: null;
										if (!nextTmdbEp) return null;
										return (
											<EpisodePopover
												direction="next"
												tmdbEp={nextTmdbEp}
												popoverOpen={nextEpPopoverOpen}
												onMouseEnter={() => setNextEpPopoverOpen(true)}
												onMouseLeave={() => setNextEpPopoverOpen(false)}
												onClick={() => void handleTMDBEpisodeClick(nextTmdbEp)}
											/>
										);
									})()}

								{/* Episode list button */}
								{(hasMultipleEpisodes ||
									hasMultipleServers ||
									isTMDBSeries) && (
									<Tooltip title={panelOpen ? "Ẩn danh sách" : "Danh sách tập"}>
										<IconButton
											onClick={(e) => {
												e.stopPropagation();
												setPanelOpen((v) => !v);
											}}
											sx={{ color: panelOpen ? "primary.main" : "white" }}
										>
											<AutoAwesomeMotionIcon
												sx={{ fontSize: 24, transform: "rotate(90deg)" }}
											/>
										</IconButton>
									</Tooltip>
								)}

								{/* Rotate — mobile only */}
								<Tooltip title={isLandscape ? "Xoay dọc" : "Xoay ngang"}>
									<IconButton
										onClick={(e) => {
											e.stopPropagation();
											toggleRotate();
										}}
										size="small"
										sx={{
											color: isLandscape ? "primary.main" : "white",
											display: { xs: "inline-flex", md: "none" },
										}}
									>
										<ScreenRotationIcon sx={{ fontSize: 24 }} />
									</IconButton>
								</Tooltip>

								{/* Fullscreen */}
								<Tooltip
									title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
								>
									<IconButton
										onClick={(e) => {
											e.stopPropagation();
											toggleFullscreen();
										}}
										size="small"
										sx={{ color: "white" }}
									>
										{isFullscreen ? (
											<FullscreenExitIcon sx={{ fontSize: 24 }} />
										) : (
											<FullscreenIcon sx={{ fontSize: 24 }} />
										)}
									</IconButton>
								</Tooltip>
							</Stack>
						</Box>
					)}

					{/* Backdrop — click outside panel to close */}
					{panelOpen && (
						<Box
							onClick={() => setPanelOpen(false)}
							sx={{
								position: "absolute",
								inset: 0,
								zIndex: 8,
								cursor: "pointer",
							}}
						/>
					)}

					{/* Episode overlay panel */}
					{(hasMultipleEpisodes || hasMultipleServers || isTMDBSeries) && (
						<EpisodePanel
							open={panelOpen}
							isTMDBSeries={isTMDBSeries}
							totalSeasons={totalSeasons}
							playingSeason={playingSeason}
							activeSeason={activeSeason}
							tmdbSeasonName={tmdbSeasonName}
							tmdbEpisodes={tmdbEpisodes}
							tmdbLoading={tmdbLoading}
							kkActiveServers={kkActiveServers}
							validServers={validServers}
							validEpisodes={validEpisodes}
							currentEpSlug={currentEpSlug}
							currentEpRef={currentEpRef}
							selectedServer={selectedServer}
							selectedTMDBServer={selectedTMDBServer}
							hasMultipleEpisodes={hasMultipleEpisodes}
							hasMultipleServers={hasMultipleServers}
							hasPrev={hasPrev}
							hasNext={hasNext}
							flatEps={flatEps}
							currentFlatIdx={currentFlatIdx}
							seasonSelectorOpen={seasonSelectorOpen}
							activeEpisodeProgressMap={activeEpisodeProgressMap}
							title={title}
							baseMovieSlug={baseMovieSlug}
							savedSeasonsRef={savedSeasonsRef}
							onClose={() => setPanelOpen(false)}
							onSetActiveSeason={setActiveSeason}
							onSetSeasonSelectorOpen={setSeasonSelectorOpen}
							onSetSelectedServer={setSelectedServer}
							onSetSelectedTMDBServer={setSelectedTMDBServer}
							onPlayEpisode={onPlayEpisode}
							onTMDBEpisodeClick={(ep: TMDBEpisode) =>
								void handleTMDBEpisodeClick(ep)
							}
							onPrev={handlePrev}
							onNext={handleNext}
							upsertCachedSeasons={upsertCachedSeasons}
						/>
					)}
				</Box>
			</DialogContent>
		</Dialog>
	);
};
