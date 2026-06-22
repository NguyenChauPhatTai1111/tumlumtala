import { Suspense, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";
import { useThemeMode } from "@store/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

interface Props {
  MoviePage: ComponentType<{ mode: "light" | "dark"; setMode: (v: "light" | "dark") => void }>;
}

export default function MoviePageWrapper({ MoviePage }: Props) {
  const { mode, setMode } = useThemeMode();

  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <Suspense fallback={null}>
          <MoviePage mode={mode} setMode={setMode} />
        </Suspense>
      </SnackbarProvider>
    </QueryClientProvider>
  );
}
