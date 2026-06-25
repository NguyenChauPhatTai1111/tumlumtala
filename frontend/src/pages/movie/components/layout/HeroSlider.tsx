import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import {
	alpha,
	Box,
	Button,
	Chip,
	IconButton,
	Skeleton,
	Stack,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import type { OphimMovieItem } from "@pages/movie/types";
import { useQueries } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { getMovieDetail, resolveThumb } from "@/services/movieService";
import {
	getTMDBImages,
	resolveTMDBBackdrop,
	resolveTMDBPoster,
} from "@/services/tmdbService";
import { stripHtml } from "@pages/movie/utils";

export const HERO_MOVIE_COUNT = 5;

// Mobile thumbnail dimensions (poster 2:3)
const MOBILE_THUMB_W = 54;
const MOBILE_THUMB_H = 76;
const MOBILE_THUMB_OVERFLOW = MOBILE_THUMB_H / 2;

interface HeroSliderProps {
	movies: OphimMovieItem[];
	loading: boolean;
	likedSlugs?: Set<string>;
	onSelect: (movie: OphimMovieItem) => void;
	onPlay?: (movie: OphimMovieItem) => void;
	onLike?: (movie: OphimMovieItem) => void;
}

export function HeroSlider({
	movies,
	loading,
	likedSlugs,
	onSelect,
	onPlay,
	onLike,
}: HeroSliderProps) {
	const theme = useTheme();
	const isMobileAndTablet = useMediaQuery(theme.breakpoints.down("md"));
	const [activeIndex, setActiveIndex] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);
	const [dragDx, setDragDx] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const pointerStart = useRef<{ x: number; t: number } | null>(null);
	const hasDragged = useRef(false);

	const total = movies.length;

	const detailQueries = useQueries({
		queries: movies.map((movie) => ({
			queryKey: ["movie", "detail", movie.slug],
			queryFn: () => getMovieDetail(movie.slug),
			enabled: Boolean(movie.slug),
			staleTime: 1000 * 60 * 5,
			retry: false as const,
		})),
	});

	const tmdbQueries = useQueries({
		queries: movies.map((_, i) => {
			const tmdb = detailQueries[i].data?.movie?.tmdb;
			const tmdbId = tmdb?.id ?? null;
			const tmdbType: "movie" | "tv" = tmdb?.type === "tv" ? "tv" : "movie";
			return {
				queryKey: ["tmdb", "images", tmdbType, tmdbId],
				queryFn: async () => {
					const data = await getTMDBImages(tmdbId as string, tmdbType);
					return {
						backdrop: resolveTMDBBackdrop(data),
						poster: resolveTMDBPoster(data),
					};
				},
				enabled: Boolean(tmdbId),
				staleTime: 1000 * 60 * 60 * 24,
				retry: false as const,
			};
		}),
	});

	const getSlideBackdrop = (movie: OphimMovieItem, i: number): string =>
		tmdbQueries[i]?.data?.backdrop ??
		resolveThumb(movie.thumb_url || movie.poster_url);

	const getSlidePoster = (movie: OphimMovieItem, i: number): string =>
		tmdbQueries[i]?.data?.poster ??
		resolveThumb(movie.poster_url || movie.thumb_url);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		setContainerWidth(el.offsetWidth);
		const ro = new ResizeObserver((entries) => {
			setContainerWidth(entries[0].contentRect.width);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const goTo = (idx: number) => {
		setActiveIndex(((idx % total) + total) % total);
	};

	const onPointerDown = (e: React.PointerEvent) => {
		pointerStart.current = { x: e.clientX, t: Date.now() };
		hasDragged.current = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: React.PointerEvent) => {
		if (!pointerStart.current) return;
		const dx = e.clientX - pointerStart.current.x;
		if (Math.abs(dx) > 8) {
			hasDragged.current = true;
			setIsDragging(true);
		}
		if (hasDragged.current) setDragDx(dx);
	};

	const onPointerUp = (e: React.PointerEvent) => {
		if (!pointerStart.current) return;
		const dx = e.clientX - pointerStart.current.x;
		const dt = Date.now() - pointerStart.current.t;
		pointerStart.current = null;
		setDragDx(0);
		setIsDragging(false);
		const slideW = containerWidth || 400;
		if (
			hasDragged.current &&
			(Math.abs(dx) > slideW * 0.18 || (Math.abs(dx) > 60 && dt < 400))
		) {
			goTo(activeIndex + (dx < 0 ? 1 : -1));
		}
		setTimeout(() => {
			hasDragged.current = false;
		}, 50);
	};

	const dragDir = dragDx < 0 ? 1 : -1;
	const pendingIndex =
		isDragging && dragDx !== 0 ? (activeIndex + dragDir + total) % total : -1;
	const fadeProgress =
		pendingIndex >= 0
			? Math.min(Math.abs(dragDx) / ((containerWidth || 400) * 0.45), 1)
			: 0;

	const slideOpacity = (i: number): number => {
		if (i === activeIndex) return pendingIndex >= 0 ? 1 - fadeProgress : 1;
		if (i === pendingIndex) return fadeProgress;
		return 0;
	};

	// Desktop uses original heights; mobile is slightly shorter (thumbs overflow below)
	const desktopH = { sm: 420, md: 480, lg: 520, xl: 750 };
	const mobileH = 300;

	if (loading && !total) {
		return (
			<Box
				ref={containerRef}
				sx={{
					width: "100%",
					pb: isMobileAndTablet ? `${MOBILE_THUMB_OVERFLOW}px` : 0,
				}}
			>
				<Skeleton
					variant="rectangular"
					sx={{ width: "100%", height: isMobileAndTablet ? mobileH : desktopH }}
				/>
			</Box>
		);
	}

	if (!total) return null;

	const activeMovie = movies[activeIndex];
	const activeDetail = detailQueries[activeIndex]?.data?.movie;

	// ─────────────────────────────────────────────────────────────
	// MOBILE: outer wrapper has overflow:visible + pb for overflow;
	//         inner clip box contains slides+overlays+info.
	//         Thumbnail row is absolutely positioned on the outer
	//         wrapper so it bleeds below the clip box edge.
	// ─────────────────────────────────────────────────────────────
	if (isMobileAndTablet) {
		return (
			<Box
				sx={{
					width: "100%",
					position: "relative",
					pb: `${MOBILE_THUMB_OVERFLOW}px`,
					flexShrink: 0,
				}}
			>
				{/* Clip box */}
				<Box
					ref={containerRef}
					sx={{
						width: "100%",
						position: "relative",
						height: mobileH,
						overflow: "hidden",
						cursor: isDragging ? "grabbing" : "grab",
						userSelect: "none",
					}}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				>
					{/* Background slides */}
					{movies.map((movie, i) => (
						<Box
							key={movie._id}
							sx={{
								position: "absolute",
								inset: 0,
								opacity: slideOpacity(i),
								transition: isDragging ? "none" : "opacity 0.45s ease",
								willChange: "opacity",
							}}
						>
							<Box
								component="img"
								src={getSlideBackdrop(movie, i)}
								alt={movie.name}
								draggable={false}
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
									objectPosition: "center top",
									pointerEvents: "none",
									userSelect: "none",
								}}
							/>
						</Box>
					))}

					{/* Dot pattern */}
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							backgroundImage:
								"radial-gradient(black 1px, rgba(255,255,255,0.2) 1.5px)",
							backgroundSize: "3px 3px",
							opacity: 0.2,
							pointerEvents: "none",
							zIndex: 1,
						}}
					/>

					{/* Left gradient */}
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							background:
								"linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.15) 100%)",
							pointerEvents: "none",
							zIndex: 2,
						}}
					/>

					{/* Bottom gradient — fades toward thumbnail area */}
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							background:
								"linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 30%, transparent 60%)",
							pointerEvents: "none",
							zIndex: 2,
						}}
					/>

					{/* Left col: info */}
					<Box
						key={`mobile-info-${activeMovie._id}`}
						sx={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: 0,
							width: {
								xs: "70%",
								md: "55%",
							},
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							p: 2,
							zIndex: 10,
							animation: "heroInfoInMobile 0.4s ease",
							"@keyframes heroInfoInMobile": {
								from: { opacity: 0, transform: "translateX(-10px)" },
								to: { opacity: 1, transform: "translateX(0)" },
							},
							pointerEvents: "none",
						}}
					>
						<Typography
							variant="subtitle1"
							sx={{
								color: "white",
								fontWeight: 800,
								lineHeight: 1.25,
								mb: 0.25,
								textShadow: "0 2px 8px rgba(0,0,0,0.9)",
								overflow: "hidden",
								display: "-webkit-box",
								WebkitLineClamp: 1,
								WebkitBoxOrient: "vertical",
								fontSize: "0.95rem",
							}}
						>
							{activeMovie.name}
						</Typography>

						{activeMovie.origin_name &&
							activeMovie.origin_name !== activeMovie.name && (
								<Typography
									variant="caption"
									sx={{
										color: "primary.main",
										mb: 0.75,
										fontWeight: 500,
										textShadow: "0 1px 4px rgba(0,0,0,0.8)",
										overflow: "hidden",
										display: "-webkit-box",
										WebkitLineClamp: 1,
										WebkitBoxOrient: "vertical",
									}}
								>
									{activeMovie.origin_name}
								</Typography>
							)}

						<Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
							{activeMovie.year && (
								<Chip size="small" label={activeMovie.year} sx={chipSx} />
							)}
							{activeMovie.quality && (
								<Chip size="small" label={activeMovie.quality} sx={chipSx} />
							)}
							{activeMovie.lang && (
								<Chip size="small" label={activeMovie.lang} sx={chipSx} />
							)}
							{activeMovie.episode_current && (
								<Chip
									size="small"
									label={activeMovie.episode_current}
									sx={chipSx}
								/>
							)}
							{activeMovie.category?.slice(0, 2).map((cat) => (
								<Chip key={cat.id} size="small" label={cat.name} sx={chipSx} />
							))}
						</Stack>

						<Stack
							direction="row"
							spacing={0.75}
							sx={{ pointerEvents: "auto" }}
							onPointerDown={(e) => e.stopPropagation()}
						>
							<IconButton
								size="small"
								onClick={() => {
									if (!hasDragged.current)
										onPlay ? onPlay(activeMovie) : onSelect(activeMovie);
								}}
								sx={{
									bgcolor: "primary.main",
									color: "black",
									width: 36,
									height: 36,
									boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
									"&:hover": { bgcolor: "primary.dark" },
								}}
							>
								<PlayArrowRoundedIcon fontSize="small" />
							</IconButton>
							<IconButton
								size="small"
								onClick={() => {
									if (!hasDragged.current) onLike?.(activeMovie);
								}}
								sx={{
									bgcolor: likedSlugs?.has(activeMovie.slug)
										? "error.main"
										: "rgba(255,255,255,0.12)",
									color: likedSlugs?.has(activeMovie.slug) ? "white" : "white",
									width: 36,
									height: 36,
									border: `1.5px solid ${likedSlugs?.has(activeMovie.slug) ? "transparent" : "rgba(255,255,255,0.3)"}`,
									backdropFilter: "blur(4px)",
									"&:hover": {
										bgcolor: likedSlugs?.has(activeMovie.slug)
											? "error.dark"
											: "rgba(255,255,255,0.2)",
									},
								}}
							>
								{likedSlugs?.has(activeMovie.slug) ? (
									<FavoriteRoundedIcon fontSize="small" />
								) : (
									<FavoriteBorderRoundedIcon fontSize="small" />
								)}
							</IconButton>
							<IconButton
								size="small"
								onClick={() => {
									if (!hasDragged.current) onSelect(activeMovie);
								}}
								sx={{
									bgcolor: "rgba(255,255,255,0.12)",
									color: "white",
									width: 36,
									height: 36,
									border: "1.5px solid rgba(255,255,255,0.3)",
									backdropFilter: "blur(4px)",
									"&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
								}}
							>
								<InfoOutlinedIcon fontSize="small" />
							</IconButton>
						</Stack>
					</Box>
				</Box>

				{/* Thumbnail row — half inside / half outside the clip box */}
				<Stack
					direction="row"
					spacing={0.75}
					sx={{
						position: "absolute",
						// bottom:0 of outer = THUMB_OVERFLOW below clip box bottom
						bottom: 0,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 20,
						overflowX: "auto",
						maxWidth: "95%",
						p: 1,
						"&::-webkit-scrollbar": { display: "none" },
						scrollbarWidth: "none",
					}}
					onPointerDown={(e) => e.stopPropagation()}
				>
					{movies.map((movie, i) => {
						const isActive = i === activeIndex;
						return (
							<Box
								key={movie._id}
								onClick={(e) => {
									e.stopPropagation();
									goTo(i);
								}}
								sx={{
									width: MOBILE_THUMB_W,
									height: MOBILE_THUMB_H,
									flexShrink: 0,
									borderRadius: 1.5,
									overflow: "hidden",
									cursor: "pointer",
									border: `2.5px solid ${
										isActive
											? theme.palette.primary.main
											: alpha(theme.palette.common.white, 0.35)
									}`,
									transition:
										"border-color 0.3s, transform 0.3s, box-shadow 0.3s",
									transform: isActive ? "scale(1.08)" : "scale(1)",
									boxShadow: isActive
										? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.5)}, 0 6px 20px rgba(0,0,0,0.7)`
										: "0 3px 10px rgba(0,0,0,0.5)",
								}}
							>
								<Box
									component="img"
									src={getSlidePoster(movie, i)}
									alt={movie.name}
									draggable={false}
									onError={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										if (img.src !== "/placeholder-poster.svg") {
											img.onerror = null;
											img.src = "/placeholder-poster.svg";
										}
									}}
									sx={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										objectPosition: "center top",
										pointerEvents: "none",
										userSelect: "none",
										display: "block",
									}}
								/>
							</Box>
						);
					})}
				</Stack>
			</Box>
		);
	}

	// ─────────────────────────────────────────────────────────────
	// DESKTOP: original single-box layout, thumbnails bottom-right
	// ─────────────────────────────────────────────────────────────
	return (
		<Box
			ref={containerRef}
			sx={{
				width: "100%",
				position: "relative",
				height: desktopH,
				overflow: "hidden",
				cursor: isDragging ? "grabbing" : "grab",
				userSelect: "none",
				flexShrink: 0,
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			{/* Background slides */}
			{movies.map((movie, i) => (
				<Box
					key={movie._id}
					sx={{
						position: "absolute",
						inset: 0,
						opacity: slideOpacity(i),
						transition: isDragging ? "none" : "opacity 0.45s ease",
						willChange: "opacity",
					}}
				>
					<Box
						component="img"
						src={getSlideBackdrop(movie, i)}
						alt={movie.name}
						draggable={false}
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
							objectPosition: "center top",
							pointerEvents: "none",
							userSelect: "none",
						}}
					/>
				</Box>
			))}

			{/* Dot pattern overlay */}
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(black 1px, rgba(255,255,255,0.2) 1.5px)",
					backgroundSize: "3px 3px",
					opacity: 0.2,
					pointerEvents: "none",
					zIndex: 1,
				}}
			/>

			{/* Left gradient */}
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.18) 60%, transparent 100%)",
					pointerEvents: "none",
					zIndex: 2,
				}}
			/>

			{/* Bottom gradient */}
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 30%, transparent 60%)",
					pointerEvents: "none",
					zIndex: 2,
				}}
			/>

			{/* Right side blend */}
			<Box
				sx={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					width: { sm: "28%", md: "22%" },
					background: `linear-gradient(to left, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.35)} 30%, transparent 100%)`,
					pointerEvents: "none",
					zIndex: 3,
				}}
			/>

			{/* Movie info — bottom-left */}
			<Box
				key={activeMovie._id}
				sx={{
					position: "absolute",
					bottom: 0,
					left: 0,
					width: { sm: "62%", md: "55%", lg: "50%" },
					p: { sm: 3, md: 4 },
					zIndex: 10,
					animation: "heroInfoIn 0.45s ease",
					"@keyframes heroInfoIn": {
						from: { opacity: 0, transform: "translateY(12px)" },
						to: { opacity: 1, transform: "translateY(0)" },
					},
					pointerEvents: "none",
				}}
			>
				<Typography
					variant="h4"
					sx={{
						color: "white",
						fontWeight: 800,
						lineHeight: 1.2,
						mb: 0.5,
						textShadow: "0 2px 8px rgba(0,0,0,0.9)",
						overflow: "hidden",
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
					}}
				>
					{activeMovie.name}
				</Typography>

				{activeMovie.origin_name &&
					activeMovie.origin_name !== activeMovie.name && (
						<Typography
							variant="subtitle1"
							sx={{
								color: "primary.main",
								mb: 1,
								fontWeight: 500,
								textShadow: "0 1px 4px rgba(0,0,0,0.8)",
							}}
						>
							{activeMovie.origin_name}
						</Typography>
					)}

				<Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
					{activeMovie.year && (
						<Chip size="small" label={activeMovie.year} sx={chipSx} />
					)}
					{activeMovie.quality && (
						<Chip size="small" label={activeMovie.quality} sx={chipSx} />
					)}
					{activeMovie.lang && (
						<Chip size="small" label={activeMovie.lang} sx={chipSx} />
					)}
					{activeMovie.episode_current && (
						<Chip
							size="small"
							label={activeMovie.episode_current}
							sx={chipSx}
						/>
					)}
					{activeMovie.category?.slice(0, 4).map((cat) => (
						<Chip key={cat.id} size="small" label={cat.name} sx={chipSx} />
					))}
				</Stack>

				{activeDetail?.content && (
					<Typography
						variant="body2"
						sx={{
							color: "rgba(255,255,255,0.75)",
							mb: 2,
							lineHeight: 1.6,
							overflow: "hidden",
							display: "-webkit-box",
							WebkitLineClamp: 3,
							WebkitBoxOrient: "vertical",
							textShadow: "0 1px 3px rgba(0,0,0,0.7)",
						}}
					>
						{stripHtml(activeDetail.content)}
					</Typography>
				)}

				<Stack
					direction="row"
					spacing={1}
					sx={{ pointerEvents: "auto" }}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<Button
						variant="contained"
						size="medium"
						startIcon={<PlayArrowRoundedIcon />}
						onClick={() => {
							if (!hasDragged.current)
								onPlay ? onPlay(activeMovie) : onSelect(activeMovie);
						}}
						sx={{
							borderRadius: 6,
							fontWeight: 700,
							px: 2.5,
							bgcolor: "primary.main",
							color: "black",
							boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
							"&:hover": { bgcolor: "primary.dark" },
						}}
					>
						Xem phim
					</Button>
					<Button
						variant="outlined"
						size="medium"
						startIcon={<InfoOutlinedIcon />}
						onClick={() => {
							if (!hasDragged.current) onSelect(activeMovie);
						}}
						sx={{
							borderRadius: 6,
							fontWeight: 600,
							px: 2,
							borderColor: "rgba(255,255,255,0.5)",
							color: "white",
							backdropFilter: "blur(4px)",
							bgcolor: "rgba(255,255,255,0.08)",
							"&:hover": {
								borderColor: "white",
								bgcolor: "rgba(255,255,255,0.15)",
							},
						}}
					>
						Chi tiết
					</Button>
					<IconButton
						size="medium"
						onClick={() => {
							if (!hasDragged.current) onLike?.(activeMovie);
						}}
						sx={{
							borderRadius: 6,
							bgcolor: likedSlugs?.has(activeMovie.slug)
								? "error.main"
								: "rgba(255,255,255,0.08)",
							color: "white",
							border: `1.5px solid ${likedSlugs?.has(activeMovie.slug) ? "transparent" : "rgba(255,255,255,0.5)"}`,
							backdropFilter: "blur(4px)",
							width: 40,
							height: 40,
							"&:hover": {
								bgcolor: likedSlugs?.has(activeMovie.slug)
									? "error.dark"
									: "rgba(255,255,255,0.18)",
							},
						}}
					>
						{likedSlugs?.has(activeMovie.slug) ? (
							<FavoriteRoundedIcon fontSize="small" />
						) : (
							<FavoriteBorderRoundedIcon fontSize="small" />
						)}
					</IconButton>
				</Stack>
			</Box>

			{/* Thumbnail indicators — bottom-right (original desktop behaviour) */}
			<Stack
				direction="row"
				spacing={1}
				sx={{
					position: "absolute",
					bottom: { sm: 20, md: 28 },
					right: { sm: 16, md: 20 },
					zIndex: 10,
				}}
				onPointerDown={(e) => e.stopPropagation()}
			>
				{movies.map((movie, i) => (
					<Box
						key={movie._id}
						onClick={(e) => {
							e.stopPropagation();
							goTo(i);
						}}
						sx={{
							width: { sm: 72, md: 90 },
							height: { sm: 46, md: 58 },
							borderRadius: 1.5,
							overflow: "hidden",
							flexShrink: 0,
							cursor: "pointer",
							border: `2.5px solid ${
								i === activeIndex
									? theme.palette.primary.main
									: alpha(theme.palette.common.white, 0.28)
							}`,
							transition: "border-color 0.3s, transform 0.3s, box-shadow 0.3s",
							transform: i === activeIndex ? "scale(1.1)" : "scale(1)",
							boxShadow:
								i === activeIndex
									? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.5)}, 0 4px 12px rgba(0,0,0,0.6)`
									: "0 2px 6px rgba(0,0,0,0.4)",
						}}
					>
						<Box
							component="img"
							src={getSlidePoster(movie, i)}
							alt={movie.name}
							draggable={false}
							onError={(e) => {
								const img = e.currentTarget as HTMLImageElement;
								if (img.src !== "/placeholder-poster.svg") {
									img.onerror = null;
									img.src = "/placeholder-poster.svg";
								}
							}}
							sx={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								objectPosition: "center",
								pointerEvents: "none",
								userSelect: "none",
								display: "block",
							}}
						/>
					</Box>
				))}
			</Stack>
		</Box>
	);
}

const chipSx = {
	height: 22,
	fontSize: "0.72rem",
	bgcolor: "rgba(255,255,255,0.14)",
	color: "white",
	border: "1px solid rgba(255,255,255,0.25)",
	"& .MuiChip-label": { px: 0.8 },
} as const;
