export const Theme = {
	LIGHT: "light",
	DARK: "dark",
} as const;

export type ThemeType = (typeof Theme)[keyof typeof Theme];
