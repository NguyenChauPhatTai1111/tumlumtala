import { sxStyles } from "@configs/styles";
import { Box, Stack, type StackProps, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface PageHeadingProps {
	title: string;
	action?: ReactNode;
	subtitle?: string;
}

export const PageHeading = ({ title, action, subtitle }: PageHeadingProps) => {
	return (
		<Box sx={sxStyles.pageHeader}>
			<Box>
				<Typography
					variant="h4"
					sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2.125rem" } }}
				>
					{title}
				</Typography>
				{subtitle && (
					<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
						{subtitle}
					</Typography>
				)}
			</Box>
			{action && <Box>{action}</Box>}
		</Box>
	);
};

interface PageContainerProps {
	children: ReactNode;
}

export const PageContainer = ({ children }: PageContainerProps) => {
	return <Box sx={sxStyles.pageContainer}>{children}</Box>;
};

interface ActionStackProps extends Omit<StackProps, "children"> {
	children: ReactNode;
}

export const ActionStack = ({ children, ...props }: ActionStackProps) => {
	return (
		<Stack direction="row" spacing={1} {...props}>
			{children}
		</Stack>
	);
};
