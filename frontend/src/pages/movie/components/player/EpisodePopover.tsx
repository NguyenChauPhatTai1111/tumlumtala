import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, IconButton, Typography } from "@mui/material";
import type { TMDBEpisode } from "@/services/tmdbService";
import { tmdbStillUrl } from "@/services/tmdbService";

interface EpisodePopoverProps {
	direction: "prev" | "next";
	tmdbEp: TMDBEpisode;
	popoverOpen: boolean;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onClick: () => void;
}

export function EpisodePopover({
	direction,
	tmdbEp,
	popoverOpen,
	onMouseEnter,
	onMouseLeave,
	onClick,
}: EpisodePopoverProps) {
	const stillUrl = tmdbStillUrl(tmdbEp.still_path, "w400");
	const isPrev = direction === "prev";
	const titleClass = isPrev ? "prev-ep-title" : "next-ep-title";
	const label = isPrev ? "Tập trước" : "Tập tiếp theo";

	return (
		<Box
			sx={{
				position: "relative",
				"&::before": {
					content: '""',
					position: "absolute",
					bottom: "100%",
					left: -8,
					right: -8,
					height: 20,
				},
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onClick={(e) => e.stopPropagation()}
		>
			<IconButton
				onClick={(e) => {
					e.stopPropagation();
					onClick();
				}}
				size="small"
				sx={{
					color: popoverOpen ? "primary.main" : "white",
				}}
			>
				{isPrev ? (
					<SkipPreviousIcon sx={{ fontSize: 24 }} />
				) : (
					<SkipNextIcon sx={{ fontSize: 24 }} />
				)}
			</IconButton>

			{popoverOpen && (
				<Box
					sx={{
						position: "absolute",
						bottom: "calc(100% + 12px)",
						right: 0,
						width: 450,
						bgcolor: "rgba(255,255,255,0.05)",
						backdropFilter: "blur(5px)",
						WebkitBackdropFilter: "blur(5px)",
						borderRadius: 2,
						border: "1px solid rgba(255,255,255,0.1)",
						boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
						p: 2,
						zIndex: 20,
					}}
				>
					<Typography
						variant="caption"
						sx={{
							color: "primary.main",
							display: "block",
							mb: 1.25,
							fontWeight: 900,
							textTransform: "uppercase",
							letterSpacing: 0.5,
						}}
					>
						{label}
					</Typography>
					<Box
						onClick={onClick}
						sx={{
							display: "flex",
							gap: 1.5,
							cursor: "pointer",
							[`&:hover .${titleClass}`]: {
								color: "primary.main",
							},
						}}
					>
						{stillUrl && (
							<Box sx={{ position: "relative", flexShrink: 0 }}>
								<Box
									component="img"
									src={stillUrl}
									alt={tmdbEp.name}
									sx={{
										width: 200,
										height: 120,
										borderRadius: 1,
										objectFit: "cover",
										display: "block",
										bgcolor: "rgba(255,255,255,0.05)",
									}}
								/>
								<Box
									sx={{
										position: "absolute",
										inset: 0,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										bgcolor: "rgba(0,0,0,0.4)",
										borderRadius: 1,
									}}
								>
									<PlayArrowIcon sx={{ color: "white", fontSize: 26 }} />
								</Box>
							</Box>
						)}
						<Box sx={{ minWidth: 0, flex: 1 }}>
							<Typography
								className={titleClass}
								variant="body2"
								fontWeight={700}
								sx={{
									color: "white",
									transition: "color 0.15s ease",
									mb: 0.5,
								}}
							>
								{tmdbEp.episode_number}&nbsp;&nbsp;
								{tmdbEp.name}
							</Typography>
							{tmdbEp.overview && (
								<Typography
									variant="caption"
									sx={{
										color: "text.secondary",
										lineHeight: 1.5,
										display: "-webkit-box",
										WebkitLineClamp: 3,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
										fontSize: "0.72rem",
									}}
								>
									{tmdbEp.overview}
								</Typography>
							)}
						</Box>
					</Box>
				</Box>
			)}
		</Box>
	);
}
