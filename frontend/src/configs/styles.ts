/**
 * Common styling constants and utilities for consistent UI
 */

export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
} as const;

export const colors = {
	primary: "#1976d2",
	secondary: "#dc004e",
	error: "#f44336",
	warning: "#ff9800",
	success: "#4caf50",
	info: "#2196f3",
	background: "#f5f5f5",
	surface: "#fff",
	text: "#000",
	textSecondary: "#666",
} as const;

export const breakpoints = {
	xs: 0,
	sm: 600,
	md: 960,
	lg: 1264,
	xl: 1904,
} as const;

export const shadows = {
	none: "none",
	sm: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
	md: "0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)",
	lg: "0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)",
} as const;

/**
 * Common component sx styles
 */
export const sxStyles = {
	pageContainer: {
		p: { xs: 1, sm: 2 },
	},
	pageHeader: {
		mb: 2,
		display: "flex",
		justifyContent: "space-between",
		alignItems: { xs: "flex-start", sm: "center" },
		flexDirection: { xs: "column", sm: "row" },
		gap: 1,
	},
	table: {
		mt: { xs: 1, md: 2 },
	},
	dialog: {
		minWidth: { xs: "90vw", sm: 400 },
	},
	button: {
		textTransform: "none",
	},
} as const;
