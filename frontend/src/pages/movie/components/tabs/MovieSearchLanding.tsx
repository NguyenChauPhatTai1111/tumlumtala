import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import TvOutlinedIcon from "@mui/icons-material/TvOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const SEARCH_TIPS = [
	{
		number: 1,
		icon: <SearchOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Tìm kiếm phim",
		short: "Nhập tên phim",
		description: "Nhập tên phim, diễn viên hoặc đạo diễn để tìm nhanh",
	},
	{
		number: 2,
		icon: <FilterListOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Lọc nâng cao",
		short: "Lọc theo thể loại, năm",
		description: "Chọn thể loại, quốc gia, năm sản xuất và sắp xếp theo ý muốn",
	},
	{
		number: 3,
		icon: <TvOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Xem ngay",
		short: "Click phim để xem",
		description: "Click vào phim bất kỳ để xem thông tin và phát tập đầu tiên",
	},
];

const NO_RESULT_TIPS = [
	{
		number: 1,
		icon: <TuneOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Thử từ khóa khác",
		short: "Thử tên gốc tiếng Anh",
		description: "Kiểm tra chính tả hoặc dùng tên gốc (tiếng Anh) của phim",
	},
	{
		number: 2,
		icon: <FilterListOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Điều chỉnh bộ lọc",
		short: "Bỏ bớt bộ lọc",
		description: "Bỏ bớt thể loại, quốc gia hoặc năm để mở rộng kết quả",
	},
	{
		number: 3,
		icon: <UndoOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Xóa bộ lọc",
		short: "Đặt lại mặc định",
		description: "Đặt lại tất cả bộ lọc về mặc định và tìm lại từ đầu",
	},
];

const LandingBase = ({
	icon,
	title,
	subtitle,
	tips,
	accentColor = "primary",
}: {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	tips: readonly {
		number: number;
		icon: React.ReactNode;
		title: string;
		short: string;
		description: string;
	}[];
	accentColor?: "primary" | "warning" | "error" | "success" | "info";
}) => (
	<Box
		sx={(theme) => ({
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: { xs: 2.5, md: 5 },
			px: { xs: 2, md: 4 },
			mx: { xs: -1, sm: -1.5, md: -2 },
			background: `linear-gradient(-45deg, ${alpha(theme.palette[accentColor].main, 0.12)}, ${theme.palette.background.default}, ${alpha(theme.palette.secondary.main, 0.08)}, ${alpha(theme.palette[accentColor].main, 0.06)})`,
			backgroundSize: "400% 400%",
			animation: "gradientShift 10s ease infinite",
			"@keyframes gradientShift": {
				"0%": { backgroundPosition: "0% 50%" },
				"50%": { backgroundPosition: "100% 50%" },
				"100%": { backgroundPosition: "0% 50%" },
			},
			position: "relative",
			overflow: "hidden",
			flex: 1,
		})}
	>
		{/* Decorative blobs */}
		<Box
			sx={(theme) => ({
				position: "absolute",
				width: 320,
				height: 320,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${alpha(theme.palette[accentColor].main, 0.15)} 0%, transparent 70%)`,
				top: -100,
				right: -80,
				pointerEvents: "none",
				animation: "blob1 8s ease-in-out infinite",
				"@keyframes blob1": {
					"0%, 100%": { transform: "translate(0, 0) scale(1)" },
					"33%": { transform: "translate(-40px, 30px) scale(1.1)" },
					"66%": { transform: "translate(20px, -20px) scale(0.95)" },
				},
			})}
		/>
		<Box
			sx={(theme) => ({
				position: "absolute",
				width: 240,
				height: 240,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 70%)`,
				bottom: 0,
				left: -60,
				pointerEvents: "none",
				animation: "blob2 10s ease-in-out infinite",
				"@keyframes blob2": {
					"0%, 100%": { transform: "translate(0, 0) scale(1)" },
					"40%": { transform: "translate(50px, -30px) scale(1.15)" },
					"70%": { transform: "translate(-20px, 20px) scale(0.9)" },
				},
			})}
		/>
		<Box
			sx={(theme) => ({
				position: "absolute",
				width: 180,
				height: 180,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${alpha(theme.palette[accentColor].main, 0.09)} 0%, transparent 70%)`,
				bottom: "30%",
				right: "10%",
				pointerEvents: "none",
				animation: "blob3 12s ease-in-out infinite",
				"@keyframes blob3": {
					"0%, 100%": { transform: "translate(0, 0) scale(1)" },
					"50%": { transform: "translate(-30px, -40px) scale(1.2)" },
				},
			})}
		/>

		{/* Hero icon */}
		<Box sx={{ position: "relative", display: "inline-flex" }}>
			<Box
				sx={(theme) => ({
					width: { xs: 64, md: 88 },
					height: { xs: 64, md: 88 },
					borderRadius: "50%",
					background: `linear-gradient(135deg, ${theme.palette[accentColor].main} 0%, ${theme.palette.secondary.main} 100%)`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: `0 12px 40px ${alpha(theme.palette[accentColor].main, 0.35)}`,
				})}
			>
				{icon}
			</Box>
			<Box
				sx={(theme) => ({
					position: "absolute",
					inset: -8,
					borderRadius: "50%",
					border: "2px solid",
					borderColor: alpha(theme.palette[accentColor].main, 0.25),
					animation: "ping 2.4s ease-in-out infinite",
					"@keyframes ping": {
						"0%": { transform: "scale(1)", opacity: 0.6 },
						"100%": { transform: "scale(1.5)", opacity: 0 },
					},
				})}
			/>
		</Box>

		{/* Title */}
		<Box sx={{ textAlign: "center", width: "100%" }}>
			<Typography
				variant="h5"
				fontWeight={800}
				gutterBottom
				sx={{ letterSpacing: -0.5 }}
			>
				{title}
			</Typography>
			<Typography variant="body2" color="text.secondary">
				{subtitle}
			</Typography>
		</Box>

		{/* Tip cards */}
		<Box
			sx={{
				display: "flex",
				flexDirection: "row",
				gap: { xs: 1, md: 2 },
				justifyContent: "center",
				alignItems: "stretch",
				width: "100%",
			}}
		>
			{tips.map((tip) => (
				<Paper
					key={tip.number}
					elevation={0}
					sx={(theme) => ({
						flex: 1,
						p: { xs: 1.5, md: 2.5 },
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: { xs: 0.75, md: 1.5 },
						borderRadius: 3,
						border: "1px solid",
						borderColor: "divider",
						bgcolor: alpha(theme.palette.background.paper, 0.75),
						backdropFilter: "blur(10px)",
						transition: "transform 0.2s ease, box-shadow 0.2s ease",
						"&:hover": {
							transform: "translateY(-4px)",
							boxShadow: `0 10px 28px ${alpha(theme.palette[accentColor].main, 0.14)}`,
						},
					})}
				>
					<Box
						sx={(theme) => ({
							width: { xs: 28, md: 36 },
							height: { xs: 28, md: 36 },
							borderRadius: "50%",
							background: `linear-gradient(135deg, ${theme.palette[accentColor].main} 0%, ${theme.palette.secondary.main} 100%)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: theme.palette.primary.contrastText,
							fontWeight: 800,
							fontSize: { xs: 13, md: 16 },
							boxShadow: `0 4px 12px ${alpha(theme.palette[accentColor].main, 0.4)}`,
							flexShrink: 0,
						})}
					>
						{tip.number}
					</Box>
					<Box
						sx={{
							color: `${accentColor}.main`,
							display: "flex",
							alignItems: "center",
						}}
					>
						{tip.icon}
					</Box>
					<Box sx={{ textAlign: "center" }}>
						<Typography
							variant="subtitle2"
							fontWeight={700}
							sx={{ mb: 0.5, fontSize: { xs: "0.7rem", md: "0.875rem" } }}
						>
							{tip.title}
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ lineHeight: 1.5, display: "block" }}
						>
							<Box
								component="span"
								sx={{ display: { xs: "none", sm: "inline" } }}
							>
								{tip.description}
							</Box>
							<Box
								component="span"
								sx={{ display: { xs: "inline", sm: "none" } }}
							>
								{tip.short}
							</Box>
						</Typography>
					</Box>
				</Paper>
			))}
		</Box>
	</Box>
);

export const MovieSearchLanding = () => (
	<LandingBase
		icon={
			<SearchOutlinedIcon
				sx={{ fontSize: { xs: 32, md: 44 }, color: "primary.contrastText" }}
			/>
		}
		title="Tìm kiếm & Khám phá"
		subtitle="Gõ tên phim để tìm kiếm, hoặc dùng bộ lọc để duyệt"
		tips={SEARCH_TIPS}
		accentColor="primary"
	/>
);

export const MovieNoResultLanding = ({ keyword }: { keyword?: string }) => (
	<LandingBase
		icon={
			<SearchOffOutlinedIcon
				sx={{ fontSize: { xs: 32, md: 44 }, color: "primary.contrastText" }}
			/>
		}
		title={keyword ? `Không tìm thấy "${keyword}"` : "Không có kết quả"}
		subtitle="Thử điều chỉnh từ khóa hoặc bộ lọc để tìm được phim bạn muốn"
		tips={NO_RESULT_TIPS}
		accentColor="error"
	/>
);

const LIKED_TIPS = [
	{
		number: 1,
		icon: <FavoriteBorderOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Nhấn vào trái tim",
		short: "Bấm icon yêu thích",
		description:
			"Bấm biểu tượng yêu thích trên mỗi thẻ phim để lưu vào danh sách",
	},
	{
		number: 2,
		icon: <StarBorderOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Lưu vào tài khoản",
		short: "Đồng bộ tài khoản",
		description: "Danh sách yêu thích được đồng bộ với tài khoản của bạn",
	},
	{
		number: 3,
		icon: <ExploreOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Khám phá thêm",
		short: "Duyệt trang chủ",
		description: "Duyệt trang chủ hoặc tìm kiếm để tìm thêm phim yêu thích",
	},
];

const HISTORY_TIPS = [
	{
		number: 1,
		icon: (
			<PlayCircleOutlineOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />
		),
		title: "Xem phim bất kỳ",
		short: "Phát phim để lưu",
		description: "Mỗi tập phim bạn phát sẽ tự động được ghi vào lịch sử",
	},
	{
		number: 2,
		icon: <HistoryOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Xem lại dễ dàng",
		short: "Tiếp tục phim dở",
		description: "Tiếp tục xem phim dở dang mà không cần tìm lại từ đầu",
	},
	{
		number: 3,
		icon: <ExploreOutlinedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
		title: "Khám phá ngay",
		short: "Vào trang chủ",
		description: "Vào trang chủ để bắt đầu xem và tạo lịch sử của bạn",
	},
];

export const MovieLikedLanding = () => (
	<LandingBase
		icon={
			<FavoriteBorderOutlinedIcon
				sx={{ fontSize: { xs: 32, md: 44 }, color: "primary.contrastText" }}
			/>
		}
		title="Chưa có phim yêu thích"
		subtitle="Lưu những bộ phim bạn yêu thích để xem lại bất cứ lúc nào"
		tips={LIKED_TIPS}
		accentColor="error"
	/>
);

export const MovieHistoryLanding = () => (
	<LandingBase
		icon={
			<HistoryOutlinedIcon
				sx={{ fontSize: { xs: 32, md: 44 }, color: "primary.contrastText" }}
			/>
		}
		title="Chưa có lịch sử xem phim"
		subtitle="Các phim bạn đã xem sẽ được lưu tại đây để dễ dàng xem lại"
		tips={HISTORY_TIPS}
		accentColor="warning"
	/>
);
