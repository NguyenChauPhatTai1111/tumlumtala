import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const PageLoader = () => (
	<Box
		sx={(theme) => ({
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			height: "100vh",
			overflow: "hidden",
			position: "relative",
			background: `linear-gradient(-45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${theme.palette.background.default}, ${alpha(theme.palette.secondary.main, 0.07)}, ${alpha(theme.palette.primary.main, 0.05)})`,
			backgroundSize: "400% 400%",
			animation: "pgLoaderGradient 8s ease infinite",
			"@keyframes pgLoaderGradient": {
				"0%": { backgroundPosition: "0% 50%" },
				"50%": { backgroundPosition: "100% 50%" },
				"100%": { backgroundPosition: "0% 50%" },
			},
		})}
	>
		{/* Decorative blobs */}
		<Box
			sx={(theme) => ({
				position: "absolute",
				width: 280,
				height: 280,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.13)} 0%, transparent 70%)`,
				top: "-80px",
				right: "-60px",
				pointerEvents: "none",
				animation: "pgBlob1 8s ease-in-out infinite",
				"@keyframes pgBlob1": {
					"0%, 100%": { transform: "translate(0, 0) scale(1)" },
					"50%": { transform: "translate(-30px, 25px) scale(1.1)" },
				},
			})}
		/>
		<Box
			sx={(theme) => ({
				position: "absolute",
				width: 200,
				height: 200,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
				bottom: "-50px",
				left: "-40px",
				pointerEvents: "none",
				animation: "pgBlob2 10s ease-in-out infinite",
				"@keyframes pgBlob2": {
					"0%, 100%": { transform: "translate(0, 0) scale(1)" },
					"50%": { transform: "translate(40px, -25px) scale(1.15)" },
				},
			})}
		/>

		{/* Spinner icon */}
		<Box sx={{ position: "relative", display: "inline-flex", mb: 3 }}>
			<Box
				sx={(theme) => ({
					width: 64,
					height: 64,
					borderRadius: "50%",
					background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
					boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
					animation: "pgSpinPulse 1.8s ease-in-out infinite",
					"@keyframes pgSpinPulse": {
						"0%, 100%": { transform: "scale(1)", opacity: 1 },
						"50%": { transform: "scale(0.88)", opacity: 0.75 },
					},
				})}
			/>
			<Box
				sx={(theme) => ({
					position: "absolute",
					inset: -6,
					borderRadius: "50%",
					border: "2px solid",
					borderColor: alpha(theme.palette.primary.main, 0.3),
					animation: "pgPing 2s ease-in-out infinite",
					"@keyframes pgPing": {
						"0%": { transform: "scale(1)", opacity: 0.6 },
						"100%": { transform: "scale(1.6)", opacity: 0 },
					},
				})}
			/>
		</Box>

		<Typography
			variant="body1"
			fontWeight={600}
			sx={(theme) => ({
				color: "text.secondary",
				letterSpacing: 0.5,
				background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
				WebkitBackgroundClip: "text",
				WebkitTextFillColor: "transparent",
				backgroundClip: "text",
			})}
		>
			Đang tải...
		</Typography>
	</Box>
);

export default PageLoader;
