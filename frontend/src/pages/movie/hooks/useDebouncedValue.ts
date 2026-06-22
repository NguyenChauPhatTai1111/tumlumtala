import { useEffect, useState } from "react";

export const useDebouncedValue = (value: string, delay: number) => {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(value), delay);
		return () => window.clearTimeout(t);
	}, [value, delay]);
	return debounced;
};
