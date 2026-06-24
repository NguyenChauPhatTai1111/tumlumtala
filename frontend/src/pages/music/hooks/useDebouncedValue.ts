import { useEffect, useState } from "react";

export const useDebouncedValue = (value: string, delay: number) => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedValue(value), delay);
		return () => window.clearTimeout(timer);
	}, [value, delay]);

	return debouncedValue;
};
