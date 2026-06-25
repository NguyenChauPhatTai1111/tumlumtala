import { Suspense, type ComponentType } from "react";
import { useThemeMode } from "@store/themeStore";

interface Props {
  MoviePage: ComponentType<{ mode: "light" | "dark"; setMode: (v: "light" | "dark") => void }>;
}

export default function MoviePageWrapper({ MoviePage }: Props) {
  const { mode, setMode } = useThemeMode();

  return (
    <Suspense fallback={null}>
      <MoviePage mode={mode} setMode={setMode} />
    </Suspense>
  );
}
