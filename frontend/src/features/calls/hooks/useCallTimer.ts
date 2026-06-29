import { useEffect, useState } from "react";

export function useCallTimer(active: boolean, startedAt?: string) {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		if (!active) {
			setSeconds(0);
			return;
		}
		// If server provides a start timestamp, use it to calculate elapsed offset
		const offset = startedAt ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)) : 0;
		setSeconds(offset);
		const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
		return () => window.clearInterval(id);
	}, [active, startedAt]);

	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes}:${String(rest).padStart(2, "0")}`;
}
