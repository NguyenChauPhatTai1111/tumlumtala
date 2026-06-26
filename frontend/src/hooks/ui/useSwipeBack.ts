import { useCallback, useEffect, useRef } from "react";

type Options = {
	onSwipe: () => void;
	minDistance?: number;
	maxVerticalRatio?: number;
	disabled?: boolean;
};

export function useSwipeBack({
	onSwipe,
	minDistance = 60,
	maxVerticalRatio = 0.5,
	disabled = false,
}: Options) {
	const elRef = useRef<HTMLDivElement | null>(null);
	const startX = useRef<number | null>(null);
	const startY = useRef<number | null>(null);
	const tracking = useRef(false);
	const onSwipeRef = useRef(onSwipe);
	onSwipeRef.current = onSwipe;

	useEffect(() => {
		const el = elRef.current;
		if (!el || disabled) return;

		const onTouchStart = (e: TouchEvent) => {
			const touch = e.touches[0];
			startX.current = touch.clientX;
			startY.current = touch.clientY;
			tracking.current = false;
		};

		const onTouchMove = (e: TouchEvent) => {
			if (startX.current === null || startY.current === null) return;

			const touch = e.touches[0];
			const dx = touch.clientX - startX.current;
			const dy = Math.abs(touch.clientY - startY.current);

			// Only track if clearly a horizontal-right swipe
			if (dx > 10 && dy / dx < maxVerticalRatio) {
				tracking.current = true;
				e.preventDefault();
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			if (!tracking.current || startX.current === null) return;

			const touch = e.changedTouches[0];
			const dx = touch.clientX - startX.current;
			const dy = Math.abs(touch.clientY - (startY.current ?? 0));

			startX.current = null;
			startY.current = null;
			tracking.current = false;

			if (dx >= minDistance && dy / dx < maxVerticalRatio) {
				onSwipeRef.current();
			}
		};

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: false });
		el.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}, [disabled, minDistance, maxVerticalRatio]);

	const ref = useCallback((el: HTMLDivElement | null) => {
		elRef.current = el;
	}, []);

	return { ref };
}
