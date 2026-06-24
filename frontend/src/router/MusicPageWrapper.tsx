import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";

const MusicPage = lazy(() => import("@pages/music/MusicPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function MusicPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <Suspense fallback={null}>
          <MusicPage />
        </Suspense>
      </SnackbarProvider>
    </QueryClientProvider>
  );
}
