import CloseIcon from "@mui/icons-material/Close";
import Forward5Icon from "@mui/icons-material/Forward5";
import Forward10Icon from "@mui/icons-material/Forward10";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import Replay5Icon from "@mui/icons-material/Replay5";
import Replay10Icon from "@mui/icons-material/Replay10";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
	Avatar,
	Box,
	capitalize,
	IconButton,
	Menu,
	MenuItem,
	Paper,
	Slider,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import type { YouTubePlayer } from "@pages/music/types/youtube";
import { loadYouTubeIframeApi } from "@pages/music/types/youtube";
import { formatDisplayName, formatDuration } from "@pages/music/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@store/playerStore";

export const BottomPlayer = () => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const youtubeFrameRef = useRef<HTMLDivElement | null>(null);
	const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
	const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
	const youtubeControlsHideTimerRef = useRef<number | null>(null);
	const volumeRef = useRef(1);
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
	const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([
		0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4,
	]);
	const [speedMenuAnchor, setSpeedMenuAnchor] = useState<HTMLElement | null>(
		null,
	);
	const [youtubeFullscreen, setYoutubeFullscreen] = useState(false);
	const [youtubeControlsVisible, setYoutubeControlsVisible] = useState(false);

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
		clearQueue,
	} = usePlayerStore();

	const youtubeVideoId =
		currentItem?.type === "video" ? currentItem.videoId : undefined;
	const videoCollapsed =
		currentItem?.type === "video" && collapsedVideoId === currentItem.id;
	const youtubeActionsVisible =
		videoCollapsed ||
		youtubeControlsVisible ||
		Boolean(speedMenuAnchor) ||
		(currentItem?.type === "video" && !isPlaying);

	useEffect(() => {
		youtubeStateRef.current = { isPlaying, next, pause, repeat, resume };
	}, [isPlaying, next, pause, repeat, resume]);

	useEffect(() => {
		volumeRef.current = volume;
	}, [volume]);

	useEffect(
		() => () => {
			if (youtubeControlsHideTimerRef.current) {
				window.clearTimeout(youtubeControlsHideTimerRef.current);
			}
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
						if (youtubeStateRef.current.isPlaying) {
							event.target.playVideo();
						}
					},
					onStateChange: (event) => {
						const state = youtubeStateRef.current;
						if (event.data === YT.PlayerState.PLAYING && !state.isPlaying) {
							state.resume();
						}
						if (event.data === YT.PlayerState.PAUSED && state.isPlaying) {
							state.pause();
						}
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
				setYoutubeCurrentTime(youtubePlayerRef.current.getCurrentTime() || 0);
				setYoutubeDuration(youtubePlayerRef.current.getDuration() || 0);
				setYoutubeMuted(youtubePlayerRef.current.isMuted());
				setYoutubePlaybackRate(youtubePlayerRef.current.getPlaybackRate() || 1);
			}, 500);
		});

		return () => {
			disposed = true;
			if (progressTimer) window.clearInterval(progressTimer);
			try {
				youtubePlayerRef.current?.destroy();
			} catch {
				// ignore stale DOM errors when container is replaced
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

	useEffect(() => {
		if (!youtubeVideoId) return;
		if (youtubeControlsHideTimerRef.current)
			window.clearTimeout(youtubeControlsHideTimerRef.current);
		const showTimer = window.setTimeout(
			() => setYoutubeControlsVisible(true),
			0,
		);
		youtubeControlsHideTimerRef.current = window.setTimeout(() => {
			setYoutubeControlsVisible(false);
			youtubeControlsHideTimerRef.current = null;
		}, 4000);
		return () => window.clearTimeout(showTimer);
	}, [youtubeVideoId]);

	useEffect(() => {
		if (currentItem?.type !== "video" || !isPlaying) return;
		if (youtubeControlsHideTimerRef.current)
			window.clearTimeout(youtubeControlsHideTimerRef.current);
		const showTimer = window.setTimeout(
			() => setYoutubeControlsVisible(true),
			0,
		);
		youtubeControlsHideTimerRef.current = window.setTimeout(() => {
			setYoutubeControlsVisible(false);
			youtubeControlsHideTimerRef.current = null;
		}, 5000);
		return () => window.clearTimeout(showTimer);
	}, [currentItem?.type, isPlaying]);

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
		return () =>
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
		const nextTime = Math.min(
			Math.max(audio.currentTime + seconds, 0),
			audio.duration || 0,
		);
		audio.currentTime = nextTime;
		setAudioCurrentTime(nextTime);
	}, []);

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
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!currentItem) return;
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
				} else if (currentItem.type === "video") {
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
	}, [currentItem, handleAudioSeekBy, showYoutubeControlsTemporarily]);

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
		const duration = player.getDuration() || youtubeDuration || 0;
		const nextTime = Math.min(
			Math.max((player.getCurrentTime() || 0) + seconds, 0),
			duration || Number.POSITIVE_INFINITY,
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

	const handleYoutubePointerEnter = () => {
		if (youtubeControlsHideTimerRef.current) {
			window.clearTimeout(youtubeControlsHideTimerRef.current);
			youtubeControlsHideTimerRef.current = null;
		}
		setYoutubeControlsVisible(true);
	};

	const handleYoutubePointerLeave = () => {
		if (youtubeControlsHideTimerRef.current)
			window.clearTimeout(youtubeControlsHideTimerRef.current);
		youtubeControlsHideTimerRef.current = window.setTimeout(() => {
			setYoutubeControlsVisible(false);
			youtubeControlsHideTimerRef.current = null;
		}, 4000);
	};

	return (
		<Paper
			elevation={8}
			sx={{
				position: "sticky",
				bottom: 0,
				zIndex: 5,
				p: 1.25,
				pt: currentItem?.type === "video" ? 1.75 : 1.25,
				borderRadius: 0,
				borderTop: 1,
				borderColor: "divider",
				overflow: "hidden",
			}}
		>
			{currentItem?.type === "video" && currentItem.thumbnail && (
				<>
					<Box
						component="img"
						src={currentItem.thumbnail}
						sx={{
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
							objectFit: "cover",
							zIndex: 0,
							pointerEvents: "none",
							filter: "blur(6px)",
							transform: "scale(1.08)",
							opacity: isPlaying ? 0 : 1,
							transition: "opacity 0.35s ease",
						}}
					/>
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							zIndex: 0,
							bgcolor: "rgba(0,0,0,0.6)",
							pointerEvents: "none",
							opacity: isPlaying ? 0 : 1,
							transition: "opacity 0.35s ease",
						}}
					/>
				</>
			)}
			<Box sx={{ position: "relative", zIndex: 1 }}>
				{youtubeVideoId && (
					<Box sx={{ mb: 1 }}>
						<Box sx={{ position: "relative" }}>
							<Box
								ref={youtubeFrameRef}
								onMouseEnter={handleYoutubePointerEnter}
								onMouseLeave={handleYoutubePointerLeave}
								sx={{
									width: { sm: "100%", md: "65%", xl: "40%" },
									mx: "auto",
									aspectRatio: "16 / 9",
									bgcolor: "grey.950",
									overflow: "hidden",
									borderRadius: 1,
									position: "relative",
									transition:
										"max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
									maxHeight: videoCollapsed ? 0 : 400,
									opacity: videoCollapsed ? 0 : 1,
									pointerEvents: videoCollapsed ? "none" : "auto",
								}}
							>
								<Box
									ref={youtubeContainerRef}
									aria-label={formatDisplayName(currentItem?.title)}
									sx={{
										width: "100%",
										height: "100%",
										display: "block",
										"& iframe": {
											width: "100%",
											height: "100%",
											border: 0,
											display: "block",
										},
									}}
								/>
								{!videoCollapsed && (
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
								)}
								{!videoCollapsed && (
									<Box
										sx={{
											position: "absolute",
											left: 12,
											right: 12,
											bottom: 15,
											zIndex: 3,
											display: "flex",
											flexDirection: "column",
											gap: 0.25,
											px: 1,
											py: 0.75,
											borderRadius: 1,
											bgcolor: "rgba(0,0,0,0.62)",
											backdropFilter: "blur(10px)",
											opacity: youtubeActionsVisible ? 1 : 0,
											pointerEvents: youtubeActionsVisible ? "auto" : "none",
											transform: youtubeActionsVisible
												? "translateY(0)"
												: "translateY(8px)",
											transition: "opacity 0.18s ease, transform 0.18s ease",
										}}
									>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											<Slider
												size="small"
												min={0}
												max={youtubeDuration || currentItem?.duration || 1}
												value={Math.min(
													youtubeCurrentTime,
													youtubeDuration || currentItem?.duration || 1,
												)}
												onChange={(_, value) =>
													handleYoutubeSeek(
														Array.isArray(value) ? value[0] : value,
													)
												}
												sx={{
													flex: 1,
													color: "white",
													height: 3,
													py: 0.25,
													"& .MuiSlider-thumb": { width: 10, height: 10 },
													"& .MuiSlider-rail": { opacity: 0.35 },
												}}
											/>
											<Typography
												sx={{
													color: "rgba(255,255,255,0.86)",
													fontSize: 11,
													fontVariantNumeric: "tabular-nums",
													whiteSpace: "nowrap",
													flexShrink: 0,
												}}
											>
												{formatDuration(youtubeCurrentTime)} /{" "}
												{formatDuration(
													youtubeDuration || currentItem?.duration,
												)}
											</Typography>
										</Box>
										<Box
											sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
										>
											<Tooltip title="- 10 giây">
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
													{isPlaying ? (
														<PauseIcon fontSize="small" />
													) : (
														<PlayArrowIcon fontSize="small" />
													)}
												</IconButton>
											</Tooltip>
											<Tooltip title="+ 10 giây">
												<IconButton
													size="small"
													onClick={() => handleYoutubeSeekBy(10)}
													sx={{ color: "white" }}
												>
													<Forward10Icon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title={youtubeMuted ? "Bật âm" : "Tắt âm"}>
												<IconButton
													size="small"
													onClick={handleYoutubeToggleMute}
													sx={{ color: "white", ml: "auto" }}
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
												onChange={(_, value) =>
													setVolume(Array.isArray(value) ? value[0] : value)
												}
												sx={{
													width: 76,
													color: "white",
													height: 3,
													"& .MuiSlider-thumb": { width: 10, height: 10 },
													"& .MuiSlider-rail": { opacity: 0.35 },
												}}
											/>
											<Tooltip title="Tốc độ">
												<IconButton
													size="small"
													onClick={(event) =>
														setSpeedMenuAnchor(event.currentTarget)
													}
													sx={{
														color: "white",
														borderRadius: 1,
														fontSize: 12,
														fontWeight: 800,
														minWidth: 34,
													}}
												>
													{youtubePlaybackRate}x
												</IconButton>
											</Tooltip>
											<Tooltip
												title={youtubeFullscreen ? "Thu nhỏ" : "Phóng to"}
											>
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
										</Box>
									</Box>
								)}
							</Box>
							<Stack
								direction="row"
								spacing={0.5}
								sx={{ position: "absolute", top: 0, right: 0 }}
							>
								<Tooltip title={videoCollapsed ? "Mở rộng" : "Thu gọn"}>
									<IconButton
										size="small"
										onClick={() =>
											setCollapsedVideoId((currentId) =>
												currentId === currentItem?.id
													? null
													: (currentItem?.id ?? null),
											)
										}
										sx={{
											transition: "transform 0.2s ease",
											"&:hover": {
												transform: videoCollapsed
													? "translateY(-3px)"
													: "translateY(3px)",
											},
											"&:active": {
												transform: videoCollapsed
													? "translateY(-1px)"
													: "translateY(1px)",
											},
										}}
									>
										{videoCollapsed ? (
											<KeyboardArrowUpIcon fontSize="small" />
										) : (
											<KeyboardArrowDownIcon fontSize="small" />
										)}
									</IconButton>
								</Tooltip>
								<Tooltip title="Đóng">
									<IconButton
										size="small"
										onClick={() => {
											pause();
											clearQueue();
										}}
										sx={{
											transition: "transform 0.2s ease",
											"&:hover": { transform: "translateY(-3px)" },
											"&:active": { transform: "translateY(-1px)" },
										}}
									>
										<CloseIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</Stack>
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
					src={
						currentItem?.type === "audio" ? currentItem.streamUrl : undefined
					}
					onEnded={handleEnded}
					onTimeUpdate={(event) => {
						const audio = event.currentTarget;
						setAudioCurrentTime(audio.currentTime || 0);
						setAudioDuration(audio.duration || 0);
					}}
				/>
				<Stack direction="row" spacing={1.5} alignItems="center">
					<Avatar
						variant="rounded"
						src={currentItem?.thumbnail}
						sx={{ width: 52, height: 52, borderRadius: 1 }}
					/>
					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography noWrap sx={{ fontWeight: 800 }}>
							{formatDisplayName(currentItem?.title) ||
								"Chọn bài hát hoặc video"}
						</Typography>
						<Typography noWrap variant="body2" color="text.secondary">
							{formatDisplayName(currentItem?.artist) ||
								"Playlist cho MP3 và YouTube"}
						</Typography>
						{currentItem?.type === "video" && (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 0.75,
									mt: 0.5,
								}}
							>
								<Slider
									size="small"
									min={0}
									max={youtubeDuration || currentItem?.duration || 1}
									value={Math.min(
										youtubeCurrentTime,
										youtubeDuration || currentItem?.duration || 1,
									)}
									onChange={(_, value) => {
										handleYoutubeSeek(Array.isArray(value) ? value[0] : value);
										showYoutubeControlsTemporarily();
									}}
									sx={{
										flex: 1,
										height: 3,
										py: 0.5,
										"& .MuiSlider-thumb": { width: 10, height: 10 },
										"& .MuiSlider-rail": { opacity: 0.3 },
									}}
								/>
								<Typography
									sx={{
										fontVariantNumeric: "tabular-nums",
										fontSize: 10,
										color: "text.secondary",
										flexShrink: 0,
									}}
								>
									{formatDuration(youtubeCurrentTime)} /{" "}
									{formatDuration(youtubeDuration || currentItem?.duration)}
								</Typography>
							</Box>
						)}
						{currentItem?.type !== "video" && (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 0.75,
									mt: 0.5,
								}}
							>
								<Slider
									size="small"
									min={0}
									max={audioDuration || currentItem?.duration || 1}
									value={Math.min(
										audioCurrentTime,
										audioDuration || currentItem?.duration || 1,
									)}
									onChange={(_, value) =>
										handleAudioSeek(Array.isArray(value) ? value[0] : value)
									}
									sx={{
										flex: 1,
										height: 3,
										py: 0.5,
										"& .MuiSlider-thumb": { width: 10, height: 10 },
										"& .MuiSlider-rail": { opacity: 0.3 },
									}}
								/>
								<Typography
									sx={{
										fontVariantNumeric: "tabular-nums",
										fontSize: 10,
										color: "text.secondary",
										flexShrink: 0,
									}}
								>
									{formatDuration(audioCurrentTime)} /{" "}
									{formatDuration(audioDuration || currentItem?.duration)}
								</Typography>
							</Box>
						)}
					</Box>
					<Stack direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ display: { xs: "none", sm: "flex" } }}>
							<Tooltip title="Trộn bài">
								<IconButton
									color={shuffle ? "primary" : "default"}
									onClick={toggleShuffle}
								>
									<ShuffleIcon />
								</IconButton>
							</Tooltip>
						</Box>
						<Tooltip title="Trước">
							<IconButton onClick={previous}>
								<SkipPreviousIcon />
							</IconButton>
						</Tooltip>
						{currentItem?.type === "audio" && (
							<Box sx={{ display: { xs: "none", sm: "flex" } }}>
								<Tooltip title="- 5 giây">
									<IconButton onClick={() => handleAudioSeekBy(-5)}>
										<Replay5Icon />
									</IconButton>
								</Tooltip>
							</Box>
						)}
						<Tooltip title={isPlaying ? "Tạm dừng" : "Phát"}>
							<IconButton
								color="primary"
								onClick={isPlaying ? pause : resume}
								disabled={!currentItem}
							>
								{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
							</IconButton>
						</Tooltip>
						{currentItem?.type === "audio" && (
							<Box sx={{ display: { xs: "none", sm: "flex" } }}>
								<Tooltip title="+ 5 giây">
									<IconButton onClick={() => handleAudioSeekBy(5)}>
										<Forward5Icon />
									</IconButton>
								</Tooltip>
							</Box>
						)}
						<Tooltip title="Tiếp">
							<IconButton onClick={next}>
								<SkipNextIcon />
							</IconButton>
						</Tooltip>
						<Box sx={{ display: { xs: "none", sm: "flex" } }}>
							<Tooltip title={`Lặp: ${capitalize(repeat)}`}>
								<IconButton
									color={repeat !== "off" ? "primary" : "default"}
									onClick={toggleRepeat}
								>
									<RepeatIcon />
								</IconButton>
							</Tooltip>
						</Box>
					</Stack>
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						sx={{
							display: { xs: "none", sm: "flex" },
							width: { sm: 80, md: 150 },
						}}
					>
						<VolumeUpIcon fontSize="small" />
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={volume}
							onChange={(_, value) =>
								setVolume(Array.isArray(value) ? value[0] : value)
							}
							aria-label="Volume"
						/>
					</Stack>
				</Stack>
			</Box>
		</Paper>
	);
};
