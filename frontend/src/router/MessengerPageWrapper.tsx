import { Suspense, lazy } from "react";

const MessengerPage = lazy(() => import("@pages/messenger/MessengerPage"));

export default function MessengerPageWrapper() {
	return (
		<Suspense fallback={null}>
			<MessengerPage />
		</Suspense>
	);
}
