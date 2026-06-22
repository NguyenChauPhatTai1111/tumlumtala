import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import WestIcon from "@mui/icons-material/West";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";

interface PlayerTopBarProps {
	title: string;
	hasMultipleEpisodes: boolean;
	hasMultipleServers: boolean;
	isTMDBSeries: boolean;
	panelOpen: boolean;
	controlsOpaque: boolean;
	currentEpNum: number | null;
	totalEps: number;
	onClose: () => void;
	onTogglePanel: () => void;
}

export function PlayerTopBar({
	title,
	hasMultipleEpisodes,
	hasMultipleServers,
	isTMDBSeries,
	panelOpen,
	controlsOpaque,
	currentEpNum,
	totalEps,
	onClose,
	onTogglePanel,
}: PlayerTopBarProps) {
	return (
		<Box
			sx={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 7,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				px: 1,
				py: 1,
				background:
					"linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
				opacity: controlsOpaque ? 1 : 0,
				pointerEvents: controlsOpaque ? "auto" : "none",
				transition: "opacity 0.3s ease",
			}}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Left: back arrow + title */}
			<Stack
				direction="row"
				alignItems="center"
				spacing={0.5}
				onClick={onClose}
				sx={(theme) => ({
					minWidth: 0,
					flex: 1,
					cursor: "pointer",

					"&:hover .MuiTypography-root, &:hover .MuiSvgIcon-root": {
						color: theme.palette.primary.main,
					},
				})}
			>
				<IconButton
					size="small"
					className="header-icon"
					sx={{ color: "white", flexShrink: 0 }}
				>
					<WestIcon fontSize="small" />
				</IconButton>

				<Typography
					noWrap
					className="header-title"
					sx={{
						color: "white",
						fontWeight: 700,
						fontSize: "0.95rem",
						minWidth: 0,
					}}
				>
					{title}
				</Typography>

				{hasMultipleEpisodes && currentEpNum !== null && (
					<Typography
						variant="caption"
						sx={{
							color: "rgba(255,255,255,0.65)",
							flexShrink: 0,
							fontWeight: 600,
						}}
					>
						{currentEpNum}/{totalEps}
					</Typography>
				)}
			</Stack>

			{/* Right: episode list toggle */}
			{(hasMultipleEpisodes || hasMultipleServers || isTMDBSeries) && (
				<Tooltip
					title={
						panelOpen
							? "Ẩn danh sách"
							: hasMultipleEpisodes
								? "Danh sách tập"
								: "Chọn nguồn"
					}
				>
					<Box
						component="button"
						onClick={onTogglePanel}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 0.5,
							px: 1.25,
							py: 1,
							borderRadius: 1,
							border: "1.5px solid",
							borderColor: panelOpen ? "primary.main" : "rgba(255,255,255,0.5)",
							bgcolor: panelOpen ? "primary.main" : "rgba(255,255,255,0.1)",
							color: panelOpen ? "primary.contrastText" : "white",
							cursor: "pointer",
							fontFamily: "inherit",
							fontSize: 12,
							fontWeight: 700,
							backdropFilter: "blur(8px)",
							transition: "all 0.15s ease",
							flexShrink: 0,
							"&:hover": {
								borderColor: "primary.main",
								bgcolor: "primary.main",
								color: "primary.contrastText",
							},
						}}
					>
						<AutoAwesomeMotionIcon
							sx={{ fontSize: 20, transform: "rotate(90deg)" }}
						/>
						<Box
							component="span"
							sx={{ display: { xs: "none", sm: "inline" } }}
						>
							{hasMultipleEpisodes ? "Danh sách" : "Chọn nguồn"}
						</Box>
					</Box>
				</Tooltip>
			)}
		</Box>
	);
}
