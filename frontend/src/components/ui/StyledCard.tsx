import {
	Box,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	CardMedia,
	type CardProps,
	styled,
} from "@mui/material";
import type { ReactNode } from "react";

export const StyledCard = styled(Card)(({ theme }) => ({
	borderRadius: "12px",
	boxShadow: theme.shadows[2],
	transition: theme.transitions.create(["box-shadow", "transform"], {
		duration: theme.transitions.duration.shorter,
	}),
	"&:hover": {
		boxShadow: theme.shadows[8],
		transform: "translateY(-2px)",
	},
	backgroundColor: theme.palette.background.paper,
}));

interface StyledCardComponentProps
	extends Omit<CardProps, "content" | "title" | "subtitle"> {
	title?: ReactNode;
	subtitle?: ReactNode;
	content?: ReactNode;
	actions?: ReactNode;
	image?: string;
	imageAlt?: string;
	children?: ReactNode;
}

export const CardComponent = ({
	title,
	subtitle,
	content,
	actions,
	image,
	imageAlt,
	children,
	...props
}: StyledCardComponentProps) => (
	<StyledCard {...props}>
		{image && (
			<CardMedia component="img" height="200" image={image} alt={imageAlt} />
		)}
		{title && <CardHeader title={title} subheader={subtitle} />}
		<CardContent>{children || content}</CardContent>
		{actions && <CardActions>{actions}</CardActions>}
	</StyledCard>
);

// Variant: Elevated Card
export const ElevatedCard = styled(StyledCard)(({ theme }) => ({
	boxShadow: theme.shadows[8],
	"&:hover": {
		boxShadow: theme.shadows[20],
	},
}));

// Variant: Outlined Card
export const OutlinedCard = styled(StyledCard)(({ theme }) => ({
	border: `1px solid ${theme.palette.divider}`,
	boxShadow: "none",
	"&:hover": {
		boxShadow: theme.shadows[4],
		border: `1px solid ${theme.palette.primary.main}`,
	},
}));

// Variant: Default Card (no shadow)
export const FlatCard = styled(StyledCard)(({ theme }) => ({
	boxShadow: "none",
	border: `1px solid ${theme.palette.divider}`,
	"&:hover": {
		border: `1px solid ${theme.palette.primary.main}`,
		backgroundColor: theme.palette.action.hover,
	},
}));

// Card Grid Wrapper
export const CardGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
	gap: theme.spacing(2),
	padding: theme.spacing(2),
}));

// Card Row Wrapper
export const CardRow = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(2),
	flexWrap: "wrap",
	"& > *": {
		flex: "1 1 300px",
	},
}));
