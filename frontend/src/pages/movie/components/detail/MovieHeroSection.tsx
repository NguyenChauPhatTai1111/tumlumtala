import CloseIcon from "@mui/icons-material/Close";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
	alpha,
	Box,
	Button,
	Chip,
	Fade,
	IconButton,
	Skeleton,
	Stack,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { MOVIE_STATUS_LABEL, MOVIE_TYPE_LABELS } from "@pages/movie/constants";
import type {
	OphimCategory,
	OphimCountry,
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import { formatEpisode } from "@pages/movie/utils";
import type React from "react";
import { CountryFlag } from "./CountryFlag";
import { UserScoreCircle } from "./UserScoreCircle";

export const MovieHeroSection = ({
	movie,
	heroRef,
	trailerIframeRef,
	trailerState,
	dispatchTrailer,
	trailerEmbedUrl,
	effectiveIframeUrl,
	trailerDismissedRef,
	isFullscreen,
	heroImageUrl,
	posterImageUrl,
	tmdbRating,
	tmdbCount,
	tmdbDetails,
	imdbRating,
	detail,
	episodes,
	hasValidEpisodes,
	resumeServer,
	resumeEp,
	tagline,
	categories,
	countries,
	ageRating,
	liked,
	episodeCurrent,
	isMultiEpisodeMovie,
	episodeTotal,
	hasTapWord,
	isMobile,
	isLoading,
	autoPlayTimerRef,
	trailerCountdownIntervalRef,
	trailerAutoUnmutedRef,
	onClose,
	onLike,
	handleBrowseGenre,
	handleBrowseCountry,
	handleBrowseYear,
	handlePlayEpisode,
}: {
	movie: OphimMovieItem;
	heroRef: React.RefObject<HTMLDivElement | null>;
	trailerIframeRef: React.RefObject<HTMLIFrameElement | null>;
	trailerState: {
		active: boolean;
		visible: boolean;
		ending: boolean;
		paused: boolean;
		muted: boolean;
		key: number;
		expandedHeight: number | null;
	};
	dispatchTrailer: React.Dispatch<
		| { type: "reset" }
		| { type: "start" }
		| { type: "show"; height: number | null }
		| { type: "end" }
		| { type: "stop" }
		| { type: "toggleMute" }
		| { type: "setMuted"; value: boolean }
		| { type: "togglePause" }
		| { type: "setPaused"; value: boolean }
		| { type: "reload" }
	>;
	trailerEmbedUrl: string;
	effectiveIframeUrl: string;
	trailerDismissedRef: React.MutableRefObject<boolean>;
	isFullscreen: boolean;
	heroImageUrl: string;
	posterImageUrl: string;
	tmdbRating?: number | null;
	tmdbCount?: number | null;
	tmdbDetails: {
		data?: { tmdbId?: string | null; tmdbType?: string | null } | null;
	};
	imdbRating?: number | null;
	detail?: OphimMovieDetail;
	episodes: OphimEpisodeServer[];
	hasValidEpisodes: boolean;
	resumeServer?: OphimEpisodeServer;
	resumeEp?: OphimEpisodeData;
	tagline?: string | null;
	categories: OphimCategory[];
	countries: OphimCountry[];
	ageRating?: string | null;
	liked: boolean;
	episodeCurrent?: string | null;
	isMultiEpisodeMovie: boolean;
	episodeTotal?: string | null;
	hasTapWord: boolean;
	isMobile: boolean;
	isLoading?: boolean;
	autoPlayTimerRef: React.MutableRefObject<ReturnType<
		typeof setTimeout
	> | null>;
	trailerCountdownIntervalRef: React.MutableRefObject<ReturnType<
		typeof setTimeout
	> | null>;
	trailerAutoUnmutedRef: React.MutableRefObject<boolean>;
	onClose: () => void;
	onLike: (rating?: string) => void;
	handleBrowseGenre: (cat: OphimCategory) => void;
	handleBrowseCountry: (country: OphimCountry) => void;
	handleBrowseYear: (year: number) => void;
	handlePlayEpisode: (
		m: OphimMovieItem,
		d: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
}) => {
	const theme = useTheme();
	const trailerActive = trailerState.active;
	const trailerVisible = trailerState.visible;
	const trailerEnding = trailerState.ending;
	const trailerPaused = trailerState.paused;
	const muted = trailerState.muted;
	const trailerKey = trailerState.key;
	const trailerExpandedHeight = trailerState.expandedHeight;

	const toggleMute = () => {
		const func = muted ? "unMute" : "mute";
		trailerIframeRef.current?.contentWindow?.postMessage(
			JSON.stringify({ event: "command", func, args: [] }),
			"*",
		);
		dispatchTrailer({ type: "toggleMute" });
	};

	const toggleTrailerPlayback = () => {
		const func = trailerPaused ? "playVideo" : "pauseVideo";
		trailerIframeRef.current?.contentWindow?.postMessage(
			JSON.stringify({ event: "command", func, args: [] }),
			"*",
		);
		dispatchTrailer({ type: "togglePause" });
	};

	const reloadTrailer = () => {
		trailerAutoUnmutedRef.current = false;
		dispatchTrailer({ type: "reload" });
	};

	return (
		<Box
			ref={heroRef}
			sx={{
				position: "relative",
				overflow: "hidden",
				height:
					trailerVisible && trailerExpandedHeight
						? trailerExpandedHeight
						: isLoading
							? { xs: 140, sm: 160 }
							: { xs: 260, sm: 300 },
				transition: "height 0.5s ease",
			}}
		>
			{/* Background poster */}
			{heroImageUrl && (
				<Box
					component="img"
					src={heroImageUrl}
					aria-hidden
					onError={(e) => {
						const img = e.currentTarget as HTMLImageElement;
						if (!img.src.endsWith("/placeholder-backdrop.svg")) {
							img.onerror = null;
							img.src = "/placeholder-backdrop.svg";
						}
					}}
					sx={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
						transform: "scale(1.25)",
						opacity: 0.85,
						pointerEvents: "none",
						userSelect: "none",
					}}
				/>
			)}
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					backgroundImage:
						"radial-gradient(black 1px, rgba(255,255,255,.8) 1.5px)",
					backgroundSize: "3px 3px",
					opacity: 0.25,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(90deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.55) 30%, rgba(0,0,0,.75) 65%, rgba(0,0,0,.88) 100%)",
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(circle at center, transparent 20%, rgba(0,0,0,.45) 100%)",
				}}
			/>

			{/* Close dialog — hidden during fullscreen (CloseFullscreenIcon takes over) */}
			{!isFullscreen && (
				<IconButton
					onClick={onClose}
					size="small"
					sx={{
						position: "absolute",
						top: 8,
						right: 8,
						zIndex: 20,
						bgcolor: alpha(theme.palette.common.black, 0.45),
						color: "white",
						"&:hover": {
							bgcolor: alpha(theme.palette.common.black, 0.65),
						},
					}}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			)}

			{/* Trailer — always mounted when active so audio plays; visibility controlled by opacity/zIndex */}
			{trailerActive && Boolean(trailerEmbedUrl) && (
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						zIndex: trailerVisible ? 10 : -1,
						opacity: trailerVisible && !trailerEnding ? 1 : 0,
						transition: "opacity 1s ease",
					}}
				>
					<Box
						key={trailerKey}
						component="iframe"
						ref={trailerIframeRef}
						src={
							effectiveIframeUrl && !trailerDismissedRef.current
								? `${effectiveIframeUrl}&controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
								: ""
						}
						allow="autoplay; encrypted-media; fullscreen"
						allowFullScreen
						sx={{
							position: "absolute",
							left: 0,
							width: "100%",
							aspectRatio: "16/9",
							top: "50%",
							transform: "translateY(-50%)",
							border: "none",
							display: "block",
							pointerEvents: "none",
						}}
					/>
					<Box
						sx={{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							height: "50%",
							background: `linear-gradient(to top, ${theme.palette.background.paper}, transparent)`,
							pointerEvents: "none",
						}}
					/>
					{/* Bottom-left controls: Sound + Stop/Start */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						sx={{
							position: "absolute",
							bottom: { xs: 10, sm: 14, md: 20 },
							left: { xs: 8, sm: 24, md: 45 },
						}}
					>
						<Tooltip title={muted ? "Bật âm thanh" : "Tắt âm thanh"}>
							<IconButton
								size="small"
								onClick={toggleMute}
								sx={{
									bgcolor: alpha(theme.palette.common.black, 0.6),
									color: "rgba(255,255,255,0.75)",
									border: `1px solid ${alpha("#fff", 0.2)}`,
									width: { xs: 28, sm: 31, md: 35 },
									height: { xs: 28, sm: 31, md: 35 },
									"&:hover": {
										bgcolor: alpha(theme.palette.common.black, 0.85),
										color: "white",
									},
								}}
							>
								{muted ? (
									<VolumeOffIcon
										sx={{ fontSize: { xs: 13, sm: 14, md: 16 } }}
									/>
								) : (
									<VolumeUpIcon sx={{ fontSize: { xs: 13, sm: 14, md: 16 } }} />
								)}
							</IconButton>
						</Tooltip>
						<Tooltip
							title={trailerPaused ? "Tiếp tục trailer" : "Dừng trailer"}
						>
							<IconButton
								size="small"
								onClick={toggleTrailerPlayback}
								sx={{
									bgcolor: alpha(theme.palette.common.black, 0.6),
									color: "rgba(255,255,255,0.75)",
									border: `1px solid ${alpha("#fff", 0.2)}`,
									width: { xs: 28, sm: 31, md: 35 },
									height: { xs: 28, sm: 31, md: 35 },
									"&:hover": {
										bgcolor: alpha(theme.palette.common.black, 0.85),
										color: "white",
									},
								}}
							>
								{trailerPaused ? (
									<PlayArrowIcon
										sx={{ fontSize: { xs: 13, sm: 14, md: 16 } }}
									/>
								) : (
									<PauseIcon sx={{ fontSize: { xs: 13, sm: 14, md: 16 } }} />
								)}
							</IconButton>
						</Tooltip>
						<Tooltip title="Tải lại trailer">
							<IconButton
								size="small"
								onClick={reloadTrailer}
								sx={{
									bgcolor: alpha(theme.palette.common.black, 0.6),
									color: "rgba(255,255,255,0.75)",
									border: `1px solid ${alpha("#fff", 0.2)}`,
									width: { xs: 28, sm: 31, md: 35 },
									height: { xs: 28, sm: 31, md: 35 },
									"&:hover": {
										bgcolor: alpha(theme.palette.common.black, 0.85),
										color: "white",
									},
								}}
							>
								<RefreshIcon sx={{ fontSize: { xs: 13, sm: 14, md: 16 } }} />
							</IconButton>
						</Tooltip>
					</Stack>

					{/* Bottom-right controls: Expand + Hide */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						sx={{
							position: "absolute",
							bottom: { xs: 10, sm: 14, md: 20 },
							right: { xs: 8, sm: 24, md: 45 },
						}}
					>
						<Button
							size="small"
							startIcon={
								isFullscreen ? (
									<CloseFullscreenIcon
										sx={{ fontSize: { xs: 12, sm: 13, md: 14 } }}
									/>
								) : (
									<OpenInFullIcon
										sx={{ fontSize: { xs: 12, sm: 13, md: 14 } }}
									/>
								)
							}
							onClick={() =>
								isFullscreen
									? document.exitFullscreen()
									: heroRef.current?.requestFullscreen()
							}
							sx={{
								bgcolor: alpha(theme.palette.common.black, 0.6),
								color: "rgba(255,255,255,0.75)",
								fontSize: { xs: 10, sm: 10.5, md: 11 },
								px: { xs: 0.75, sm: 1, md: 1.25 },
								py: { xs: 0.25, sm: 0.375, md: 0.5 },
								borderRadius: 1,
								textTransform: "none",
								border: `1px solid ${alpha("#fff", 0.2)}`,
								"&:hover": {
									bgcolor: alpha(theme.palette.common.black, 0.85),
									color: "white",
								},
							}}
						>
							{isFullscreen ? "Thu nhỏ" : "Phóng to"}
						</Button>
						{!isFullscreen && (
							<Button
								size="small"
								startIcon={
									<VisibilityOffIcon
										sx={{ fontSize: { xs: 12, sm: 13, md: 15 } }}
									/>
								}
								onClick={() => {
									trailerDismissedRef.current = true;
									dispatchTrailer({ type: "stop" });
									dispatchTrailer({ type: "reset" });
								}}
								sx={{
									bgcolor: alpha(theme.palette.common.black, 0.6),
									color: "rgba(255,255,255,0.75)",
									fontSize: { xs: 10, sm: 11 },
									px: { xs: 0.75, sm: 1.25 },
									py: { xs: 0.25, sm: 0.5 },
									borderRadius: 1,
									textTransform: "none",
									border: `1px solid ${alpha("#fff", 0.2)}`,
									"&:hover": {
										bgcolor: alpha(theme.palette.common.black, 0.85),
										color: "white",
									},
								}}
							>
								Ẩn trailer
							</Button>
						)}
					</Stack>
				</Box>
			)}

			{/* Info — absolute so it doesn't push height; fades out when trailer plays */}
			<Fade in={!trailerVisible || trailerEnding} timeout={300}>
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						zIndex: 1,
						display: "flex",
						gap: { xs: 1.5, sm: 2.5 },
						p: { xs: 2, sm: 3 },
						alignItems: "center",
						opacity: isLoading ? 0.6 : 1,
						transition: "opacity 0.25s ease",
					}}
				>
					<Box
						sx={{
							position: "relative",
							width: { xs: 90, sm: 140 },
							aspectRatio: "2/3",
							flexShrink: 0,
						}}
					>
						{isLoading ? (
							<Skeleton
								variant="rectangular"
								width="100%"
								height="100%"
								sx={{ borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.1)" }}
							/>
						) : (
							<>
								<Box
									component="img"
									src={posterImageUrl || "/placeholder-poster.svg"}
									aria-hidden
									onError={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										if (!img.src.endsWith("/placeholder-poster.svg")) {
											img.onerror = null;
											img.src = "/placeholder-poster.svg";
										}
									}}
									sx={{
										position: "absolute",
										inset: -20,
										width: "calc(100% + 35px)",
										height: "calc(100% + 35px)",
										objectFit: "cover",
										filter: "blur(30px) brightness(5.5)",
										opacity: 0.7,
										transform: "scale(1.1)",
										pointerEvents: "none",
										zIndex: 0,
									}}
								/>
								<Box
									component="img"
									src={posterImageUrl || "/placeholder-poster.svg"}
									alt={movie.name}
									onError={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										if (!img.src.endsWith("/placeholder-poster.svg")) {
											img.onerror = null;
											img.src = "/placeholder-poster.svg";
										}
									}}
									sx={{
										position: "relative",
										width: "100%",
										height: "100%",
										objectFit: "cover",
										borderRadius: 1.5,
										zIndex: 1,
										boxShadow: "0 8px 32px rgba(0,0,0,.6)",
									}}
								/>
							</>
						)}
					</Box>

					<Box sx={{ flex: 1, minWidth: 0 }}>
						{isLoading ? (
							<Stack spacing={1} sx={{ pt: 0.5 }}>
								<Skeleton
									variant="text"
									width="70%"
									height={28}
									sx={{ bgcolor: "rgba(255,255,255,0.12)" }}
								/>
								<Skeleton
									variant="text"
									width="45%"
									height={18}
									sx={{ bgcolor: "rgba(255,255,255,0.08)" }}
								/>
								<Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
									<Skeleton
										variant="rounded"
										width={52}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}
									/>
									<Skeleton
										variant="rounded"
										width={80}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}
									/>
									<Skeleton
										variant="rounded"
										width={36}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}
									/>
								</Stack>
								<Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
									<Skeleton
										variant="rounded"
										width={60}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 11 }}
									/>
									<Skeleton
										variant="rounded"
										width={72}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 11 }}
									/>
									<Skeleton
										variant="rounded"
										width={48}
										height={22}
										sx={{ bgcolor: "rgba(255,255,255,0.1)", borderRadius: 11 }}
									/>
								</Stack>
							</Stack>
						) : (
							<>
								<Typography
									variant="h6"
									sx={{
										fontWeight: 900,
										color: "white",
										lineHeight: 1.25,
										mb: 0.25,
										fontSize: { xs: "1rem", sm: "1.15rem" },
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
									}}
								>
									{movie.name}
								</Typography>
								{movie.origin_name && movie.origin_name !== movie.name && (
									<Typography
										variant="body2"
										sx={{
											color: alpha("#fff", 0.65),
											mb: 0.75,
											fontStyle: "italic",
										}}
									>
										{movie.origin_name}
									</Typography>
								)}
								{(tmdbRating != null ||
									imdbRating != null ||
									episodes.length > 0) && (
									<Stack
										direction="row"
										spacing={1.5}
										alignItems="center"
										flexWrap="wrap"
										useFlexGap
										sx={{ mb: 0.75 }}
									>
										{tmdbRating != null && (
											<UserScoreCircle
												score={tmdbRating}
												count={tmdbCount}
												tmdbId={tmdbDetails.data?.tmdbId}
												tmdbType={tmdbDetails.data?.tmdbType}
											/>
										)}
										{imdbRating != null && detail?.imdb?.id && (
											<Box
												component="a"
												href={`https://www.imdb.com/title/${detail.imdb.id}/`}
												target="_blank"
												rel="noopener noreferrer"
												sx={{
													display: "inline-flex",
													alignItems: "center",
													bgcolor: alpha(theme.palette.warning.main, 0.15),
													border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
													borderRadius: 0.5,
													px: 0.75,
													fontSize: 11,
													lineHeight: 1.6,
													fontWeight: 700,
													textDecoration: "none",
													cursor: "pointer",
												}}
											>
												<Box
													component="span"
													sx={{ color: theme.palette.warning.main }}
												>
													IMDb
												</Box>
												<Box component="span" sx={{ color: "#fff", ml: 0.5 }}>
													{imdbRating.toFixed(1)}
												</Box>
											</Box>
										)}
										{episodes.length > 0 && (
											<Tooltip
												title={
													!hasValidEpisodes
														? "Phim chưa có tập nào"
														: isMobile
															? hasValidEpisodes
																? movie.watchProgress &&
																	!movie.watchProgress.completed
																	? "Tiếp tục"
																	: "Xem ngay"
																: "Sắp chiếu"
															: ""
												}
											>
												<span>
													<Box
														component="button"
														disabled={!hasValidEpisodes}
														onClick={() => {
															if (!detail || !resumeServer || !resumeEp) return;
															handlePlayEpisode(
																movie,
																detail,
																resumeServer,
																resumeEp,
															);
														}}
														sx={{
															display: "inline-flex",
															alignItems: "center",
															justifyContent: "center",
															gap: 0.75,
															border: "none",
															cursor: hasValidEpisodes ? "pointer" : "default",
															opacity: hasValidEpisodes ? 1 : 0.45,
															bgcolor: "primary.main",
															color: "primary.contrastText",
															fontFamily: "inherit",
															fontWeight: 800,
															fontSize: 13,
															borderRadius: { xs: "50%", sm: 1.5 },
															width: { xs: 36, sm: "auto" },
															height: { xs: 36, sm: "auto" },
															px: { xs: 0, sm: 1.5 },
															py: { xs: 0, sm: 0.625 },
															transition: "background-color 0.2s",
															"&:hover": hasValidEpisodes
																? { bgcolor: "primary.dark" }
																: {},
														}}
													>
														<PlayArrowIcon sx={{ fontSize: 18 }} />
														<Box
															component="span"
															sx={{ display: { xs: "none", sm: "inline" } }}
														>
															{hasValidEpisodes
																? movie.watchProgress &&
																	!movie.watchProgress.completed
																	? "Tiếp tục"
																	: "Xem ngay"
																: "Sắp chiếu"}
														</Box>
													</Box>
												</span>
											</Tooltip>
										)}
									</Stack>
								)}
								{tagline && (
									<Typography
										variant="body2"
										sx={{
											color: alpha("#fff", 0.75),
											fontStyle: "italic",
											mb: 0.75,
											fontSize: { xs: "0.75rem", sm: "0.8rem" },
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
										}}
									>
										{tagline}
									</Typography>
								)}
								{categories.length > 0 && (
									<Stack
										direction="row"
										flexWrap="wrap"
										gap={0.5}
										sx={{ my: 1 }}
									>
										{categories.map((cat, i) => (
											<Chip
												key={cat.id || cat.slug || i}
												label={cat.name}
												size="small"
												onClick={() => handleBrowseGenre(cat)}
												sx={{
													bgcolor: alpha(theme.palette.error.main, 0.75),
													color: "white",
													fontWeight: 700,
													fontSize: 11,
													height: 22,
													cursor: "pointer",
													"&:hover": { bgcolor: theme.palette.error.main },
												}}
											/>
										))}
									</Stack>
								)}
								<Stack
									direction="row"
									flexWrap="wrap"
									gap={0.5}
									alignItems="center"
									useFlexGap
								>
									{countries.map((c, i) => (
										<Chip
											key={c.id || c.slug || i}
											label={
												<Box
													component="span"
													sx={{
														display: "flex",
														alignItems: "center",
														gap: "4px",
													}}
												>
													<CountryFlag slug={c.slug} size={13} />
													{c.name}
												</Box>
											}
											size="small"
											onClick={() => handleBrowseCountry(c)}
											sx={{
												bgcolor: alpha("#fff", 0.14),
												color: "white",
												fontSize: 11,
												height: 22,
												cursor: "pointer",
												"&:hover": { bgcolor: alpha("#fff", 0.26) },
												"& .MuiChip-label": { px: "8px" },
											}}
										/>
									))}
									{(movie.year ?? 0) > 0 && (
										<Chip
											label={movie.year}
											size="small"
											onClick={() => handleBrowseYear(movie.year)}
											sx={{
												bgcolor: alpha("#fff", 0.14),
												color: "white",
												fontSize: 11,
												height: 22,
												cursor: "pointer",
												"&:hover": { bgcolor: alpha("#fff", 0.26) },
											}}
										/>
									)}
									{movie.type && (
										<Chip
											label={MOVIE_TYPE_LABELS[movie.type] ?? movie.type}
											size="small"
											sx={{
												bgcolor: alpha(theme.palette.primary.main, 0.7),
												color: "white",
												fontSize: 11,
												height: 22,
											}}
										/>
									)}
									{detail?.status && (
										<Chip
											label={MOVIE_STATUS_LABEL[detail.status] ?? detail.status}
											size="small"
											sx={{
												bgcolor:
													detail.status === "completed"
														? alpha(theme.palette.success.main, 0.7)
														: alpha(theme.palette.warning.main, 0.7),
												color: "white",
												fontSize: 11,
												height: 22,
											}}
										/>
									)}
									{detail?.quality && (
										<Chip
											label={detail.quality}
											size="small"
											sx={{
												bgcolor: alpha(theme.palette.primary.main, 0.85),
												color: "white",
												fontSize: 11,
												fontWeight: 700,
												height: 22,
											}}
										/>
									)}
									{ageRating &&
										(() => {
											const ratingColor =
												ageRating === "T18"
													? theme.palette.error.main
													: ageRating === "T16"
														? theme.palette.warning.main
														: theme.palette.info.main;
											return (
												<Chip
													label={ageRating}
													size="small"
													sx={{
														bgcolor: alpha(ratingColor, 0.2),
														color: ratingColor,
														fontSize: 11,
														fontWeight: 700,
														height: 22,
														border: `1px solid ${alpha(ratingColor, 0.7)}`,
														"@keyframes certGlowChip": {
															"0%, 100%": {
																boxShadow: `0 0 4px ${alpha(ratingColor, 0.4)}, 0 0 8px ${alpha(ratingColor, 0.2)}`,
															},
															"50%": {
																boxShadow: `0 0 8px ${alpha(ratingColor, 0.8)}, 0 0 16px ${alpha(ratingColor, 0.5)}`,
															},
														},
														animation: "certGlowChip 2s ease-in-out infinite",
													}}
												/>
											);
										})()}
									<Tooltip title={liked ? "Bỏ thích" : "Yêu thích"}>
										<IconButton
											size="small"
											onClick={() => onLike(ageRating ?? undefined)}
											sx={{
												bgcolor: liked ? "error.main" : alpha("#fff", 0.14),
												color: liked ? "white" : "error.light",
												border: `1.5px solid ${theme.palette.error.main}`,
												"&:hover": {
													bgcolor: liked
														? "error.dark"
														: alpha(theme.palette.error.main, 0.2),
												},
												width: 28,
												height: 28,
											}}
										>
											{liked ? (
												<FavoriteIcon sx={{ fontSize: 16 }} />
											) : (
												<FavoriteBorderIcon sx={{ fontSize: 16 }} />
											)}
										</IconButton>
									</Tooltip>
								</Stack>
								{episodeCurrent && isMultiEpisodeMovie && (
									<Typography
										variant="caption"
										sx={{
											color: alpha("#fff", 0.55),
											mt: 0.75,
											display: "block",
										}}
									>
										{formatEpisode(episodeCurrent ?? "")}
										{episodeTotal &&
											!/ho[àa]n\s*t[aấ]t/i.test(episodeCurrent ?? "") &&
											` / ${episodeTotal}${hasTapWord ? "" : " tập"}`}
									</Typography>
								)}
							</>
						)}
					</Box>
					{trailerEmbedUrl && !trailerVisible && (
						<Button
							size="small"
							startIcon={<OndemandVideoIcon sx={{ fontSize: 15 }} />}
							onClick={() => {
								if (autoPlayTimerRef.current) {
									clearTimeout(autoPlayTimerRef.current);
									autoPlayTimerRef.current = null;
								}
								if (trailerCountdownIntervalRef.current) {
									clearTimeout(trailerCountdownIntervalRef.current);
									trailerCountdownIntervalRef.current = null;
								}
								trailerDismissedRef.current = false;
								trailerAutoUnmutedRef.current = false;
								const height = heroRef.current
									? Math.round((heroRef.current.offsetWidth * 9) / 16)
									: null;
								dispatchTrailer({ type: "reload" });
								dispatchTrailer({ type: "start" });
								dispatchTrailer({ type: "show", height });
							}}
							sx={{
								position: "absolute",
								bottom: 10,
								right: 12,
								zIndex: 5,
								bgcolor: alpha(theme.palette.common.black, 0.6),
								color: "rgba(255,255,255,0.75)",
								fontSize: 11,
								px: 1.25,
								py: 0.5,
								borderRadius: 1,
								textTransform: "none",
								border: `1px solid ${alpha("#fff", 0.2)}`,
								"&:hover": {
									bgcolor: alpha(theme.palette.common.black, 0.85),
									color: "white",
								},
							}}
						>
							Xem trailer
						</Button>
					)}
				</Box>
			</Fade>
		</Box>
	);
};
