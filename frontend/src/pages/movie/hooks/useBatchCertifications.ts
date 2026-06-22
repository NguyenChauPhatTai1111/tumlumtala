import type { OphimMovieItem } from "@pages/movie/types";
import { useEffect, useRef, useState } from "react";
import { batchGetCertifications } from "@/services/movieBackendService";

// Returns a map of slug → rating (T13/T16/T18/P) for movies that have a tmdb.id.
// Fetches missing ones from the backend, which caches results in DB.
export const useBatchCertifications = (
	movies: OphimMovieItem[],
): Record<string, string> => {
	const [ratings, setRatings] = useState<Record<string, string>>({});
	// Track slugs already fetched so re-renders with same list don't re-fetch
	const fetchedSlugs = useRef<Set<string>>(new Set());

	useEffect(() => {
		const toFetch = movies.filter(
			(m) =>
				m.tmdb?.id && m.tmdb.id !== "null" && !fetchedSlugs.current.has(m.slug),
		);
		if (!toFetch.length) return;

		const inputs = toFetch.map((m) => ({
			slug: m.slug,
			tmdb_id: m.tmdb?.id as string,
			tmdb_type: m.tmdb?.type ?? "movie",
		}));

		batchGetCertifications(inputs).then((result) => {
			for (const slug of Object.keys(result)) {
				fetchedSlugs.current.add(slug);
			}
			// Also mark fetched those that had no result (avoid refetching)
			for (const m of toFetch) {
				fetchedSlugs.current.add(m.slug);
			}
			setRatings((prev) => ({ ...prev, ...result }));
		});
	}, [movies]);

	return ratings;
};
