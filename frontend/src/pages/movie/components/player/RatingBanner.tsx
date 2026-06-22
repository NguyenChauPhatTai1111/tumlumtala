import { Box, Typography } from "@mui/material";

interface RatingBannerProps {
	ageRating?: string | null;
	categories?: { id: string; name: string; slug: string }[];
	visible: boolean;
}

export function RatingBanner({
	ageRating,
	categories,
	visible,
}: RatingBannerProps) {
	if (!ageRating && !(categories && categories.length > 0)) return null;

	return (
		<Box
			sx={{
				position: "absolute",
				top: { xs: 56, sm: 60 },
				left: 16,
				zIndex: 6,
				opacity: visible ? 1 : 0,
				transition: "opacity 0.6s ease",
				pointerEvents: "none",
				borderLeft: "3px solid",
				borderColor: "primary.main",
				pl: 1,
				display: "flex",
				flexDirection: "column",
				gap: 0.25,
			}}
		>
			{ageRating && (
				<Typography
					sx={{
						color: "primary.main",
						fontWeight: 700,
						fontSize: { xs: "0.75rem", sm: "0.85rem" },
						lineHeight: 1.3,
						letterSpacing: 0.5,
					}}
				>
					XẾP HẠNG {ageRating}
				</Typography>
			)}
			{categories && categories.length > 0 && (
				<Typography
					sx={{
						color: "#fff",
						fontSize: { xs: "0.7rem", sm: "0.78rem" },
						fontWeight: 400,
						lineHeight: 1.3,
					}}
				>
					{categories.map((c) => c.name).join(", ")}
				</Typography>
			)}
		</Box>
	);
}
