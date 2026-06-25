import { Suspense, lazy } from "react";

const MusicPage = lazy(() => import("@pages/music/MusicPage"));

export default function MusicPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MusicPage />
    </Suspense>
  );
}
