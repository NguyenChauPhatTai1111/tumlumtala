import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import CloseIcon from "@mui/icons-material/Close";
import CropLandscapeIcon from "@mui/icons-material/CropLandscape";
import CropPortraitIcon from "@mui/icons-material/CropPortrait";
import SearchIcon from "@mui/icons-material/Search";
import {
	alpha,
	Box,
	Button,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	useTheme,
} from "@mui/material";
import type { MovieTab } from "@pages/movie/hooks/useMoviePageState";
import type { MovieSource } from "@/services/movieService";

interface MovieTopBarProps {
	tab: MovieTab;
	setTab: (tab: MovieTab) => void;
	keyword: string;
	setKeyword: (k: string) => void;
	onApplyFilter: () => void;
	imageMode: "poster" | "thumb";
	setImageMode: (mode: "poster" | "thumb") => void;
	likedCount?: number;
	mode: "light" | "dark";
	setMode: (mode: "light" | "dark") => void;
	scrolled?: boolean;
	movieSource: MovieSource;
	onMovieSourceChange: (source: MovieSource) => void;
}

const TABS: { value: MovieTab; label: (likedCount?: number) => string }[] = [
	{ value: "home", label: () => "Trang chủ" },
	{ value: "search", label: () => "Tìm kiếm" },
	{ value: "liked", label: (n) => `Yêu thích${n ? ` (${n})` : ""}` },
	{ value: "history", label: () => "Lịch sử" },
];

export function MovieTopBar({
	tab,
	setTab,
	keyword,
	setKeyword,
	onApplyFilter,
	imageMode,
	setImageMode,
	likedCount,
	mode,
	setMode,
	scrolled = false,
	movieSource,
	onMovieSourceChange,
}: MovieTopBarProps) {
	const theme = useTheme();

	return (
		<Box
			sx={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				flexShrink: 0,
				zIndex: 100,
				backgroundColor: alpha(
					theme.palette.background.default,
					scrolled ? 0.85 : 0.45,
				),
				backdropFilter: "blur(4px)",
				WebkitBackdropFilter: "blur(4px)",
				transition: "background-color 0.3s ease",
				borderBottom: scrolled
					? `1px solid ${alpha(theme.palette.divider, 0.15)}`
					: "1px solid transparent",
			}}
		>
			<Box
				sx={{
					mx: "auto",
					maxWidth: "90%",
					px: { xs: 1, sm: 1.5, md: 2 },
					py: 1,
				}}
			>
				<Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 0.5 }}>
					{/* Logo */}
					<Box
						component="img"
						src="/assets/logo/logo_movie.png"
						alt="Tùm lum Phim"
						onClick={() => setTab("home")}
						sx={{
							height: 56,
							flexShrink: 0,
							cursor: "pointer",
							"&:hover": { opacity: 0.8 },
						}}
					/>

					{/* Desktop tabs */}
					<Stack
						direction="row"
						alignItems="center"
						gap={0.5}
						sx={{ display: { xs: "none", md: "flex" } }}
					>
						{TABS.map((item) => (
							<Button
								key={item.value}
								onClick={() => setTab(item.value)}
								size="small"
								sx={{
									textTransform: "none",
									flexShrink: 0,
									color: tab === item.value ? "primary.main" : "text.secondary",
									fontWeight: tab === item.value ? 700 : 400,
									borderRadius: 1,
									px: 1.25,
									py: 0.75,
									"&:hover": {
										color: "text.primary",
										backgroundColor: "transparent",
									},
								}}
							>
								{item.label(item.value === "liked" ? likedCount : undefined)}
							</Button>
						))}
					</Stack>

					<Box sx={{ flex: 1, minWidth: 0 }} />

					{/* Search field — desktop only, hidden when search tab active */}
					<TextField
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						onFocus={() => setTab("search")}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !keyword.trim()) onApplyFilter();
						}}
						placeholder="Tìm kiếm phim..."
						size="small"
						sx={{
							display: { xs: "none", md: tab === "search" ? "none" : "flex" },
							width: { md: 200, lg: 280 },
							"& .MuiOutlinedInput-root": {
								borderRadius: 9999,
								height: { sm: 44 },
							},
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon />
								</InputAdornment>
							),
							endAdornment: keyword ? (
								<InputAdornment position="end">
									<IconButton
										size="small"
										edge="end"
										onClick={() => setKeyword("")}
									>
										<CloseIcon fontSize="small" />
									</IconButton>
								</InputAdornment>
							) : null,
						}}
					/>

					{/* Movie source toggle */}
					<Tooltip title="Nguồn phim">
						<ToggleButtonGroup
							value={movieSource}
							exclusive
							size="small"
							onChange={(_, val: MovieSource | null) => {
								if (val) onMovieSourceChange(val);
							}}
							sx={{ flexShrink: 0, display: { xs: "none", md: "flex" } }}
						>
							<ToggleButton
								value="kkphim"
								aria-label="KKPhim"
								sx={{
									"&.Mui-selected": { color: "primary.main" },
									textTransform: "none",
									fontSize: 11,
									fontWeight: 700,
									px: 1.25,
								}}
							>
								KK
							</ToggleButton>
							<ToggleButton
								value="ophim"
								aria-label="OPhim"
								sx={{
									"&.Mui-selected": { color: "primary.main" },
									textTransform: "none",
									fontSize: 11,
									fontWeight: 700,
									px: 1.25,
								}}
							>
								OP
							</ToggleButton>
						</ToggleButtonGroup>
					</Tooltip>

					{/* Image mode toggle */}
					<ToggleButtonGroup
						value={imageMode}
						exclusive
						size="small"
						onChange={(_, val) => {
							if (val) {
								setImageMode(val);
								localStorage.setItem("imageMode", val);
							}
						}}
						sx={{ flexShrink: 0, display: { xs: "none", md: "flex" } }}
					>
						<Tooltip title="Poster">
							<ToggleButton
								value="poster"
								aria-label="Poster"
								sx={{ "&.Mui-selected": { color: "primary.main" } }}
							>
								<CropLandscapeIcon fontSize="small" />
							</ToggleButton>
						</Tooltip>
						<Tooltip title="Thumbnail">
							<ToggleButton
								value="thumb"
								aria-label="Thumb"
								sx={{ "&.Mui-selected": { color: "primary.main" } }}
							>
								<CropPortraitIcon fontSize="small" />
							</ToggleButton>
						</Tooltip>
					</ToggleButtonGroup>

					{/* Theme toggle */}
					<Tooltip
						title={mode === "light" ? "Chuyển sang tối" : "Chuyển sang sáng"}
					>
						<IconButton
							color="inherit"
							onClick={() => setMode(mode === "light" ? "dark" : "light")}
						>
							{mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
						</IconButton>
					</Tooltip>
				</Stack>
			</Box>
		</Box>
	);
}
