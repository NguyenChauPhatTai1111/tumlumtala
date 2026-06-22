import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import {
	alpha,
	Box,
	Divider,
	IconButton,
	Link,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

const SOCIAL_LINKS = [
	{ icon: <FacebookIcon />, href: "#", label: "Facebook" },
	{ icon: <InstagramIcon />, href: "#", label: "Instagram" },
	{ icon: <TwitterIcon />, href: "#", label: "Twitter" },
	{ icon: <YouTubeIcon />, href: "#", label: "YouTube" },
];

const FOOTER_COLUMNS = [
	{
		links: [
			{ label: "Mô tả âm thanh", href: "#" },
			{ label: "Quan hệ với nhà đầu tư", href: "#" },
			{ label: "Thông báo pháp lý", href: "#" },
		],
	},
	{
		links: [
			{ label: "Trung tâm trợ giúp", href: "#" },
			{ label: "Việc làm", href: "#" },
			{ label: "Tùy chọn cookie", href: "#" },
		],
	},
	{
		links: [
			{ label: "Thẻ quà tặng", href: "#" },
			{ label: "Điều khoản sử dụng", href: "#" },
			{ label: "Thông tin doanh nghiệp", href: "#" },
		],
	},
	{
		links: [
			{ label: "Trung tâm đa phương tiện", href: "#" },
			{ label: "Quyền riêng tư", href: "#" },
			{ label: "Liên hệ với chúng tôi", href: "#" },
		],
	},
];

export function MovieFooter() {
	const theme = useTheme();

	return (
		<Box
			component="footer"
			sx={{
				flexShrink: 0,
				backgroundColor: alpha(theme.palette.background.paper, 0.6),
				backdropFilter: "blur(12px)",
				borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
				px: { xs: 3, sm: 4, md: 6 },
				pt: { xs: 3, sm: 4 },
				pb: { xs: 3, sm: 4 },
			}}
		>
			<Stack
				direction={{ xs: "column", md: "row" }}
				gap={{ xs: 3, md: 4 }}
				sx={{ mb: 3 }}
				alignItems="flex-start"
			>
				{/* Logo + slogan — left */}
				<Stack alignItems="flex-start" gap={0.5} sx={{ flexShrink: 0 }}>
					<Box
						component="img"
						src="/assets/logo/logo_movie.png"
						alt="Tùm lum Phim"
						sx={{ height: 100, opacity: 0.85 }}
					/>
					<Typography variant="caption" color="primary.main">
						Tùm Lum Phim – Phim nào cũng có, khỏi phải đắn đo.
					</Typography>
				</Stack>

				{/* Right side: social + links */}
				<Stack gap={2} sx={{ flex: 1, minWidth: 0 }}>
					{/* Social icons */}
					<Stack direction="row" gap={0.5}>
						{SOCIAL_LINKS.map(({ icon, href, label }) => (
							<IconButton
								key={label}
								component="a"
								href={href}
								aria-label={label}
								size="medium"
								sx={{
									color: "text.secondary",
									"&:hover": { color: "text.primary" },
								}}
							>
								{icon}
							</IconButton>
						))}
					</Stack>

					{/* Link columns */}
					<Grid container spacing={{ xs: 1.5, sm: 2 }}>
						{FOOTER_COLUMNS.map((col) => (
							<Grid
								key={col.links[0]?.label}
								size={{ xs: 6, sm: 3 }}
								component="div"
							>
								<Stack gap={1.25}>
									{col.links.map(({ label, href }) => (
										<Link
											key={label}
											href={href}
											underline="hover"
											variant="caption"
											color="text.secondary"
											sx={{ "&:hover": { color: "text.primary" } }}
										>
											{label}
										</Link>
									))}
								</Stack>
							</Grid>
						))}
					</Grid>
				</Stack>
			</Stack>

			<Divider sx={{ mb: 2, opacity: 0.3 }} />

			<Typography
				variant="caption"
				color="text.disabled"
				display="block"
				textAlign="center"
			>
				© {new Date().getFullYear()} Tùm lum Phim — Dữ liệu phim được cung cấp
				bởi{" "}
				<Link
					href="https://ophim.one"
					target="_blank"
					rel="noopener noreferrer"
					color="inherit"
					underline="hover"
				>
					OPhim
				</Link>{" "}
				và{" "}
				<Link
					href="https://www.themoviedb.org"
					target="_blank"
					rel="noopener noreferrer"
					color="inherit"
					underline="hover"
				>
					TMDB
				</Link>
				.
			</Typography>
		</Box>
	);
}
