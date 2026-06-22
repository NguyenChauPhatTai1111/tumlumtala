import { type RefObject, useEffect } from "react";

const FIRST_INPUT_SELECTOR = [
	"input:not([type='hidden']):not([type='file']):not([disabled])",
	"textarea:not([disabled])",
	"[contenteditable='true']",
].join(",");

export const useAutoFocusFirstInput = (
	containerRef: RefObject<HTMLElement | null>,
	enabled: boolean,
	dependencies: unknown[] = [],
) => {
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const timer = window.setTimeout(() => {
			const container = containerRef.current;
			if (!container) {
				return;
			}

			if (
				document.activeElement instanceof HTMLElement &&
				container.contains(document.activeElement) &&
				document.activeElement.matches(FIRST_INPUT_SELECTOR)
			) {
				return;
			}

			const input = container.querySelector<HTMLElement>(FIRST_INPUT_SELECTOR);
			input?.focus({ preventScroll: true });
		}, 80);

		return () => window.clearTimeout(timer);
		// dependencies intentionally re-trigger focus when tab/dialog content changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [containerRef, enabled, ...dependencies]);
};
