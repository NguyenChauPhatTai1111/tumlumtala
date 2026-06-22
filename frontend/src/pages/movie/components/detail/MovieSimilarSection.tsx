import { Box, Divider, Typography } from "@mui/material";
import type { OphimMovieItem } from "@pages/movie/types";
import { SimilarCard } from "./SimilarCard";

export const MovieSimilarSection = ({
	movies,
	certRatings,
	onShowInfo,
	onPlayAndOpen,
}: {
	movies: OphimMovieItem[];
	certRatings: Record<string, string>;
	onShowInfo?: (movie: OphimMovieItem) => void;
	onPlayAndOpen?: (movie: OphimMovieItem) => void;
}) => {
	return (
		<Box sx={{ mt: 3 }}>
			<Divider sx={{ mb: 2 }} />
			<Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
				Nội dung tương tự
			</Typography>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: {
						xs: "repeat(2, 1fr)",
						sm: "repeat(3, 1fr)",
					},
					gap: 1.5,
				}}
			>
				{movies.map((m) => (
					<SimilarCard
						key={m.slug}
						movie={m}
						liked={false}
						rating={certRatings[m.slug]}
						onShowInfo={onShowInfo}
						onPlayAndOpen={onPlayAndOpen}
					/>
				))}
			</Box>
		</Box>
	);
};
