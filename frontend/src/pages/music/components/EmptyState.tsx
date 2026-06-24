import { Paper, Typography } from "@mui/material";

export const EmptyState = ({ label }: { label: string }) => (
	<Paper
		variant="outlined"
		sx={{
			p: 3,
			textAlign: "center",
			bgcolor: "background.paper",
			borderStyle: "dashed",
		}}
	>
		<Typography color="text.secondary">{label}</Typography>
	</Paper>
);
