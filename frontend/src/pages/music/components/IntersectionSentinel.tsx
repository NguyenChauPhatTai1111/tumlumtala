import { useEffect, useRef } from "react";

export const IntersectionSentinel = ({
	onVisible,
	root,
}: {
	onVisible: () => void;
	root?: Element | null;
}) => {
	const ref = useRef<HTMLDivElement | null>(null);
	const onVisibleRef = useRef(onVisible);
	onVisibleRef.current = onVisible;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) onVisibleRef.current();
			},
			{ root: root ?? null, threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [root]);

	return <div ref={ref} />;
};
