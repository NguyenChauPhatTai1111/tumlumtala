import { useEffect, useState } from "react";

interface UseFetchOptions<T> {
	initialData?: T[];
}

export const useFetch = <T>(
	fetchFn: () => Promise<T[]>,
	options?: UseFetchOptions<T>,
) => {
	const [data, setData] = useState<T[]>(options?.initialData ?? []);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetch = async () => {
			try {
				setLoading(true);
				const result = await fetchFn();
				setData(result);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch data");
				console.error("Error fetching data:", err);
			} finally {
				setLoading(false);
			}
		};

		fetch();
	}, [fetchFn]);

	return { data, loading, error };
};
