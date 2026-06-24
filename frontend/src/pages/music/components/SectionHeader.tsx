import { Box, Typography } from "@mui/material";

export const SectionHeader = ({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) => (
	<Box sx={{ mb: 1.5 }}>
		<Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
			{title}
		</Typography>
		{subtitle && (
			<Typography variant="body2" color="text.secondary">
				{subtitle}
			</Typography>
		)}
	</Box>
);
