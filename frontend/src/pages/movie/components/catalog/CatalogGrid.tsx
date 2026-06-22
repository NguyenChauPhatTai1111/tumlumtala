import { Box, Paper, Typography } from "@mui/material";
import type { OphimV1CatalogItem } from "@pages/movie/types";

export const CatalogGrid = ({
	items,
	selectedSlug,
	onSelect,
	getItemLabel,
	gridTemplateColumns,
}: {
	items: OphimV1CatalogItem[];
	selectedSlug?: string;
	onSelect: (item: OphimV1CatalogItem) => void;
	getItemLabel?: (item: OphimV1CatalogItem) => string;
	gridTemplateColumns?: Record<string, string> | string;
}) => (
	<Box
		sx={{
			display: "grid",
			gridTemplateColumns:
				gridTemplateColumns ?? "repeat(auto-fill, minmax(140px, 1fr))",
			gap: 1,
		}}
	>
		{items.map((item) => (
			<Paper
				key={item._id}
				variant="outlined"
				onClick={() => onSelect(item)}
				sx={{
					p: 1.25,
					cursor: "pointer",
					textAlign: "center",
					borderColor: selectedSlug === item.slug ? "primary.main" : "divider",
					bgcolor:
						selectedSlug === item.slug ? "action.selected" : "background.paper",
					"&:hover": { borderColor: "primary.main" },
					transition: "border-color 0.15s ease",
				}}
			>
				<Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
					{getItemLabel ? getItemLabel(item) : item.name}
				</Typography>
			</Paper>
		))}
	</Box>
);
