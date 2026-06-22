import { Box, Skeleton } from "@mui/material";

export const MovieCardSkeleton = ({
	imageMode = "poster",
}: {
	imageMode?: "poster" | "thumb";
}) => (
	<Box>
		<Skeleton
			variant="rectangular"
			sx={{
				width: "100%",
				aspectRatio: imageMode === "poster" ? "16/9" : "2/3",
				borderRadius: 1,
			}}
		/>
		<Skeleton width="80%" sx={{ mt: 0.75 }} />
		<Skeleton width="50%" />
	</Box>
);
