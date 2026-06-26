import { useEffect, useState } from "react";

type MobileVisualViewport = {
	height: number;
	offsetTop: number;
};

export function useMobileVisualViewport(enabled: boolean): MobileVisualViewport | null {
	const [viewport, setViewport] = useState<MobileVisualViewport | null>(null);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") {
			setViewport(null);
			return;
		}

		const readViewport = () => {
			const vv = window.visualViewport;
			setViewport({
				height: Math.round(vv?.height ?? window.innerHeight),
				offsetTop: Math.round(vv?.offsetTop ?? 0),
			});
		};

		readViewport();
		window.visualViewport?.addEventListener("resize", readViewport);
		window.visualViewport?.addEventListener("scroll", readViewport);
		window.addEventListener("orientationchange", readViewport);
		window.addEventListener("resize", readViewport);

		return () => {
			window.visualViewport?.removeEventListener("resize", readViewport);
			window.visualViewport?.removeEventListener("scroll", readViewport);
			window.removeEventListener("orientationchange", readViewport);
			window.removeEventListener("resize", readViewport);
		};
	}, [enabled]);

	return viewport;
}
