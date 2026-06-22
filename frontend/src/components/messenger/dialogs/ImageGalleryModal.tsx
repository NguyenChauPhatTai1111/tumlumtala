import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import Forward10Icon from "@mui/icons-material/Forward10";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay10Icon from "@mui/icons-material/Replay10";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
	Box,
	Dialog,
	IconButton,
	Skeleton,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "@/types/messenger";
import { formatDateV2, formatTimestampV2 } from "@/utils/dateTime";
import { resolveCdnUrl } from "@/utils/urlUtils";
import { VideoControls } from "./components/VideoControls";
import { useVideoPlayer } from "./hooks/useVideoPlayer";

type ImageGalleryModalProps = {
	open: boolean;
	onClose: () => void;
	messages: Message[];
	initialMessageId?: number;
	onNavigateToMessage?: (messageId: number) => void;
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export function ImageGalleryModal({
	open,
	onClose,
	messages,
	initialMessageId,
	onNavigateToMessage,
}: ImageGalleryModalProps) {
	const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const dragStartRef = useRef<{
		mouseX: number;
		mouseY: number;
		panX: number;
		panY: number;
	} | null>(null);

	const [prevOpen, setPrevOpen] = useState(open);
	const [prevInitialMessageId, setPrevInitialMessageId] =
		useState(initialMessageId);

	const mediaMessages = useMemo(
		() =>
			messages
				.filter(
					(msg) =>
						(msg.message_type === "image" || msg.message_type === "video") &&
						!msg.content.startsWith("blob:"),
				)
				.sort((a, b) => {
					const diff =
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					return diff !== 0 ? diff : b.id - a.id;
				}),
		[messages],
	);

	const groupedMedia = useMemo(
		() =>
			mediaMessages.reduce(
				(acc, msg) => {
					const key = new Date(msg.created_at).toISOString().split("T")[0];
					if (!acc[key]) acc[key] = [];
					acc[key].push(msg);
					return acc;
				},
				{} as Record<string, Message[]>,
			),
		[mediaMessages],
	);

	const selectedIndex = selectedMediaId
		? mediaMessages.findIndex((msg) => msg.id === selectedMediaId)
		: 0;
	const normalizedIndex = selectedIndex >= 0 ? selectedIndex : 0;
	const selectedMessage =
		normalizedIndex < mediaMessages.length
			? mediaMessages[normalizedIndex]
			: undefined;
	const isVideo = selectedMessage?.message_type === "video";
	const selectedUrl = selectedMessage
		? resolveCdnUrl(selectedMessage.content)
		: "";
	const formattedTime = selectedMessage?.created_at
		? formatTimestampV2(selectedMessage.created_at)
		: "";

	const {
		videoRef,
		imageViewerRef,
		autoPlayRef,
		videoPlaying,
		videoSpeed,
		videoCurrentTime,
		videoDuration,
		videoMuted,
		videoVolume,
		videoRenderedWidth,
		isFullscreen,
		canSeek,
		showVideoControls,
		setVideoPlaying,
		setVideoCurrentTime,
		setVideoDuration,
		setVideoMuted,
		setVideoVolume,
		handleVideoPlayPause,
		handleVideoRestart,
		handleToggleMute,
		handleVolumeChange,
		handleSpeedChange,
		handleSeekBackward,
		handleSeekForward,
		handleToggleFullscreen,
		handleVideoAreaMouseEnter,
		handleVideoAreaMouseLeave,
		handleVideoWrapperClick,
		resetVideoState,
	} = useVideoPlayer(isVideo);

	const resetMediaState = useCallback(() => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
		resetVideoState();
	}, [resetVideoState]);

	if (prevOpen !== open || prevInitialMessageId !== initialMessageId) {
		setPrevOpen(open);
		setPrevInitialMessageId(initialMessageId);
		if (open && mediaMessages.length > 0) {
			const target = initialMessageId
				? mediaMessages.find((msg) => msg.id === initialMessageId)
				: mediaMessages[0];
			setSelectedMediaId(target?.id ?? mediaMessages[0]?.id ?? null);
			if (target?.message_type === "video") {
				autoPlayRef.current = true;
			}
		}
		setZoom(1);
		setPan({ x: 0, y: 0 });
	}

	const goToPrev = useCallback(() => {
		setSelectedMediaId((prev) => {
			const idx = mediaMessages.findIndex((msg) => msg.id === prev);
			return mediaMessages[Math.max(0, idx - 1)]?.id ?? prev;
		});
		resetMediaState();
	}, [mediaMessages, resetMediaState]);

	const goToNext = useCallback(() => {
		setSelectedMediaId((prev) => {
			const idx = mediaMessages.findIndex((msg) => msg.id === prev);
			return (
				mediaMessages[Math.min(mediaMessages.length - 1, idx + 1)]?.id ?? prev
			);
		});
		resetMediaState();
	}, [mediaMessages, resetMediaState]);

	const selectMedia = (id: number) => {
		setSelectedMediaId(id);
		resetMediaState();
	};

	const handleZoomIn = () =>
		setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
	const handleZoomOut = () => {
		setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
		setPan({ x: 0, y: 0 });
	};

	const handleDownload = async () => {
		if (!selectedUrl || !selectedMessage) return;
		try {
			const response = await fetch(selectedUrl);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			const ext = blob.type.split("/")[1] || (isVideo ? "mp4" : "jpg");
			const fallbackName = `${isVideo ? "video" : "image"}_${selectedMessage.id}.${ext}`;
			a.download = selectedMessage.metadata?.original_name || fallbackName;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			window.open(selectedUrl, "_blank");
		}
	};

	const handleNavigateToMessage = () => {
		if (!selectedMessage) return;
		onNavigateToMessage?.(selectedMessage.id);
		onClose();
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (isVideo || zoom <= 1) return;
		e.preventDefault();
		dragStartRef.current = {
			mouseX: e.clientX,
			mouseY: e.clientY,
			panX: pan.x,
			panY: pan.y,
		};
		setIsDragging(true);
	};

	useEffect(() => {
		if (!open) return;
		const onWheel = (e: WheelEvent) => {
			if (isVideo) return;
			const el = imageViewerRef.current;
			if (!el?.contains(e.target as Node)) return;
			e.preventDefault();
			if (e.deltaY < 0) {
				setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
			} else {
				setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
				setPan({ x: 0, y: 0 });
			}
		};
		window.addEventListener("wheel", onWheel, { passive: false });
		return () => window.removeEventListener("wheel", onWheel);
	}, [open, isVideo, imageViewerRef]);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!dragStartRef.current) return;
			const dx = e.clientX - dragStartRef.current.mouseX;
			const dy = e.clientY - dragStartRef.current.mouseY;
			setPan({
				x: dragStartRef.current.panX + dx,
				y: dragStartRef.current.panY + dy,
			});
		};
		const onMouseUp = () => {
			dragStartRef.current = null;
			setIsDragging(false);
		};
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	useEffect(() => {
		if (!open && document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		}
	}, [open]);

	useEffect(() => {
		if (!open || mediaMessages.length === 0) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isVideo) {
				if (e.key === "ArrowLeft") {
					e.preventDefault();
					handleSeekBackward();
					return;
				}
				if (e.key === "ArrowRight") {
					e.preventDefault();
					handleSeekForward();
					return;
				}
				if (e.key === " ") {
					e.preventDefault();
					handleVideoPlayPause();
					return;
				}
				if (e.key === "f" || e.key === "F") {
					e.preventDefault();
					handleToggleFullscreen();
					return;
				}
			}
			if (e.key === "ArrowUp") goToPrev();
			if (e.key === "ArrowDown") goToNext();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		open,
		mediaMessages,
		isVideo,
		goToPrev,
		goToNext,
		handleSeekBackward,
		handleSeekForward,
		handleVideoPlayPause,
		handleToggleFullscreen,
	]);

	if (mediaMessages.length === 0) return null;

	const activePanX = !isVideo && zoom > 1 ? pan.x : 0;
	const activePanY = !isVideo && zoom > 1 ? pan.y : 0;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="lg"
			fullWidth
			PaperProps={{
				sx: { backgroundColor: "background.paper", color: "white" },
			}}
		>
			<Box
				sx={{
					p: 2,
					minHeight: 560,
					display: "flex",
					gap: 2,
					height: "80vh",
					overflowY: "hidden",
				}}
			>
				{/* Main viewer */}
				<Box
					sx={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						gap: 2,
						minHeight: 0,
					}}
				>
					<Box
						ref={imageViewerRef}
						onMouseDown={handleMouseDown}
						onMouseEnter={handleVideoAreaMouseEnter}
						onMouseLeave={handleVideoAreaMouseLeave}
						sx={{
							position: "relative",
							flex: 1,
							minHeight: 0,
							backgroundColor: isFullscreen ? "#000" : "background.paper",
							borderRadius: isFullscreen ? 0 : 2,
							overflow: "hidden",
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							"&:fullscreen": {
								width: "100vw",
								height: "100vh",
								bgcolor: "#000",
							},
							"&:-webkit-full-screen": {
								width: "100vw",
								height: "100vh",
								bgcolor: "#000",
							},
							cursor:
								isFullscreen && isVideo && !showVideoControls
									? "none"
									: !isVideo && zoom > 1
										? isDragging
											? "grabbing"
											: "grab"
										: "default",
							userSelect: "none",
						}}
					>
						<IconButton
							onClick={goToPrev}
							disabled={normalizedIndex === 0}
							sx={{
								position: "absolute",
								left: 12,
								top: "50%",
								transform: "translateY(-50%)",
								backgroundColor: "rgba(255,255,255,.15)",
								color: "white",
								zIndex: 200,
							}}
						>
							<ChevronLeftIcon />
						</IconButton>
						<IconButton
							onClick={goToNext}
							disabled={normalizedIndex === mediaMessages.length - 1}
							sx={{
								position: "absolute",
								right: 12,
								top: "50%",
								transform: "translateY(-50%)",
								backgroundColor: "rgba(255,255,255,.15)",
								color: "white",
								zIndex: 200,
							}}
						>
							<ChevronRightIcon />
						</IconButton>

						{selectedUrl ? (
							isVideo ? (
								<Box
									onClick={handleVideoWrapperClick}
									sx={{
										position: "relative",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: "100%",
										height: "100%",
									}}
								>
									<Box
										component="video"
										ref={videoRef}
										src={selectedUrl}
										controls={false}
										preload="auto"
										onCanPlay={() => {
											if (autoPlayRef.current) {
												autoPlayRef.current = false;
												videoRef.current?.play().catch(() => {});
											}
										}}
										onTimeUpdate={() =>
											setVideoCurrentTime(videoRef.current?.currentTime ?? 0)
										}
										onLoadedMetadata={() =>
											setVideoDuration(videoRef.current?.duration ?? 0)
										}
										onPlay={() => setVideoPlaying(true)}
										onPause={() => setVideoPlaying(false)}
										onVolumeChange={() => {
											const v = videoRef.current;
											if (!v) return;
											setVideoMuted(v.muted);
											setVideoVolume(v.volume);
										}}
										onEnded={() => setVideoPlaying(false)}
										onDoubleClick={handleToggleFullscreen}
										sx={{
											width: "100%",
											height: "100%",
											objectFit: "contain",
											borderRadius: isFullscreen ? 0 : 1,
											display: "block",
											cursor: "default",
										}}
									/>
									<Box
										sx={{
											position: "absolute",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 1.25,
											opacity: !videoPlaying || showVideoControls ? 1 : 0,
											transition: "opacity 0.2s ease",
											pointerEvents:
												!videoPlaying || showVideoControls ? "auto" : "none",
										}}
									>
										<Tooltip title="- 10 giây">
											<IconButton
												onClick={(e) => {
													e.stopPropagation();
													handleSeekBackward();
												}}
												sx={{
													width: 46,
													height: 46,
													color: "white",
													bgcolor: "rgba(0,0,0,0.45)",
													backdropFilter: "blur(8px)",
													"&:hover": { bgcolor: "rgba(0,0,0,0.68)" },
												}}
											>
												<Replay10Icon sx={{ fontSize: 28 }} />
											</IconButton>
										</Tooltip>

										<Tooltip title={videoPlaying ? "Tạm dừng" : "Phát"}>
											<IconButton
												onClick={(e) => {
													e.stopPropagation();
													handleVideoPlayPause();
												}}
												sx={{
													width: 58,
													height: 58,
													color: "white",
													bgcolor: "rgba(0,0,0,0.52)",
													backdropFilter: "blur(8px)",
													"&:hover": { bgcolor: "rgba(0,0,0,0.72)" },
												}}
											>
												{videoPlaying ? (
													<PauseIcon sx={{ fontSize: 34 }} />
												) : (
													<PlayArrowIcon sx={{ fontSize: 34 }} />
												)}
											</IconButton>
										</Tooltip>

										<Tooltip title="+ 10 giây">
											<IconButton
												onClick={(e) => {
													e.stopPropagation();
													handleSeekForward();
												}}
												sx={{
													width: 46,
													height: 46,
													color: "white",
													bgcolor: "rgba(0,0,0,0.45)",
													backdropFilter: "blur(8px)",
													"&:hover": { bgcolor: "rgba(0,0,0,0.68)" },
												}}
											>
												<Forward10Icon sx={{ fontSize: 28 }} />
											</IconButton>
										</Tooltip>
									</Box>
								</Box>
							) : (
								<img
									src={selectedUrl}
									alt="Selected"
									draggable={false}
									style={{
										maxWidth: "100%",
										maxHeight: "100%",
										objectFit: "contain",
										transform: `translate(${activePanX}px, ${activePanY}px) scale(${zoom})`,
										transformOrigin: "center center",
										transition: isDragging ? "none" : "transform 0.15s ease",
									}}
								/>
							)
						) : (
							<Skeleton variant="rectangular" width="100%" height={480} />
						)}

						{/* Top-left: close & sender info */}
						<Box
							sx={{
								position: "absolute",
								top: 0,
								left: 0,
								display: "flex",
								alignItems: "center",
								gap: 1,
								zIndex: 20,
								opacity: showVideoControls ? 1 : 0,
								transition: "opacity 0.3s ease",
								pointerEvents: showVideoControls ? "auto" : "none",
							}}
						>
							<IconButton
								onClick={onClose}
								size="small"
								sx={{
									color: "white",
									backgroundColor: "rgba(0,0,0,0.35)",
									"&:hover": { backgroundColor: "rgba(255,255,255,0.25)" },
								}}
							>
								<CloseIcon fontSize="small" />
							</IconButton>
							<Box
								sx={{
									backgroundColor: "rgba(0,0,0,0.35)",
									color: "white",
									px: 1.5,
									py: 0.5,
									borderRadius: 1,
								}}
							>
								<Typography
									variant="caption"
									sx={{ display: "block", fontWeight: 700, color: "inherit" }}
								>
									{selectedMessage?.sender_name || "Người gửi không rõ"}
								</Typography>
								<Typography
									variant="caption"
									sx={{
										display: "block",
										opacity: 0.8,
										color: "inherit",
										fontSize: 11,
									}}
								>
									{formattedTime}
								</Typography>
							</Box>
						</Box>

						{/* Top-right: zoom + shared actions */}
						<Box
							sx={{
								position: "absolute",
								top: 0,
								right: 0,
								display: "flex",
								gap: 0.5,
								alignItems: "center",
								backgroundColor: "rgba(0,0,0,0.35)",
								borderRadius: 1,
								p: 0.25,
								opacity: showVideoControls ? 1 : 0,
								transition: "opacity 0.3s ease",
								pointerEvents: showVideoControls ? "auto" : "none",
							}}
						>
							{!isVideo && (
								<>
									<Tooltip title="Thu nhỏ (Scroll down)">
										<span>
											<IconButton
												size="small"
												onClick={handleZoomOut}
												disabled={zoom <= ZOOM_MIN}
												sx={{ color: "white" }}
											>
												<ZoomOutIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
									<Box
										sx={{
											color: "white",
											fontSize: 12,
											display: "flex",
											alignItems: "center",
											px: 0.5,
											minWidth: 36,
											justifyContent: "center",
										}}
									>
										{Math.round(zoom * 100)}%
									</Box>
									<Tooltip title="Phóng to (Scroll up)">
										<span>
											<IconButton
												size="small"
												onClick={handleZoomIn}
												disabled={zoom >= ZOOM_MAX}
												sx={{ color: "white" }}
											>
												<ZoomInIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
								</>
							)}
							<Tooltip title="Tải về">
								<span>
									<IconButton
										size="small"
										onClick={handleDownload}
										disabled={!selectedUrl}
										sx={{ color: "white" }}
									>
										<DownloadIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
							{onNavigateToMessage && (
								<Tooltip title="Đến tin nhắn gốc">
									<span>
										<IconButton
											size="small"
											onClick={handleNavigateToMessage}
											disabled={!selectedMessage}
											sx={{ color: "white" }}
										>
											<OpenInNewIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
							)}
						</Box>

						{/* Video controls */}
						{isVideo && (
							<Box
								sx={{
									opacity: showVideoControls ? 1 : 0,
									transition: "opacity 0.3s ease",
									pointerEvents: showVideoControls ? "auto" : "none",
								}}
							>
								<VideoControls
									videoPlaying={videoPlaying}
									videoSpeed={videoSpeed}
									videoCurrentTime={videoCurrentTime}
									videoDuration={videoDuration}
									videoMuted={videoMuted}
									videoVolume={videoVolume}
									videoRenderedWidth={videoRenderedWidth}
									isFullscreen={isFullscreen}
									canSeek={canSeek}
									selectedUrl={selectedUrl}
									onPlayPause={handleVideoPlayPause}
									onRestart={handleVideoRestart}
									onToggleMute={handleToggleMute}
									onVolumeChange={handleVolumeChange}
									onSpeedChange={handleSpeedChange}
									onSeekBackward={handleSeekBackward}
									onSeekForward={handleSeekForward}
									onToggleFullscreen={handleToggleFullscreen}
									onSeek={(t) => {
										if (videoRef.current) videoRef.current.currentTime = t;
										setVideoCurrentTime(t);
									}}
								/>
							</Box>
						)}
					</Box>
				</Box>

				{/* Thumbnail sidebar */}
				<Box
					sx={{
						width: 100,
						height: "100%",
						overflowY: "auto",
						backgroundColor: "background.paper",
						borderRadius: 2,
						pt: 1,
						pr: 1,
						pl: 1,
					}}
				>
					{Object.entries(groupedMedia)
						.sort(([a], [b]) => b.localeCompare(a))
						.map(([dateKey, items]) => (
							<Box key={dateKey}>
								<Box
									sx={{
										fontSize: 12,
										fontWeight: 700,
										color: "rgba(255,255,255,.7)",
										mb: 1,
										mt: 1,
									}}
								>
									{formatDateV2(dateKey)}
								</Box>
								{items.map((msg) => (
									<Box
										key={msg.id}
										onClick={() => selectMedia(msg.id)}
										sx={{ cursor: "pointer", mb: 1, borderRadius: 4 }}
									>
										{msg.message_type === "video" ? (
											<Box
												sx={{
													position: "relative",
													width: "100%",
													height: 80,
													borderRadius: 1,
													overflow: "hidden",
													border:
														msg.id === selectedMediaId
															? "2px solid #f5a461"
															: "1px solid rgba(255,255,255,.18)",
													bgcolor: "rgba(0,0,0,0.4)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Box
													component="video"
													src={resolveCdnUrl(msg.content)}
													preload="metadata"
													muted
													sx={{
														width: "100%",
														height: "100%",
														objectFit: "cover",
													}}
												/>
												<PlayArrowIcon
													sx={{
														position: "absolute",
														fontSize: 22,
														color: "white",
														opacity: 0.9,
														filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
														backgroundColor: "rgba(0,0,0,.5)",
														borderRadius: "50%",
													}}
												/>
												{msg.metadata?.duration && (
													<Typography
														variant="caption"
														sx={{
															position: "absolute",
															bottom: 2,
															right: 4,
															color: "#fff",
															fontSize: 9,
															fontWeight: 600,
															textShadow: "0 1px 2px rgba(0,0,0,0.8)",
														}}
													>
														{formatVideoTime(msg.metadata.duration / 1000)}
													</Typography>
												)}
											</Box>
										) : (
											<img
												src={resolveCdnUrl(msg.content)}
												alt=""
												style={{
													width: "100%",
													height: 80,
													objectFit: "cover",
													borderRadius: 4,
													border:
														msg.id === selectedMediaId
															? "2px solid #f5a461"
															: "1px solid rgba(255,255,255,.18)",
												}}
											/>
										)}
									</Box>
								))}
							</Box>
						))}
				</Box>
			</Box>
		</Dialog>
	);
}

const formatVideoTime = (sec: number) => {
	const s = Math.floor(sec);
	const hrs = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (hrs > 0) {
		return `${hrs}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
	}
	return `${m}:${String(s % 60).padStart(2, "0")}`;
};

export default ImageGalleryModal;
