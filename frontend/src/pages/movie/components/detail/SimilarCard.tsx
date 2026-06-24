import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TurnedInIcon from "@mui/icons-material/TurnedIn";
import {
	alpha,
	Box,
	IconButton,
	Stack,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import type { OphimMovieItem } from "@pages/movie/types";
import { formatEpisode } from "@pages/movie/utils";
import { useEffect, useState } from "react";
import { getMovieDetail, resolveThumb } from "@/services/movieService";

const isValidEp = (ep: {
	link_embed?: string;
	link_m3u8?: string;
	slug?: string;
}) => Boolean(ep.link_embed || ep.link_m3u8 || ep.slug);

export const SimilarCard = ({
	movie: m,
	liked,
	rating,
	onShowInfo,
	onPlayAndOpen,
}: {
	movie: OphimMovieItem;
	liked: boolean;
	rating?: string;
	onShowInfo?: (movie: OphimMovieItem) => void;
	onPlayAndOpen?: (movie: OphimMovieItem) => void;
}) => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [isLiked, setIsLiked] = useState(liked);
	const [noPlayable, setNoPlayable] = useState(false);
	const [checking, setChecking] = useState(true);
	const thumb = resolveThumb(m.thumb_url);

	useEffect(() => {
		let cancelled = false;
		getMovieDetail(m.slug)
			.then(({ episodes }) => {
				if (cancelled) return;
				if (!episodes.some((s) => s.server_data.some(isValidEp))) {
					setNoPlayable(true);
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setChecking(false);
			});
		return () => {
			cancelled = true;
		};
	}, [m.slug]);

	const handlePlay = () => {
		if (noPlayable || checking) return;
		onPlayAndOpen?.(m);
	};

	return (
		<Box
			sx={{
				borderRadius: 1.5,
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				bgcolor: "background.paper",
			}}
		>
			{/* Poster 16:9 with centered play button */}
			<Box
				sx={{
					position: "relative",
					paddingTop: "56.25%",
					bgcolor: "grey.900",
					cursor: noPlayable || checking ? "default" : "pointer",
				}}
				onMouseEnter={() => !noPlayable && !checking && setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onClick={handlePlay}
			>
				<Box
					component="img"
					src={thumb || "/placeholder-backdrop.svg"}
					alt={m.name}
					loading="lazy"
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
						display: "block",
						filter: noPlayable ? "brightness(0.45)" : "none",
					}}
				/>
				{/* Hover overlay */}
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						bgcolor: alpha(theme.palette.common.black, hovered ? 0.45 : 0),
						transition: "background-color 0.2s ease",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{noPlayable ? (
						<Box
							onClick={(e) => {
								e.stopPropagation();
								onShowInfo?.(m);
							}}
							sx={{
								height: 26,
								px: 1,
								display: "inline-flex",
								alignItems: "center",
								fontSize: 11,
								fontWeight: 900,
								color: "primary.main",
								bgcolor: alpha("#fff", 0.12),
								border: "1px solid",
								borderColor: "primary.main",
								borderRadius: 1,
								cursor: onShowInfo ? "pointer" : "default",
							}}
						>
							SẮP CHIẾU
						</Box>
					) : !checking ? (
						<Box
							sx={{
								width: 44,
								height: 44,
								borderRadius: "50%",
								bgcolor: alpha(theme.palette.common.white, 0.9),
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: hovered ? 1 : 0,
								transform: hovered ? "scale(1)" : "scale(0.7)",
								transition: "opacity 0.2s ease, transform 0.2s ease",
							}}
						>
							<PlayArrowIcon sx={{ fontSize: 28, color: "black" }} />
						</Box>
					) : null}
				</Box>
				{/* Rating badge */}
				{rating &&
					(() => {
						return (
							<Box
								sx={{
									position: "absolute",
									top: -4,
									left: -8,
									pointerEvents: "none",
									filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
									lineHeight: 0,
								}}
							>
								<TurnedInIcon
									sx={{ fontSize: 40, color: "primary.main", display: "block" }}
								/>
								<Box
									sx={{
										position: "absolute",
										top: 10,
										left: 0,
										right: 0,
										textAlign: "center",
										fontSize: 9,
										fontWeight: 900,
										color: "#fff",
										lineHeight: 1,
										letterSpacing: "0.02em",
									}}
								>
									{rating}
								</Box>
							</Box>
						);
					})()}
			</Box>

			{/* Meta row */}
			<Box sx={{ px: 1.25, pt: 1, pb: 1.25 }}>
				<Stack
					direction="row"
					alignItems="center"
					justifyContent="space-between"
					spacing={0.5}
				>
					<Stack
						direction="row"
						alignItems="center"
						spacing={0.5}
						flexWrap="wrap"
						useFlexGap
					>
						{m.lang && (
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 18,
									px: 0.75,
									bgcolor: "transparent",
									border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
									color: "text.secondary",
									fontSize: 10,
									borderRadius: 0.75,
								}}
							>
								{m.lang}
							</Box>
						)}
						{m.quality && (
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 18,
									px: 0.75,
									bgcolor: "transparent",
									border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
									color: "text.secondary",
									fontSize: 10,
									borderRadius: 0.75,
								}}
							>
								{m.quality}
							</Box>
						)}
						{(m.year ?? 0) > 0 && (
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 18,
									px: 0.75,
									bgcolor: "transparent",
									border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
									color: "text.secondary",
									fontSize: 10,
									borderRadius: 0.75,
								}}
							>
								{m.year}
							</Box>
						)}
						{(m.tmdb?.season ?? 0) > 1 && (
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 18,
									px: 0.75,
									bgcolor: "transparent",
									border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
									color: "primary.main",
									fontSize: 10,
									borderRadius: 0.75,
								}}
							>
								{m.tmdb?.season} phần
							</Box>
						)}
						{m.episode_current && m.type !== "single" && (
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 18,
									px: 0.75,
									bgcolor: "transparent",
									border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
									color: "text.secondary",
									fontSize: 10,
									borderRadius: 0.75,
								}}
							>
								{formatEpisode(m.episode_current)}
								{m.episode_total &&
									!/ho[àa]n\s*t[aấ]t/i.test(m.episode_current) &&
									` / ${m.episode_total}${/tập/i.test(m.episode_total) ? "" : " tập"}`}
							</Box>
						)}
					</Stack>
					<Tooltip title="">
						<IconButton
							size="small"
							onClick={() => setIsLiked((v) => !v)}
							sx={{
								border: `2px solid ${isLiked ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.45)}`,
								width: 30,
								height: 30,
								flexShrink: 0,
								color: isLiked ? "error.main" : "text.secondary",
								"&:hover": {
									borderColor: isLiked ? "error.dark" : "text.primary",
								},
							}}
						>
							{isLiked ? (
								<FavoriteIcon sx={{ fontSize: 15 }} />
							) : (
								<FavoriteBorderIcon sx={{ fontSize: 15 }} />
							)}
						</IconButton>
					</Tooltip>
				</Stack>
				<Typography
					variant="caption"
					fontWeight={700}
					onClick={() => onShowInfo?.(m)}
					sx={{
						display: "block",
						mt: 0.5,
						fontSize: 12,
						lineHeight: 1.3,
						cursor: onShowInfo ? "pointer" : "default",
						"&:hover": onShowInfo
							? { color: "primary.main", textDecoration: "underline" }
							: {},
					}}
				>
					{m.name}
				</Typography>
			</Box>
		</Box>
	);
};
