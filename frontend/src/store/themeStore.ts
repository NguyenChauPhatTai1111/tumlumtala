import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  setMode: () => {},
  toggleMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);
