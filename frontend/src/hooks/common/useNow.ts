import { useEffect, useState } from "react";

export const useNow = (interval = 60000) => {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => {
			setNow(Date.now());
		}, interval);

		return () => clearInterval(timer);
	}, [interval]);

	return now;
};
