import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MovieIcon from "@mui/icons-material/Movie";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TurnedInIcon from "@mui/icons-material/TurnedIn";
import {
	alpha,
	Box,
	Grow,
	IconButton,
	Paper,
	Portal,
	Stack,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import {
	formatDuration,
	formatEpisode,
	mapContentRating,
} from "@pages/movie/utils";
import { memo, useEffect, useRef, useState } from "react";
import { getMovieDetail, resolveThumb } from "@/services/movieService";

const HOVER_DELAY = 750;
const LEAVE_DELAY = 200;
const SCALE_THUMB = 3;
const SCALE_POSTER = 1.5;

const isValidEp = (ep: {
	link_embed?: string;
	link_m3u8?: string;
	slug?: string;
}) => Boolean(ep.link_embed || ep.link_m3u8 || ep.slug);

const MovieCardBase = ({
	movie,
	liked,
	imageMode = "poster",
	onClick,
	onLike,
	onPlay,
	onFilter,
	onDelete,
}: {
	movie: OphimMovieItem;
	liked: boolean;
	imageMode?: "poster" | "thumb";
	onClick: () => void;
	onLike: (e: React.MouseEvent, rating?: string) => void;
	onPlay?: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onFilter?: (patch: {
		genreSlug?: string | null;
		yearSlug?: string | null;
	}) => void;
	onDelete?: (e: React.MouseEvent) => void;
}) => {
	const theme = useTheme();
	const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
	const thumb = resolveThumb(movie.thumb_url); // ảnh ngang 16:9
	const poster = resolveThumb(movie.poster_url); // ảnh đứng 2:3
	// poster mode = card 16/9 rộng → dùng ảnh ngang thumb_url
	// thumb mode  = card 2/3 đứng  → dùng ảnh đứng poster_url
	const cardImage = imageMode === "poster" ? thumb || poster : poster || thumb;
	const cardAspectRatio = imageMode === "poster" ? "16/9" : "2/3";

	const cardRef = useRef<HTMLDivElement | null>(null);
	const [open, setOpen] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [trailerUrl, setTrailerUrl] = useState("");
	const [fetchedDetail, setFetchedDetail] = useState<{
		detail: OphimMovieDetail;
		episodes: OphimEpisodeServer[];
	} | null>(null);

	const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fetchedRef = useRef(false);
	const isScrollingRef = useRef(false);
	const scrollCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	useEffect(() => {
		const handleScroll = () => {
			isScrollingRef.current = true;
			if (enterTimer.current) {
				clearTimeout(enterTimer.current);
				enterTimer.current = null;
			}
			if (scrollCooldownRef.current) clearTimeout(scrollCooldownRef.current);
			scrollCooldownRef.current = setTimeout(() => {
				isScrollingRef.current = false;
			}, 300);
		};
		window.addEventListener("scroll", handleScroll, {
			passive: true,
			capture: true,
		});
		return () => {
			window.removeEventListener("scroll", handleScroll, { capture: true });
			if (scrollCooldownRef.current) clearTimeout(scrollCooldownRef.current);
		};
	}, []);

	// Tính vị trí popup: overlay lên đúng card, scale to hơn, clamp không overflow viewport
	const getPopupStyle = (r: DOMRect) => {
		const popupW =
			r.width * (imageMode === "thumb" ? SCALE_THUMB : SCALE_POSTER);
		// Popup cao hơn card gốc vì có thêm action bar + meta
		const mediaH = popupW * (9 / 16); // ảnh/trailer 16:9
		const extraH = 155; // actions + meta
		const popupH = mediaH + extraH;

		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Căn giữa theo chiều ngang của card gốc
		let left = r.left + r.width / 2 - popupW / 2;
		// Căn giữa theo chiều dọc: popup đặt sao cho phần ảnh che đúng card gốc
		// → top của popup = top của card gốc (poster 2/3, không phải 16/9)
		let top = r.top;

		// Clamp ngang
		if (left < 8) left = 8;
		if (left + popupW > vw - 8) left = vw - 8 - popupW;

		// Clamp dọc — nếu popup dài hơn, ưu tiên show phía dưới card gốc
		if (top + popupH > vh - 8) top = vh - 8 - popupH;
		if (top < 8) top = 8;

		// transformOrigin: zoom từ giữa card gốc ra
		const originX = r.left + r.width / 2 - left;
		const originY = r.top - top + r.height / 2;

		return { left, top, popupW, transformOrigin: `${originX}px ${originY}px` };
	};

	const isHoveringDeleteRef = useRef(false);
	const isHoveringLikeRef = useRef(false);

	const handleMouseEnter = () => {
		if (!isDesktop) return;
		if (isScrollingRef.current) return;
		if (isHoveringDeleteRef.current) return;
		if (isHoveringLikeRef.current) return;
		if (leaveTimer.current) clearTimeout(leaveTimer.current);
		enterTimer.current = setTimeout(() => {
			const el = cardRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			setRect(r);
			setOpen(true);
			if (!fetchedRef.current) {
				fetchedRef.current = true;
				getMovieDetail(movie.slug)
					.then(({ movie: detail, episodes }) => {
						setFetchedDetail({ detail, episodes: episodes ?? [] });
						if (detail.trailer_url) {
							const m = detail.trailer_url.match(
								/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/,
							);
							if (m) {
								setTrailerUrl(
									`https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&enablejsapi=1`,
								);
							}
						}
					})
					.catch(() => {});
			}
		}, HOVER_DELAY);
	};

	const handleMouseLeave = () => {
		if (enterTimer.current) clearTimeout(enterTimer.current);
		leaveTimer.current = setTimeout(() => setOpen(false), LEAVE_DELAY);
	};

	const popupStyle = open && rect ? getPopupStyle(rect) : null;

	const hasValidEp = fetchedDetail
		? fetchedDetail.episodes.some((s) => s.server_data.some(isValidEp))
		: true;

	const [imgError, setImgError] = useState(false);
	const imgFailCountRef = useRef(0);

	useEffect(() => {
		setImgError(false);
		imgFailCountRef.current = 0;
	}, [cardImage]);
	const [showPosterOverlay, setShowPosterOverlay] = useState(true);
	const [trailerEnded, setTrailerEnded] = useState(false);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Reset states when popup opens/closes or trailer changes
	useEffect(() => {
		if (!open || !trailerUrl) {
			const t = setTimeout(() => {
				setShowPosterOverlay(true);
				setTrailerEnded(false);
			}, 0);
			return () => clearTimeout(t);
		}
		// Show poster for 5s, then fade out to reveal trailer
		const tShow = setTimeout(() => {
			setShowPosterOverlay(true);
			setTrailerEnded(false);
		}, 0);
		const tHide = setTimeout(() => setShowPosterOverlay(false), 5000);
		return () => {
			clearTimeout(tShow);
			clearTimeout(tHide);
		};
	}, [open, trailerUrl]);

	const [showPopupText, setShowPopupText] = useState(true);
	useEffect(() => {
		if (!open) return;
		const reset = setTimeout(() => setShowPopupText(true), 0);
		return () => clearTimeout(reset);
	}, [open]);
	useEffect(() => {
		if (!trailerUrl || !open) return;
		const t = setTimeout(() => setShowPopupText(false), 10000);
		return () => clearTimeout(t);
	}, [trailerUrl, open]);

	// Detect trailer ending: show poster+text, then unmount iframe after transition
	useEffect(() => {
		if (!open || !trailerUrl) {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
			return;
		}

		let ended = false;

		const triggerEnding = () => {
			if (ended) return;
			ended = true;
			// Show poster + text immediately
			setShowPosterOverlay(true);
			setShowPopupText(true);
			// Unmount iframe after poster fade-in transition (3s) completes
			setTimeout(() => setTrailerEnded(true), 3000);
		};

		const subscribeAndListen = () => {
			iframeRef.current?.contentWindow?.postMessage(
				JSON.stringify({ event: "listening" }),
				"*",
			);
		};

		const handler = (event: MessageEvent) => {
			try {
				const data =
					typeof event.data === "string" ? JSON.parse(event.data) : event.data;
				if (data?.event === "onStateChange" && data?.info === 0) {
					triggerEnding();
				}
				if (data?.event === "infoDelivery" && data?.info) {
					const { currentTime, duration } = data.info as {
						currentTime?: number;
						duration?: number;
					};
					if (
						duration != null &&
						currentTime != null &&
						duration > 0 &&
						currentTime > 0 &&
						duration - currentTime < 3.5
					) {
						triggerEnding();
					}
				}
			} catch {
				// not a YouTube message
			}
		};

		window.addEventListener("message", handler);
		const pollId = setInterval(subscribeAndListen, 500);
		pollIntervalRef.current = pollId;

		return () => {
			window.removeEventListener("message", handler);
			clearInterval(pollId);
		};
	}, [open, trailerUrl]);

	const handlePlayFirst = (e: React.MouseEvent) => {
		e.stopPropagation();
		setOpen(false);
		const d = fetchedDetail;
		if (d && onPlay) {
			const resumeSlug = movie.watchProgress?.episodeSlug;
			let server: (typeof d.episodes)[0] | undefined;
			let ep: (typeof d.episodes)[0]["server_data"][0] | undefined;
			if (resumeSlug) {
				for (const s of d.episodes) {
					const found = s.server_data.find(
						(e) => e.slug === resumeSlug && isValidEp(e),
					);
					if (found) {
						server = s;
						ep = found;
						break;
					}
				}
			}
			if (!server || !ep) {
				server = d.episodes.find((s) => s.server_data.some(isValidEp));
				ep = server?.server_data.find(isValidEp);
			}
			if (server && ep) {
				onPlay(movie, { ...d.detail, episodes: d.episodes }, server, ep);
				return;
			}
		}
		if (!d && onPlay) {
			// detail chưa fetch xong — fetch rồi play
			getMovieDetail(movie.slug)
				.then(({ movie: detail, episodes }) => {
					const eps = episodes ?? [];
					const resumeSlug = movie.watchProgress?.episodeSlug;
					let server: OphimEpisodeServer | undefined;
					let ep: OphimEpisodeData | undefined;
					if (resumeSlug) {
						for (const s of eps) {
							const found = s.server_data.find(
								(e) => e.slug === resumeSlug && isValidEp(e),
							);
							if (found) {
								server = s;
								ep = found;
								break;
							}
						}
					}
					if (!server || !ep) {
						server = eps.find((s) => s.server_data.some(isValidEp));
						ep = server?.server_data.find(isValidEp);
					}
					if (server && ep) {
						onPlay(movie, { ...detail, episodes: eps }, server, ep);
					} else {
						onClick();
					}
				})
				.catch(() => onClick());
			return;
		}
		onClick();
	};

	return (
		<>
			{/* Base card */}
			<Box
				ref={cardRef}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onClick={onClick}
				sx={{
					cursor: "pointer",
					position: "relative",
					"@media (hover: none)": {
						"&:active > .MuiBox-root:first-of-type": { opacity: 0.75 },
					},
				}}
			>
				{onDelete && (
					<Tooltip title="Xóa khỏi lịch sử" placement="top">
						<IconButton
							size="small"
							onMouseEnter={() => {
								isHoveringDeleteRef.current = true;
								if (enterTimer.current) {
									clearTimeout(enterTimer.current);
									enterTimer.current = null;
								}
								setOpen(false);
							}}
							onMouseLeave={() => {
								isHoveringDeleteRef.current = false;
							}}
							onClick={(e) => {
								e.stopPropagation();
								onDelete(e);
							}}
							aria-label="Xóa khỏi lịch sử"
							sx={{
								position: "absolute",
								top: -10,
								right: -10,
								zIndex: 3,
								width: 22,
								height: 22,
								bgcolor: "error.main",
								color: "error.contrastText",
								"&:hover": { bgcolor: "error.dark" },
								transition: "background-color 0.16s ease",
							}}
						>
							<CloseIcon sx={{ fontSize: 13 }} />
						</IconButton>
					</Tooltip>
				)}
				<Box
					sx={{
						position: "relative",
						width: "100%",
						aspectRatio: cardAspectRatio,
						borderRadius: 1,
						overflow: "hidden",
						bgcolor: "grey.900",
					}}
				>
					{cardImage && !imgError ? (
						<Box
							component="img"
							src={cardImage}
							alt={movie.name}
							loading="lazy"
							sx={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								display: "block",
							}}
							onError={(e) => {
								const img = e.currentTarget as HTMLImageElement;
								imgFailCountRef.current += 1;
								if (imgFailCountRef.current >= 5) {
									img.onerror = null;
									setImgError(true);
									return;
								}
								const fallback = imageMode === "poster" ? poster : thumb;
								const placeholder = "/placeholder-poster.svg";
								if (fallback && img.src !== fallback && !img.src.endsWith("/placeholder-poster.svg")) {
									img.onerror = null;
									img.src = fallback;
								} else if (!img.src.endsWith("/placeholder-poster.svg")) {
									img.onerror = null;
									img.src = placeholder;
								} else {
									img.onerror = null;
									setImgError(true);
								}
							}}
						/>
					) : (
						<Box
							sx={{
								width: "100%",
								height: "100%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: "grey.900",
							}}
						>
							<MovieIcon sx={{ fontSize: 36, color: "grey.700" }} />
						</Box>
					)}

					{(() => {
						const label =
							movie.rated ?? mapContentRating(fetchedDetail?.detail.rated);
						if (!label) return null;
						return (
							<Box
								sx={{
									position: "absolute",
									top: -5,
									left: -9,
									pointerEvents: "none",
									lineHeight: 0,
								}}
							>
								<TurnedInIcon
									sx={{ fontSize: 40, color: "primary.main", display: "block" }}
								/>
								<Box
									sx={{
										position: "absolute",
										top: 14,
										left: 0,
										right: 0,
										textAlign: "center",
										fontSize: 9,
										fontWeight: 900,
										color: "#000",
										lineHeight: 1,
										letterSpacing: "0.02em",
									}}
								>
									{label}
								</Box>
							</Box>
						);
					})()}

					{movie.watchProgress && !movie.watchProgress.completed && (
						<Box
							sx={{
								position: "absolute",
								bottom: 0,
								left: 0,
								right: 0,
								height: 4,
								bgcolor: "rgba(255,255,255,0.25)",
							}}
						>
							<Box
								sx={{
									height: "100%",
									width: movie.watchProgress.duration
										? `${Math.min(100, (movie.watchProgress.position / movie.watchProgress.duration) * 100)}%`
										: "30%",
									bgcolor: "primary.main",
								}}
							/>
						</Box>
					)}

					<Tooltip
						title={liked ? "Bỏ thích" : "Thêm yêu thích"}
						placement="top"
					>
						<IconButton
							size="small"
							onClick={(e) => onLike(e, movie.rated)}
							onMouseEnter={() => {
								isHoveringLikeRef.current = true;
								if (enterTimer.current) {
									clearTimeout(enterTimer.current);
									enterTimer.current = null;
								}
								setOpen(false);
							}}
							onMouseLeave={() => {
								isHoveringLikeRef.current = false;
							}}
							aria-label={liked ? "Bỏ thích phim" : "Thêm phim vào yêu thích"}
							sx={{
								position: "absolute",
								top: 6,
								right: 6,
								zIndex: 2,
								bgcolor: liked
									? "error.main"
									: alpha(theme.palette.common.black, 0.36),
								color: liked ? "error.contrastText" : "error.main",
								border: `1.5px solid ${theme.palette.error.main}`,
								"&:hover": {
									bgcolor: liked
										? "error.dark"
										: alpha(theme.palette.error.main, 0.16),
									transform: "scale(1.08)",
								},
								transition: "transform 0.16s ease, background-color 0.16s ease",
								width: 30,
								height: 30,
							}}
						>
							{liked ? (
								<FavoriteIcon sx={{ fontSize: 19 }} />
							) : (
								<FavoriteBorderIcon sx={{ fontSize: 19 }} />
							)}
						</IconButton>
					</Tooltip>
				</Box>

				<Typography
					noWrap
					sx={{
						fontWeight: 700,
						fontSize: 13,
						mt: 0.75,
						lineHeight: 1.3,
					}}
				>
					{movie.name}
				</Typography>
				{movie.origin_name && (
					<Typography
						variant="caption"
						color="text.secondary"
						noWrap
						sx={{
							display: "block",
						}}
					>
						{movie.origin_name}
					</Typography>
				)}
			</Box>

			{/* Expanded popup — overlays the card, zoomed in place */}
			{open && popupStyle && (
				<Portal>
					<Grow
						in={open}
						timeout={220}
						style={{ transformOrigin: popupStyle.transformOrigin }}
					>
						<Paper
							elevation={24}
							onMouseEnter={() => {
								if (leaveTimer.current) clearTimeout(leaveTimer.current);
							}}
							onMouseLeave={handleMouseLeave}
							onClick={(e) => e.stopPropagation()}
							sx={{
								position: "fixed",
								left: popupStyle.left,
								top: popupStyle.top,
								width: popupStyle.popupW,
								zIndex: 1500,
								borderRadius: 2,
								overflow: "hidden",
								bgcolor: alpha(theme.palette.background.default, 0.55),
								backgroundImage: "none",
								backdropFilter: "blur(8px)",
								WebkitBackdropFilter: "blur(8px)",
								border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,

								boxShadow: `0 16px 56px ${alpha(theme.palette.common.black, 0.7)}`,
							}}
						>
							{/* Media: trailer or poster, aspect 16/9 */}
							<Box
								onClick={handlePlayFirst}
								sx={{
									position: "relative",
									width: "100%",
									paddingTop: "56.25%",
									bgcolor: "background.paper",
									overflow: "hidden",
									cursor: "pointer",
								}}
							>
								{trailerUrl ? (
									<>
										<Box
											component="img"
											src={thumb || poster || "/placeholder-backdrop.svg"}
											alt={movie.name}
											onError={(e) => {
												const img = e.currentTarget as HTMLImageElement;
												imgFailCountRef.current += 1;
												img.onerror = null;
												img.src = "/placeholder-backdrop.svg";
											}}
											sx={{
												position: "absolute",
												inset: 0,
												width: "100%",
												height: "100%",
												objectFit: "cover",
												zIndex: 5,
												opacity: showPosterOverlay ? 1 : 0,
												transition: "opacity 2s ease-in-out",
												pointerEvents: "none",
											}}
										/>

										{!trailerEnded && (
											<Box
												component="iframe"
												ref={iframeRef}
												src={trailerUrl}
												allow="autoplay; encrypted-media"
												sx={{
													position: "absolute",
													inset: 0,
													width: "100%",
													height: "100%",
													border: "none",
													display: "block",
													pointerEvents: "none",
													zIndex: 1,
												}}
											/>
										)}
									</>
								) : (
									<Box
										component="img"
										src={thumb || poster || "/placeholder-backdrop.svg"}
										alt={movie.name}
										onError={(e) => {
											const img = e.currentTarget as HTMLImageElement;
											imgFailCountRef.current += 1;
											img.onerror = null;
											img.src = "/placeholder-backdrop.svg";
										}}
										sx={{
											position: "absolute",
											inset: 0,
											width: "100%",
											height: "100%",
											objectFit: "cover",
											display: "block",
											zIndex: 5,
										}}
									/>
								)}
								{/* Bottom gradient */}
								<Box
									sx={{
										position: "absolute",
										bottom: -1,
										left: 0,
										right: 0,
										height: "50%",
										background: `linear-gradient(to top, ${theme.palette.background.paper}, transparent)`,
										pointerEvents: "none",
									}}
								/>
								{/* Title overlay */}
								<Box
									sx={{
										position: "absolute",
										bottom: 0,
										left: 0,
										right: 0,
										px: 1.75,
										py: 0.75,
										zIndex: 10,
										opacity: showPopupText ? 1 : 0,
										transition: "opacity 0.8s ease",
									}}
								>
									<Typography
										sx={{
											fontWeight: 900,
											fontSize: 16,
											lineHeight: 1.2,
											color: "primary.main",
											textShadow: `0 2px 6px ${alpha(theme.palette.common.black, 0.8)}`,

											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{movie.name}
									</Typography>
									{movie.origin_name && (
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{
												fontSize: 11,
												WebkitLineClamp: 1,
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												textShadow: `0 1px 4px ${alpha(theme.palette.common.black, 0.8)}`,
											}}
										>
											{movie.origin_name}
										</Typography>
									)}
								</Box>
							</Box>

							{/* Actions */}
							<Box sx={{ px: 1.75, pt: 1, pb: 0.5 }}>
								<Stack
									direction="row"
									alignItems="center"
									justifyContent="space-between"
								>
									<Stack direction="row" spacing={0.75}>
										<Tooltip
											title={
												fetchedDetail !== null && !hasValidEp
													? "Không có tập phim"
													: movie.watchProgress &&
															!movie.watchProgress.completed
														? "Tiếp tục"
														: "Xem ngay"
											}
											placement="top"
										>
											<span>
												<IconButton
													size="small"
													disabled={fetchedDetail !== null && !hasValidEp}
													onClick={handlePlayFirst}
													sx={{
														bgcolor:
															fetchedDetail !== null && !hasValidEp
																? "action.disabledBackground"
																: "primary.main",
														color:
															fetchedDetail !== null && !hasValidEp
																? "text.disabled"
																: "primary.contrastText",
														width: 36,
														height: 36,
														"&:hover": { bgcolor: "primary.dark" },
														"&.Mui-disabled": {
															bgcolor: "action.disabledBackground",
															color: "text.disabled",
														},
													}}
												>
													<PlayArrowIcon sx={{ fontSize: 24 }} />
												</IconButton>
											</span>
										</Tooltip>
										<Tooltip
											title={liked ? "Bỏ thích" : "Thêm yêu thích"}
											placement="top"
										>
											<IconButton
												size="small"
												onClick={(e) => {
													e.stopPropagation();
													onLike(e, movie.rated);
												}}
												sx={{
													border: `2px solid ${liked ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.45)}`,
													width: 36,
													height: 36,
													color: liked ? "error.main" : "text.primary",
													"&:hover": {
														borderColor: liked ? "error.dark" : "text.primary",
													},
												}}
											>
												{liked ? (
													<FavoriteIcon sx={{ fontSize: 18 }} />
												) : (
													<FavoriteBorderIcon sx={{ fontSize: 20 }} />
												)}
											</IconButton>
										</Tooltip>
									</Stack>

									<Tooltip title="Xem chi tiết" placement="top">
										<IconButton
											size="small"
											onClick={(e) => {
												e.stopPropagation();
												setOpen(false);
												onClick();
											}}
											sx={{
												border: `2px solid ${alpha(theme.palette.text.primary, 0.45)}`,
												width: 36,
												height: 36,
												"&:hover": { borderColor: "text.primary" },
											}}
										>
											<ExpandMoreIcon sx={{ fontSize: 22 }} />
										</IconButton>
									</Tooltip>
								</Stack>
							</Box>

							{/* Meta */}
							<Box sx={{ px: 1.75, pb: 1.75, pt: 0.5 }}>
								<Stack
									direction="row"
									spacing={0.75}
									alignItems="center"
									flexWrap="wrap"
									useFlexGap
									sx={{ mb: 0.5 }}
								>
									{(fetchedDetail?.detail.imdb?.vote_average ??
										fetchedDetail?.detail.tmdb?.vote_average ??
										0) > 0 && (
										<Box
											component="span"
											sx={{
												display: "inline-flex",
												alignItems: "center",
												bgcolor: alpha(theme.palette.warning.main, 0.15),
												border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
												borderRadius: 0.5,
												px: 0.5,
												fontSize: 11,
												lineHeight: 1.6,
												fontWeight: 700,
											}}
										>
											<Box
												component="span"
												sx={{ color: theme.palette.warning.main }}
											>
												IMDb
											</Box>
											<Box
												component="span"
												sx={{ color: "text.primary", ml: 0.5 }}
											>
												{(
													fetchedDetail?.detail.imdb?.vote_average ??
													fetchedDetail?.detail.tmdb?.vote_average ??
													0
												).toFixed(1)}
											</Box>
										</Box>
									)}
									{(() => {
										const label =
											movie.rated ??
											mapContentRating(fetchedDetail?.detail.rated);
										if (!label) return null;
										return (
											<Box
												component="span"
												sx={{
													border: `1px solid ${alpha(theme.palette.primary.main, 0.7)}`,
													borderRadius: 0.5,
													px: 0.5,
													fontSize: 11,
													fontWeight: 700,
													color: "primary.main",
													lineHeight: 1.6,
													bgcolor: alpha(theme.palette.primary.main, 0.15),
													"@keyframes certGlowChip": {
														"0%, 100%": {
															boxShadow: `0 0 4px ${alpha(theme.palette.primary.main, 0.4)}, 0 0 8px ${alpha(theme.palette.primary.main, 0.2)}`,
														},
														"50%": {
															boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.8)}, 0 0 16px ${alpha(theme.palette.primary.main, 0.5)}`,
														},
													},
													animation: "certGlowChip 2s ease-in-out infinite",
												}}
											>
												{label}
											</Box>
										);
									})()}
									{movie.year > 0 && (
										<Box
											component="span"
											sx={{
												border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
												borderRadius: 0.5,
												px: 0.5,
												fontSize: 11,
												color: "text.secondary",
												lineHeight: 1.6,
												cursor: onFilter ? "pointer" : "default",
												"&:hover": onFilter
													? {
															borderColor: "primary.main",
															color: "primary.main",
														}
													: {},
											}}
											onClick={
												onFilter
													? (e) => {
															e.stopPropagation();
															onFilter({ yearSlug: String(movie.year) });
														}
													: undefined
											}
										>
											{movie.year}
										</Box>
									)}
									{movie.type === "single" && fetchedDetail?.detail.time && (
										<Box
											component="span"
											sx={{
												border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
												borderRadius: 0.5,
												px: 0.5,
												fontSize: 11,
												color: "text.secondary",
												lineHeight: 1.6,
											}}
										>
											{formatDuration(fetchedDetail.detail.time)}
										</Box>
									)}
									{movie.type !== "single" &&
										fetchedDetail?.detail.tmdb?.season != null &&
										fetchedDetail.detail.tmdb.season > 0 && (
											<Box
												component="span"
												sx={{
													border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
													borderRadius: 0.5,
													px: 0.5,
													fontSize: 11,
													color: "text.secondary",
													lineHeight: 1.6,
												}}
											>
												Phần {fetchedDetail.detail.tmdb.season}
											</Box>
										)}

									{movie.type !== "single" && movie.episode_current && (
										<Box
											component="span"
											sx={{
												border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
												borderRadius: 0.5,
												px: 0.5,
												fontSize: 11,
												color: "text.secondary",
												lineHeight: 1.6,
											}}
										>
											{formatEpisode(movie.episode_current)}
										</Box>
									)}
								</Stack>
								{((fetchedDetail?.detail.category ?? movie.category)?.length ??
									0) > 0 && (
									<Stack direction="row" flexWrap="wrap" useFlexGap gap={0.25}>
										{(fetchedDetail?.detail.category ?? movie.category)
											.slice(0, 3)
											.map((cat, i) => (
												<Typography
													key={cat.id}
													variant="caption"
													color="text.secondary"
													sx={{
														fontSize: 12,
														cursor: onFilter ? "pointer" : "default",
														"&:hover": onFilter
															? { color: "primary.main" }
															: {},
													}}
													onClick={
														onFilter
															? (e) => {
																	e.stopPropagation();
																	onFilter({ genreSlug: cat.slug });
																}
															: undefined
													}
												>
													{cat.name}
													{i <
													Math.min(
														(fetchedDetail?.detail.category ?? movie.category)
															.length,
														3,
													) -
														1
														? " •"
														: ""}
												</Typography>
											))}
									</Stack>
								)}
							</Box>
						</Paper>
					</Grow>
				</Portal>
			)}
		</>
	);
};

export const MovieCard = memo(
	MovieCardBase,
	(prev, next) =>
		prev.movie === next.movie &&
		prev.liked === next.liked &&
		prev.imageMode === next.imageMode &&
		prev.onDelete === next.onDelete,
);
