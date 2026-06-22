import { Box } from "@mui/material";
import { memo } from "react";

export const MovieGridItem = memo(
	({ children }: { children: React.ReactNode }) => (
		<Box sx={{ minWidth: 0 }}>{children}</Box>
	),
);
MovieGridItem.displayName = "MovieGridItem";
