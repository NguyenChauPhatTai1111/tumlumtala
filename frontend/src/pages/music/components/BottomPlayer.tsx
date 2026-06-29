import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Forward5Icon from "@mui/icons-material/Forward5";
import Forward10Icon from "@mui/icons-material/Forward10";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import Replay5Icon from "@mui/icons-material/Replay5";
import Replay10Icon from "@mui/icons-material/Replay10";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
    alpha,
    Avatar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Slider,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import type { YouTubePlayer } from "@pages/music/types/youtube";
import { loadYouTubeIframeApi } from "@pages/music/types/youtube";
import { formatDisplayName, formatDuration } from "@pages/music/utils";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePlayerStore } from "@store/playerStore";
import { useLikeMusicMutation } from "@pages/music/hooks/useMusicQueries";
import { TrackInfoButton } from "./TrackInfoDialog";

const SPOTIFY_GREEN = "#f97316";
const MUSIC_SHELL_PLAYER_SX = {
    background: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.background.default, 0.84)
            : alpha(theme.palette.background.paper, 0.86),
    backdropFilter: "blur(18px)",
    overflow: "hidden",
    isolation: "isolate",
    "&::before": {
        content: '""',
        position: "absolute",
        inset: "-24%",
        background: (theme: import("@mui/material").Theme) =>
            `linear-gradient(105deg, transparent 34%, ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "light" ? 0.08 : 0.03,
            )} 50%, transparent 66%)`,
        filter: "blur(24px)",
        opacity: 0.28,
        transform: "translateX(-170%) skewX(-18deg)",
        animation: "musicPlayerSheen 11s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0,
    },
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: (theme: import("@mui/material").Theme) =>
            `radial-gradient(circle at 12% 20%, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.045 : 0.03,
            )} 0%, transparent 30%)`,
        pointerEvents: "none",
        zIndex: 0,
    },
    "@keyframes musicPlayerSheen": {
        "0%": { opacity: 0, transform: "translateX(-170%) skewX(-18deg)" },
        "18%": { opacity: 0.26 },
        "46%": { opacity: 0, transform: "translateX(170%) skewX(-18deg)" },
        "100%": { opacity: 0, transform: "translateX(170%) skewX(-18deg)" },
    },
    "& > *": {
        position: "relative",
        zIndex: 1,
    },
};

const SpotifySlider = ({
    value,
    max,
    onChange,
    width,
}: {
    value: number;
    max: number;
    onChange: (value: number) => void;
    width?: number | string;
}) => (
    <Slider
        size="small"
        min={0}
        max={max || 1}
        value={Math.min(value, max || 1)}
        onChange={(_, v) => onChange(Array.isArray(v) ? v[0] : v)}
        sx={{
            width: width ?? "100%",
            height: 4,
            color: SPOTIFY_GREEN,
            padding: "6px 0",
            "& .MuiSlider-thumb": {
                width: 12,
                height: 12,
                opacity: 0,
                transition: "opacity 0.15s",
                "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 8px ${SPOTIFY_GREEN}30` },
            },
            "& .MuiSlider-track": { border: "none" },
            "& .MuiSlider-rail": { opacity: 0.3, bgcolor: "text.secondary" },
            "&:hover .MuiSlider-thumb": { opacity: 1 },
        }}
    />
);

export const BottomPlayer = () => {
    const location = useLocation();
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const playerPaperRef = useRef<HTMLDivElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const youtubeFrameRef = useRef<HTMLDivElement | null>(null);
    const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
    const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
    const youtubeControlsHideTimerRef = useRef<number | null>(null);
    const volumeRef = useRef(1);
    const reportProgressRef = useRef(usePlayerStore.getState().reportProgress);
    const youtubeStateRef = useRef({
        isPlaying: false,
        next: () => {},
        pause: () => {},
        repeat: "off" as "off" | "one" | "all",
        resume: () => {},
    });

    const [volume, setVolume] = useState(1);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [collapsedVideoId, setCollapsedVideoId] = useState<string | null>(null);
    const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);
    const [youtubeDuration, setYoutubeDuration] = useState(0);
    const [youtubeMuted, setYoutubeMuted] = useState(false);
    const [youtubePlaybackRate, setYoutubePlaybackRate] = useState(1);
    const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([0.5, 1, 1.5, 2]);
    const [speedMenuAnchor, setSpeedMenuAnchor] = useState<HTMLElement | null>(null);
    const [youtubeFullscreen, setYoutubeFullscreen] = useState(false);
    const [youtubeControlsVisible, setYoutubeControlsVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [composerInputFocused, setComposerInputFocused] = useState(false);

    const {
        currentItem,
        isPlaying,
        pause,
        resume,
        next,
        previous,
        shuffle,
        repeat,
        toggleShuffle,
        toggleRepeat,
        likedItems,
        toggleLike,
        clearQueue,
    } = usePlayerStore();

    const liked = likedItems.some((entry) => entry.id === currentItem?.id);
    const likeMutation = useLikeMusicMutation(currentItem ?? ({} as never), liked);

    const youtubeVideoId = currentItem?.type === "video" ? currentItem.videoId : undefined;
    const isMusicRoute = location.pathname.startsWith("/music");
    const videoCollapsed =
        currentItem?.type === "video" && (!isMusicRoute || collapsedVideoId === currentItem.id);
    const youtubeActionsVisible =
        videoCollapsed ||
        youtubeControlsVisible ||
        Boolean(speedMenuAnchor) ||
        (currentItem?.type === "video" && !isPlaying);
    const shouldShowPlayer = Boolean(currentItem) || isMusicRoute;
    const isMessengerRoute = location.pathname.startsWith("/messenger");
    const hideForComposer = isCompact && isMessengerRoute && composerInputFocused;

    const currentTime = currentItem?.type === "video" ? youtubeCurrentTime : audioCurrentTime;
    const duration =
        currentItem?.type === "video"
            ? youtubeDuration || currentItem?.duration || 0
            : audioDuration || currentItem?.duration || 0;

    useEffect(() => {
        let focusCheckFrame: number | null = null;
        const isComposerInput = (target: EventTarget | null) =>
            target instanceof HTMLElement &&
            target.matches('[data-messenger-composer-input="true"]');
        const handleFocusIn = (event: FocusEvent) => {
            if (isCompact && isMessengerRoute && isComposerInput(event.target))
                setComposerInputFocused(true);
        };
        const handleFocusOut = () => {
            if (focusCheckFrame) window.cancelAnimationFrame(focusCheckFrame);
            focusCheckFrame = window.requestAnimationFrame(() => {
                setComposerInputFocused(isComposerInput(document.activeElement));
                focusCheckFrame = null;
            });
        };
        document.addEventListener("focusin", handleFocusIn);
        document.addEventListener("focusout", handleFocusOut);
        return () => {
            document.removeEventListener("focusin", handleFocusIn);
            document.removeEventListener("focusout", handleFocusOut);
            if (focusCheckFrame) window.cancelAnimationFrame(focusCheckFrame);
        };
    }, [isCompact, isMessengerRoute]);

    useLayoutEffect(() => {
        const playerElement = playerPaperRef.current;
        const root = document.documentElement;
        if (!playerElement || !shouldShowPlayer || hideForComposer) {
            root.style.setProperty("--persistent-music-player-height", "0px");
            return;
        }
        const updatePlayerHeight = () => {
            root.style.setProperty(
                "--persistent-music-player-height",
                `${playerElement.getBoundingClientRect().height}px`,
            );
        };
        updatePlayerHeight();
        const resizeObserver = new ResizeObserver(updatePlayerHeight);
        resizeObserver.observe(playerElement);
        return () => {
            resizeObserver.disconnect();
            root.style.setProperty("--persistent-music-player-height", "0px");
        };
    }, [hideForComposer, shouldShowPlayer]);

    useEffect(() => {
        youtubeStateRef.current = { isPlaying, next, pause, repeat, resume };
    }, [isPlaying, next, pause, repeat, resume]);

    useEffect(() => {
        reportProgressRef.current = usePlayerStore.getState().reportProgress;
    });

    useEffect(() => {
        volumeRef.current = volume;
    }, [volume]);

    useEffect(
        () => () => {
            if (youtubeControlsHideTimerRef.current)
                window.clearTimeout(youtubeControlsHideTimerRef.current);
        },
        [],
    );

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
    }, [volume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (currentItem?.type !== "audio") {
            audio.pause();
            return;
        }
        if (isPlaying) {
            void audio.play().catch(() => pause());
        } else {
            audio.pause();
        }
    }, [currentItem, isPlaying, pause]);

    useEffect(() => {
        if (!youtubeVideoId || !youtubeContainerRef.current) {
            youtubePlayerRef.current?.destroy();
            youtubePlayerRef.current = null;
            return;
        }
        let disposed = false;
        let progressTimer: number | null = null;
        youtubeContainerRef.current.replaceChildren();

        void loadYouTubeIframeApi().then((YT) => {
            if (disposed || !youtubeContainerRef.current) return;
            new YT.Player(youtubeContainerRef.current, {
                videoId: youtubeVideoId,
                playerVars: {
                    autoplay: youtubeStateRef.current.isPlaying ? 1 : 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                },
                events: {
                    onReady: (event) => {
                        if (disposed) return;
                        youtubePlayerRef.current = event.target;
                        event.target.setVolume(Math.round(volumeRef.current * 100));
                        setYoutubeDuration(event.target.getDuration() || 0);
                        setYoutubeMuted(event.target.isMuted());
                        setYoutubePlaybackRate(event.target.getPlaybackRate() || 1);
                        setYoutubePlaybackRates(
                            event.target.getAvailablePlaybackRates().length
                                ? event.target.getAvailablePlaybackRates()
                                : [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
                        );
                        if (youtubeStateRef.current.isPlaying) event.target.playVideo();
                    },
                    onStateChange: (event) => {
                        const state = youtubeStateRef.current;
                        if (event.data === YT.PlayerState.PLAYING && !state.isPlaying)
                            state.resume();
                        if (event.data === YT.PlayerState.PAUSED && state.isPlaying) state.pause();
                        if (event.data === YT.PlayerState.ENDED) {
                            if (state.repeat === "one") {
                                event.target.seekTo(0, true);
                                event.target.playVideo();
                            } else {
                                state.next();
                            }
                        }
                    },
                },
            });
            progressTimer = window.setInterval(() => {
                if (!youtubePlayerRef.current) return;
                const ct = youtubePlayerRef.current.getCurrentTime() || 0;
                setYoutubeCurrentTime(ct);
                setYoutubeDuration(youtubePlayerRef.current.getDuration() || 0);
                setYoutubeMuted(youtubePlayerRef.current.isMuted());
                setYoutubePlaybackRate(youtubePlayerRef.current.getPlaybackRate() || 1);
                reportProgressRef.current(ct);
            }, 500);
        });

        return () => {
            disposed = true;
            if (progressTimer) window.clearInterval(progressTimer);
            try {
                youtubePlayerRef.current?.destroy();
            } catch {
                /* ignore */
            }
            youtubePlayerRef.current = null;
        };
    }, [youtubeVideoId]);

    useEffect(() => {
        if (currentItem?.type !== "video" || !youtubePlayerRef.current) return;
        if (isPlaying) {
            youtubePlayerRef.current.playVideo();
        } else {
            youtubePlayerRef.current.pauseVideo();
        }
    }, [currentItem?.type, isPlaying]);

    const showYoutubeControlsTemporarily = useCallback((durationMs = 5000) => {
        if (youtubeControlsHideTimerRef.current)
            window.clearTimeout(youtubeControlsHideTimerRef.current);
        setYoutubeControlsVisible(true);
        youtubeControlsHideTimerRef.current = window.setTimeout(() => {
            setYoutubeControlsVisible(false);
            youtubeControlsHideTimerRef.current = null;
        }, durationMs);
    }, []);

    useEffect(() => {
        if (!youtubeVideoId) return;
        const t = window.setTimeout(() => showYoutubeControlsTemporarily(4000), 0);
        return () => window.clearTimeout(t);
    }, [youtubeVideoId, showYoutubeControlsTemporarily]);

    useEffect(() => {
        if (currentItem?.type !== "video" || !isPlaying) return;
        const t = window.setTimeout(() => showYoutubeControlsTemporarily(5000), 0);
        return () => window.clearTimeout(t);
    }, [currentItem?.type, isPlaying, showYoutubeControlsTemporarily]);

    useEffect(() => {
        youtubePlayerRef.current?.setVolume(Math.round(volume * 100));
    }, [volume]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setYoutubeFullscreen(
                Boolean(
                    youtubeFrameRef.current &&
                    document.fullscreenElement === youtubeFrameRef.current,
                ),
            );
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!currentItem || !("mediaSession" in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: formatDisplayName(currentItem.title),
            artist: formatDisplayName(currentItem.artist),
            artwork: [{ src: currentItem.thumbnail }],
        });
        navigator.mediaSession.setActionHandler("play", resume);
        navigator.mediaSession.setActionHandler("pause", pause);
        navigator.mediaSession.setActionHandler("nexttrack", next);
        navigator.mediaSession.setActionHandler("previoustrack", previous);
    }, [currentItem, next, pause, previous, resume]);

    const handleAudioSeekBy = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || 0);
        audio.currentTime = nextTime;
        setAudioCurrentTime(nextTime);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!currentItem || !isMusicRoute) return;
            const tag = (event.target as HTMLElement).tagName;
            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                (event.target as HTMLElement).isContentEditable
            )
                return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                const delta = event.key === "ArrowLeft" ? -10 : 10;
                event.preventDefault();
                if (currentItem.type === "audio") {
                    handleAudioSeekBy(delta);
                } else {
                    const player = youtubePlayerRef.current;
                    if (player) {
                        const nextTime = Math.min(
                            Math.max((player.getCurrentTime() || 0) + delta, 0),
                            player.getDuration() || Number.POSITIVE_INFINITY,
                        );
                        player.seekTo(nextTime, true);
                        setYoutubeCurrentTime(nextTime);
                        showYoutubeControlsTemporarily(4000);
                    }
                }
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100));
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
            } else if (event.key === " ") {
                event.preventDefault();
                const state = youtubeStateRef.current;
                if (state.isPlaying) {
                    state.pause();
                } else {
                    state.resume();
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [currentItem, handleAudioSeekBy, isMusicRoute, showYoutubeControlsTemporarily]);

    const handleEnded = () => {
        const audio = audioRef.current;
        if (repeat === "one" && audio) {
            audio.currentTime = 0;
            void audio.play();
            return;
        }
        next();
    };
    const handleAudioSeek = (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
        setAudioCurrentTime(time);
    };
    const handleYoutubePlayPause = () => {
        const player = youtubePlayerRef.current;
        if (!player) return;
        if (isPlaying) {
            player.pauseVideo();
            pause();
        } else {
            player.playVideo();
            resume();
        }
    };
    const handleYoutubeSeek = (time: number) => {
        youtubePlayerRef.current?.seekTo(time, true);
        setYoutubeCurrentTime(time);
    };
    const handleYoutubeSeekBy = (seconds: number) => {
        const player = youtubePlayerRef.current;
        if (!player) return;
        const d = player.getDuration() || youtubeDuration || 0;
        const nextTime = Math.min(
            Math.max((player.getCurrentTime() || 0) + seconds, 0),
            d || Number.POSITIVE_INFINITY,
        );
        player.seekTo(nextTime, true);
        setYoutubeCurrentTime(nextTime);
    };
    const handleYoutubeToggleMute = () => {
        const player = youtubePlayerRef.current;
        if (!player) return;
        if (player.isMuted()) {
            player.unMute();
            setYoutubeMuted(false);
        } else {
            player.mute();
            setYoutubeMuted(true);
        }
    };
    const handleYoutubeFullscreen = () => {
        const frame = youtubeFrameRef.current;
        if (!frame) return;
        if (document.fullscreenElement === frame) {
            void document.exitFullscreen();
            return;
        }
        void frame.requestFullscreen();
    };
    const handleYoutubePlaybackRate = (rate: number) => {
        youtubePlayerRef.current?.setPlaybackRate(rate);
        setYoutubePlaybackRate(rate);
        setSpeedMenuAnchor(null);
    };

    if (!shouldShowPlayer) return null;

    const volumeIcon =
        volume === 0 ? (
            <VolumeOffIcon sx={{ fontSize: 18 }} />
        ) : volume < 0.5 ? (
            <VolumeDownIcon sx={{ fontSize: 18 }} />
        ) : (
            <VolumeUpIcon sx={{ fontSize: 18 }} />
        );

    return (
        <Box
            ref={playerPaperRef}
            sx={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: (t) => t.zIndex.drawer + 1,
                ...MUSIC_SHELL_PLAYER_SX,
                borderTop: "1px solid",
                borderColor: "divider",
                opacity: hideForComposer ? 0 : 1,
                pointerEvents: hideForComposer ? "none" : "auto",
                transform: hideForComposer ? "translateY(100%)" : "translateY(0)",
                transition: "opacity 180ms ease, transform 220ms ease",
            }}
        >
            {/* YouTube video panel */}
            {youtubeVideoId && (
                <Box
                    sx={{
                        maxHeight: videoCollapsed ? 0 : 320,
                        overflow: "hidden",
                        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <Box
                        ref={youtubeFrameRef}
                        onMouseEnter={() => {
                            if (youtubeControlsHideTimerRef.current)
                                window.clearTimeout(youtubeControlsHideTimerRef.current);
                            setYoutubeControlsVisible(true);
                        }}
                        onMouseLeave={() => {
                            if (youtubeControlsHideTimerRef.current)
                                window.clearTimeout(youtubeControlsHideTimerRef.current);
                            youtubeControlsHideTimerRef.current = window.setTimeout(() => {
                                setYoutubeControlsVisible(false);
                                youtubeControlsHideTimerRef.current = null;
                            }, 3000);
                        }}
                        sx={{
                            width: { xs: "100%", md: "60%", xl: "40%" },
                            mx: "auto",
                            aspectRatio: "16/9",
                            bgcolor: "#000",
                            position: "relative",
                        }}
                    >
                        <Box
                            ref={youtubeContainerRef}
                            sx={{
                                width: "100%",
                                height: "100%",
                                "& iframe": {
                                    width: "100%",
                                    height: "100%",
                                    border: 0,
                                    display: "block",
                                },
                            }}
                        />
                        {/* YouTube overlay controls */}
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 2,
                                cursor: "pointer",
                            }}
                            onClick={handleYoutubePlayPause}
                            onDoubleClick={handleYoutubeFullscreen}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                p: 1.5,
                                background:
                                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                                zIndex: 3,
                                opacity: youtubeActionsVisible ? 1 : 0,
                                pointerEvents: youtubeActionsVisible ? "auto" : "none",
                                transition: "opacity 0.18s ease",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <SpotifySlider
                                    value={youtubeCurrentTime}
                                    max={youtubeDuration || currentItem?.duration || 1}
                                    onChange={handleYoutubeSeek}
                                />
                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.7)",
                                        fontSize: 11,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {formatDuration(youtubeCurrentTime)} /{" "}
                                    {formatDuration(youtubeDuration || currentItem?.duration)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Tooltip title="-10s">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleYoutubeSeekBy(-10)}
                                        sx={{ color: "white" }}
                                    >
                                        <Replay10Icon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isPlaying ? "Tạm dừng" : "Phát"}>
                                    <IconButton
                                        size="small"
                                        onClick={handleYoutubePlayPause}
                                        sx={{ color: "white" }}
                                    >
                                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="+10s">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleYoutubeSeekBy(10)}
                                        sx={{ color: "white" }}
                                    >
                                        <Forward10Icon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Box sx={{ flex: 1 }} />
                                <Tooltip title={youtubeMuted ? "Bật âm" : "Tắt âm"}>
                                    <IconButton
                                        size="small"
                                        onClick={handleYoutubeToggleMute}
                                        sx={{ color: "white" }}
                                    >
                                        {youtubeMuted || volume === 0 ? (
                                            <VolumeOffIcon fontSize="small" />
                                        ) : (
                                            <VolumeUpIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </Tooltip>
                                <Slider
                                    size="small"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={youtubeMuted ? 0 : volume}
                                    onChange={(_, v) => setVolume(Array.isArray(v) ? v[0] : v)}
                                    sx={{
                                        width: 70,
                                        color: "white",
                                        height: 3,
                                        "& .MuiSlider-thumb": { width: 10, height: 10 },
                                    }}
                                />
                                <Tooltip title="Tốc độ">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
                                        sx={{
                                            color: "white",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            minWidth: 32,
                                        }}
                                    >
                                        {youtubePlaybackRate}x
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={youtubeFullscreen ? "Thu nhỏ" : "Phóng to"}>
                                    <IconButton
                                        size="small"
                                        onClick={handleYoutubeFullscreen}
                                        sx={{ color: "white" }}
                                    >
                                        {youtubeFullscreen ? (
                                            <FullscreenExitIcon fontSize="small" />
                                        ) : (
                                            <FullscreenIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Thu gọn video">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            setCollapsedVideoId((id) =>
                                                id === currentItem?.id
                                                    ? null
                                                    : (currentItem?.id ?? null),
                                            )
                                        }
                                        sx={{ color: "white" }}
                                    >
                                        <KeyboardArrowDownIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                    <Menu
                        anchorEl={speedMenuAnchor}
                        open={Boolean(speedMenuAnchor)}
                        onClose={() => setSpeedMenuAnchor(null)}
                    >
                        {youtubePlaybackRates.map((rate) => (
                            <MenuItem
                                key={rate}
                                selected={rate === youtubePlaybackRate}
                                onClick={() => handleYoutubePlaybackRate(rate)}
                            >
                                {rate}x
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
            )}

            {/* biome-ignore lint/a11y/useMediaCaption: Music streams do not provide caption tracks through the current API. */}
            <audio
                ref={audioRef}
                src={currentItem?.type === "audio" ? currentItem.streamUrl : undefined}
                onEnded={handleEnded}
                onTimeUpdate={(e) => {
                    const audio = e.currentTarget;
                    setAudioCurrentTime(audio.currentTime || 0);
                    setAudioDuration(audio.duration || 0);
                    reportProgressRef.current(audio.currentTime || 0);
                }}
            />

            {/* Main player bar */}
            {isCompact ? (
                /* Mobile compact bar */
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        px: 1.5,
                        py: 1,
                    }}
                >
                    {/* Progress line */}
                    <Box sx={{ mb: 0.5 }}>
                        <SpotifySlider
                            value={currentTime}
                            max={duration}
                            onChange={(v) =>
                                currentItem?.type === "video"
                                    ? handleYoutubeSeek(v)
                                    : handleAudioSeek(v)
                            }
                        />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                            variant="rounded"
                            src={currentItem?.thumbnail}
                            sx={{ width: 36, height: 36, borderRadius: 0.5, flexShrink: 0 }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                                noWrap
                                sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}
                            >
                                {formatDisplayName(currentItem?.title) || "Chọn bài hát"}
                            </Typography>
                            <Typography
                                noWrap
                                sx={{ fontSize: 11, color: "text.secondary" }}
                            >
                                {formatDisplayName(currentItem?.artist)}
                            </Typography>
                        </Box>
                        <Stack
                            direction="row"
                            spacing={0}
                            alignItems="center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconButton
                                size="small"
                                onClick={previous}
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                <SkipPreviousIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                            <IconButton
                                onClick={isPlaying ? pause : resume}
                                disabled={!currentItem}
                                sx={{
                                    color: "white",
                                    bgcolor: "#f97316",
                                    width: 32,
                                    height: 32,
                                    "&:hover": { bgcolor: "#ea6a00", transform: "scale(1.05)" },
                                    "&:disabled": { bgcolor: "action.selected" },
                                }}
                            >
                                {isPlaying ? (
                                    <PauseIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                                )}
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={next}
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                <SkipNextIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => setExpanded(!expanded)}
                                sx={{
                                    color: "text.disabled",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                {expanded ? (
                                    <KeyboardArrowDownIcon fontSize="small" />
                                ) : (
                                    <KeyboardArrowUpIcon fontSize="small" />
                                )}
                            </IconButton>
                        </Stack>
                    </Box>
                </Box>
            ) : (
                /* Desktop 3-zone Spotify bar */
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr minmax(0, 480px) 1fr",
                        alignItems: "center",
                        px: 2,
                        py: 1.25,
                        gap: 2,
                    }}
                >
                    {/* Zone 1: Track info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                        {currentItem ? (
                            <>
                                <Avatar
                                    variant="rounded"
                                    src={currentItem.thumbnail}
                                    sx={{ width: 52, height: 52, borderRadius: 1, flexShrink: 0 }}
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography
                                        noWrap
                                        sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}
                                    >
                                        {formatDisplayName(currentItem.title)}
                                    </Typography>
                                    <Typography
                                        noWrap
                                        sx={{ fontSize: 12, color: "text.secondary" }}
                                    >
                                        {formatDisplayName(currentItem.artist)}
                                    </Typography>
                                </Box>
                                <TrackInfoButton item={currentItem} alwaysVisible />
                                <Tooltip title={liked ? "Bỏ thích" : "Thích"}>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            if (currentItem) {
                                                toggleLike(currentItem);
                                                likeMutation.mutate();
                                            }
                                        }}
                                        sx={{
                                            color: liked ? SPOTIFY_GREEN : "text.secondary",
                                            "&:hover": { color: liked ? "#fb923c" : "text.primary" },
                                        }}
                                    >
                                        {liked ? (
                                            <FavoriteIcon sx={{ fontSize: 18 }} />
                                        ) : (
                                            <FavoriteBorderIcon sx={{ fontSize: 18 }} />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            </>
                        ) : (
                            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                                Chọn bài hát để phát
                            </Typography>
                        )}
                    </Box>

                    {/* Zone 2: Controls + progress */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.5,
                        }}
                    >
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Tooltip title="Trộn bài">
                                <IconButton
                                    size="small"
                                    onClick={toggleShuffle}
                                    sx={{
                                        color: shuffle ? SPOTIFY_GREEN : "text.secondary",
                                        "&:hover": { color: shuffle ? "#fb923c" : "text.primary" },
                                    }}
                                >
                                    <ShuffleIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Trước">
                                <IconButton
                                    size="small"
                                    onClick={previous}
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { color: "text.primary" },
                                    }}
                                >
                                    <SkipPreviousIcon sx={{ fontSize: 22 }} />
                                </IconButton>
                            </Tooltip>
                            {currentItem?.type === "audio" && !isMobile && (
                                <Tooltip title="-5s">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleAudioSeekBy(-5)}
                                        sx={{
                                            color: "text.secondary",
                                            "&:hover": { color: "text.primary" },
                                        }}
                                    >
                                        <Replay5Icon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title={isPlaying ? "Tạm dừng" : "Phát"}>
                                <IconButton
                                    onClick={isPlaying ? pause : resume}
                                    disabled={!currentItem}
                                    sx={{
                                        color: "white",
                                        bgcolor: "#f97316",
                                        width: 36,
                                        height: 36,
                                        "&:hover": { bgcolor: "#ea6a00", transform: "scale(1.05)" },
                                        transition: "transform 0.15s ease",
                                        "&:disabled": {
                                            bgcolor: "action.selected",
                                            color: "text.disabled",
                                        },
                                    }}
                                >
                                    {isPlaying ? (
                                        <PauseIcon sx={{ fontSize: 20 }} />
                                    ) : (
                                        <PlayArrowIcon sx={{ fontSize: 20 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                            {currentItem?.type === "audio" && !isMobile && (
                                <Tooltip title="+5s">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleAudioSeekBy(5)}
                                        sx={{
                                            color: "text.secondary",
                                            "&:hover": { color: "text.primary" },
                                        }}
                                    >
                                        <Forward5Icon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title="Tiếp">
                                <IconButton
                                    size="small"
                                    onClick={next}
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { color: "text.primary" },
                                    }}
                                >
                                    <SkipNextIcon sx={{ fontSize: 22 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                title={
                                    repeat === "off"
                                        ? "Lặp: Tắt"
                                        : repeat === "all"
                                          ? "Lặp: Tất cả"
                                          : "Lặp: 1 bài"
                                }
                            >
                                <IconButton
                                    size="small"
                                    onClick={toggleRepeat}
                                    sx={{
                                        color:
                                            repeat !== "off"
                                                ? SPOTIFY_GREEN
                                                : "text.secondary",
                                        "&:hover": {
                                            color: repeat !== "off" ? "#fb923c" : "text.primary",
                                        },
                                    }}
                                >
                                    {repeat === "one" ? (
                                        <RepeatOneIcon sx={{ fontSize: 18 }} />
                                    ) : (
                                        <RepeatIcon sx={{ fontSize: 18 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: "text.secondary",
                                    fontVariantNumeric: "tabular-nums",
                                    flexShrink: 0,
                                }}
                            >
                                {formatDuration(currentTime)}
                            </Typography>
                            <SpotifySlider
                                value={currentTime}
                                max={duration}
                                onChange={(v) =>
                                    currentItem?.type === "video"
                                        ? handleYoutubeSeek(v)
                                        : handleAudioSeek(v)
                                }
                            />
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: "text.secondary",
                                    fontVariantNumeric: "tabular-nums",
                                    flexShrink: 0,
                                }}
                            >
                                {formatDuration(duration)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Zone 3: Volume + extras */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 0.5,
                        }}
                    >
                        {currentItem?.type === "video" && (
                            <Tooltip title={videoCollapsed ? "Mở video" : "Thu gọn video"}>
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        setCollapsedVideoId((id) =>
                                            id === currentItem?.id
                                                ? null
                                                : (currentItem?.id ?? null),
                                        )
                                    }
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { color: "text.primary" },
                                    }}
                                >
                                    {videoCollapsed ? (
                                        <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                                    ) : (
                                        <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title={volume === 0 ? "Bật âm" : "Tắt âm"}>
                            <IconButton
                                size="small"
                                onClick={() => setVolume((v) => (v === 0 ? 1 : 0))}
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                {volumeIcon}
                            </IconButton>
                        </Tooltip>
                        <SpotifySlider value={volume} max={1} onChange={setVolume} width={100} />
                        <Tooltip title="Đóng">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    pause();
                                    clearQueue();
                                }}
                                sx={{
                                    color: "text.disabled",
                                    "&:hover": { color: "text.primary" },
                                    ml: 0.5,
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
