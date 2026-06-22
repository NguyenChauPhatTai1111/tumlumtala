import { Box, Stack, Typography } from "@mui/material";

export const UserScoreCircle = ({
	score,
	count,
	tmdbId,
	tmdbType,
}: {
	score: number;
	count?: number | null;
	tmdbId?: string | null;
	tmdbType?: string | null;
}) => {
	const pct = Math.round(score * 10);
	const strokeColor = pct >= 70 ? "#22f022" : pct >= 40 ? "#d2d531" : "#db2360";
	const trackColor = pct >= 70 ? "#204529" : pct >= 40 ? "#423d0f" : "#571435";
	const size = 46;
	const sw = 3;
	const r = size / 2 - sw - 1;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * r;
	const dash = (pct / 100) * circumference;

	return (
		<Stack direction="row" spacing={1} alignItems="center">
			<Box
				sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
			>
				<svg
					width={size}
					height={size}
					style={{ display: "block" }}
					aria-label="Rating score"
					role="img"
				>
					<circle cx={cx} cy={cy} r={cx - 1} fill="#0d253f" />
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke={trackColor}
						strokeWidth={sw}
					/>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke={strokeColor}
						strokeWidth={sw}
						strokeDasharray={`${dash} ${circumference - dash}`}
						strokeLinecap="round"
						transform={`rotate(-90 ${cx} ${cy})`}
					/>
				</svg>
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Typography
						sx={{
							color: "white",
							fontSize: 11,
							fontWeight: 900,
							lineHeight: 1,
						}}
					>
						{pct}
						<Box component="sup" sx={{ fontSize: 7 }}>
							%
						</Box>
					</Typography>
				</Box>
			</Box>
			<Box
				{...(tmdbId
					? {
							component: "a" as const,
							href: `https://www.themoviedb.org/${tmdbType === "tv" ? "tv" : "movie"}/${tmdbId}`,
							target: "_blank",
							rel: "noopener noreferrer",
						}
					: {})}
				sx={{
					textDecoration: "none",
					...(tmdbId
						? {
								cursor: "pointer",
								"&:hover .tmdb-label": { textDecoration: "underline" },
							}
						: {}),
				}}
			>
				<Typography
					className="tmdb-label"
					sx={{
						color: "primary.main",
						fontSize: 11,
						fontWeight: 800,
						lineHeight: 1.3,
					}}
				>
					TMDB
				</Typography>
				{count != null && (
					<Typography
						sx={{
							color: "rgba(255,255,255,0.5)",
							fontSize: 9,
							lineHeight: 1.3,
						}}
					>
						{count.toLocaleString()} đánh giá
					</Typography>
				)}
			</Box>
		</Stack>
	);
};
