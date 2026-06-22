import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
	typography: {
		fontFamily:
			'"Be Vietnam Pro", "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
	},

	palette: {
		mode: "light",

		primary: {
			main: "#f97316", // orange
		},

		secondary: {
			main: "#edbc94",
		},

		success: {
			main: "#22c55e",
		},

		warning: {
			main: "#facc15",
		},

		error: {
			main: "#f80e0e",
		},

		info: {
			main: "#3b82f6",
		},

		background: {
			default: "#fff7ed",
			paper: "#ffffff",
		},

		text: {
			primary: "#431407",
			secondary: "#9a3412",
		},

		divider: "rgba(249,115,22,0.15)",
	},

	shape: {
		borderRadius: 8,
	},

	components: {
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
				},
			},
		},

		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: "none",
					fontWeight: 600,
					borderRadius: 10,
				},
			},
		},
	},
});

export const darkTheme = createTheme({
	typography: {
		fontFamily:
			'"Be Vietnam Pro", "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
	},

	palette: {
		mode: "dark",

		primary: {
			main: "#f5a461",
		},

		secondary: {
			main: "#f4dabe",
		},

		success: {
			main: "#4ade80",
		},

		warning: {
			main: "#fde047",
		},

		error: {
			main: "#f43535",
		},

		info: {
			main: "#60a5fa",
		},

		background: {
			default: "#1c1917",
			paper: "#292524",
		},

		text: {
			primary: "#fff7ed",
			secondary: "#eacdae",
		},

		divider: "rgba(251,146,60,0.18)",
	},

	shape: {
		borderRadius: 8,
	},

	components: {
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
				},
			},
		},

		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: "none",
					fontWeight: 600,
					borderRadius: 10,
				},
			},
		},
	},
});
