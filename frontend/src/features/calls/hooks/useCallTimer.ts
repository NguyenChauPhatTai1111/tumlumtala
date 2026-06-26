import { useEffect, useState } from "react";

export function useCallTimer(active: boolean) {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		if (!active) {
			setSeconds(0);
			return;
		}
		const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
		return () => window.clearInterval(id);
	}, [active]);

	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes}:${String(rest).padStart(2, "0")}`;
}
