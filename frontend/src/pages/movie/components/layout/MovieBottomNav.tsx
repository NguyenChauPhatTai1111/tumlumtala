import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { alpha, Box, useTheme } from "@mui/material";
import type { MovieTab } from "@pages/movie/hooks/useMoviePageState";

interface MovieBottomNavProps {
	tab: MovieTab;
	setTab: (tab: MovieTab) => void;
}

const NAV_ITEMS: { value: MovieTab; icon: React.ReactNode }[] = [
	{ value: "home", icon: <HomeRoundedIcon sx={{ fontSize: 22 }} /> },
	{ value: "search", icon: <SearchRoundedIcon sx={{ fontSize: 22 }} /> },
	{ value: "liked", icon: <FavoriteRoundedIcon sx={{ fontSize: 22 }} /> },
	{ value: "history", icon: <HistoryRoundedIcon sx={{ fontSize: 22 }} /> },
];

const TAB_ORDER: MovieTab[] = ["home", "search", "liked", "history"];

export function MovieBottomNav({ tab, setTab }: MovieBottomNavProps) {
	const theme = useTheme();

	return (
		<Box
			sx={{
				display: { xs: "flex", md: "none" },
				position: "fixed",
				bottom: 16,
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 1200,
				bgcolor: alpha(theme.palette.background.paper, 0),
				backdropFilter: "blur(5px)",
				WebkitBackdropFilter: "blur(5px)",
				borderRadius: "50px",
				px: 0.75,
				py: 0.75,
				alignItems: "center",
				gap: 0.75,
				boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, 0.55)}`,
				border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
				WebkitTapHighlightColor: "transparent",
				"& *": { WebkitTapHighlightColor: "transparent" },
			}}
		>
			<Box
				sx={{
					position: "relative",
					display: "grid",
					gridTemplateColumns: "repeat(4, 1fr)",
				}}
			>
				{/* Sliding active indicator */}
				<Box
					sx={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: 0,
						width: "25%",
						bgcolor: alpha(theme.palette.primary.main, 0.18),
						borderRadius: "50px",
						pointerEvents: "none",
						transform: `translateX(${TAB_ORDER.indexOf(tab) * 100}%)`,
						transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
					}}
				/>

				{NAV_ITEMS.map((item) => (
					<Box
						key={item.value}
						component="button"
						onClick={() => setTab(item.value)}
						sx={{
							all: "unset",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							px: 2.25,
							py: 1,
							cursor: "pointer",
							position: "relative",
							zIndex: 1,
							color: tab === item.value ? "primary.main" : "text.secondary",
							transition: "color 0.25s",
							"& svg": {
								transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
								transform: tab === item.value ? "scale(1.2)" : "scale(1)",
							},
							"&:active svg": { transform: "scale(0.85) !important" },
						}}
					>
						{item.icon}
					</Box>
				))}
			</Box>
		</Box>
	);
}
