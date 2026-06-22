import { proxyImageUrl } from "@/services/movieService";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// ── Images ───────────────────────────────────────────────────────────────────

interface TMDBImage {
	file_path: string;
	iso_639_1: string | null;
	vote_average: number;
	vote_count: number;
	width: number;
	height: number;
}

export interface TMDBImagesData {
	backdrops: TMDBImage[];
	posters: TMDBImage[];
}

export const getTMDBImages = async (
	tmdbId: string,
	type: "movie" | "tv",
): Promise<TMDBImagesData> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const res = await fetch(
		`${TMDB_BASE}/${type}/${tmdbId}/images?api_key=${apiKey}&include_image_language=vi%2Cnull%2Cen`,
	);
	if (!res.ok) throw new Error(`TMDB ${res.status}`);
	return res.json() as Promise<TMDBImagesData>;
};

const pickRandom = <T>(arr: T[]): T =>
	arr[Math.floor(Math.random() * arr.length)];

const pickBestImage = (images: TMDBImage[]): TMDBImage | null => {
	if (!images.length) return null;
	for (const lang of ["vi", null, "en"] as const) {
		const filtered = images.filter((img) => img.iso_639_1 === lang);
		if (filtered.length > 0) return pickRandom(filtered);
	}
	return pickRandom(images);
};

export const resolveTMDBBackdrop = (
	data: TMDBImagesData,
	size = "w1280",
): string | null => {
	const best = pickBestImage(data.backdrops ?? []);
	return best ? proxy(`${TMDB_IMAGE_BASE}/${size}${best.file_path}`) : null;
};

export const resolveTMDBPoster = (
	data: TMDBImagesData,
	size = "w500",
): string | null => {
	const best = pickBestImage(data.posters ?? []);
	return best ? proxy(`${TMDB_IMAGE_BASE}/${size}${best.file_path}`) : null;
};

// ── Videos ───────────────────────────────────────────────────────────────────

interface TMDBVideo {
	key: string;
	site: string;
	type: string;
	official: boolean;
	iso_639_1: string;
}

interface TMDBVideosResponse {
	results: TMDBVideo[];
}

export const getTMDBVideos = async (
	tmdbId: string,
	type: "movie" | "tv",
): Promise<TMDBVideosResponse> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const res = await fetch(
		`${TMDB_BASE}/${type}/${tmdbId}/videos?api_key=${apiKey}`,
	);
	if (!res.ok) throw new Error(`TMDB ${res.status}`);
	return res.json() as Promise<TMDBVideosResponse>;
};

export const resolveTMDBTrailerEmbedUrl = (
	data: TMDBVideosResponse,
): string | null => {
	const ytVideos = data.results.filter((v) => v.site === "YouTube");
	if (!ytVideos.length) return null;
	const priority = [
		ytVideos.find((v) => v.official && v.type === "Trailer"),
		ytVideos.find((v) => v.type === "Trailer"),
		ytVideos.find((v) => v.official && v.type === "Teaser"),
		ytVideos.find((v) => v.type === "Teaser"),
		ytVideos[0],
	];
	const picked = priority.find(Boolean);
	if (!picked) return null;
	return `https://www.youtube.com/embed/${picked.key}?autoplay=1&mute=0&enablejsapi=1&playsinline=1&rel=0`;
};

// ── Combined details (credits + images + videos in one request) ───────────────

export interface TMDBCastMember {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

export interface TMDBCrewMember {
	id: number;
	name: string;
	job: string;
	department: string;
	profile_path: string | null;
}

export interface TMDBDetailsWithAll {
	id: number;
	tagline?: string;
	overview?: string;
	runtime?: number;
	release_date?: string;
	first_air_date?: string;
	vote_average?: number;
	vote_count?: number;
	credits: {
		cast: TMDBCastMember[];
		crew: TMDBCrewMember[];
	};
	images: TMDBImagesData;
	videos: TMDBVideosResponse;
}

export const getTMDBDetailsWithAll = async (
	tmdbId: string,
	type: "movie" | "tv",
): Promise<TMDBDetailsWithAll> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const res = await fetch(
		`${TMDB_BASE}/${type}/${tmdbId}?api_key=${apiKey}&language=vi-VN&append_to_response=credits,images,videos&include_image_language=vi%2Cnull%2Cen`,
	);
	if (!res.ok) throw new Error(`TMDB ${res.status}`);
	return res.json() as Promise<TMDBDetailsWithAll>;
};

// ── Person ───────────────────────────────────────────────────────────────────

export interface TMDBPerson {
	id: number;
	name: string;
	biography: string;
	birthday: string | null;
	deathday: string | null;
	place_of_birth: string | null;
	profile_path: string | null;
	known_for_department: string;
	also_known_as: string[];
	popularity: number;
	gender: number; // 0=unset 1=female 2=male 3=non-binary
	imdb_id: string | null;
	translations?: {
		translations: {
			iso_639_1: string;
			data: { biography: string };
		}[];
	};
}

export const getTMDBPerson = async (personId: number): Promise<TMDBPerson> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const res = await fetch(
		`${TMDB_BASE}/person/${personId}?api_key=${apiKey}&language=vi-VN&append_to_response=translations`,
	);
	if (!res.ok) throw new Error(`TMDB ${res.status}`);
	const data = (await res.json()) as TMDBPerson;
	if (!data.biography) {
		const translations = data.translations?.translations ?? [];
		const viBio = translations.find((t) => t.iso_639_1 === "vi")?.data
			.biography;
		const enBio = translations.find((t) => t.iso_639_1 === "en")?.data
			.biography;
		data.biography = viBio || enBio || "";
	}
	delete data.translations;
	return data;
};

export interface TMDBPersonCreditItem {
	id: number;
	title?: string;
	name?: string;
	character?: string;
	job?: string;
	poster_path: string | null;
	backdrop_path: string | null;
	release_date?: string;
	first_air_date?: string;
	vote_average: number;
	vote_count?: number;
	popularity?: number;
	order?: number;
}

export interface TMDBPersonCredits {
	cast: TMDBPersonCreditItem[];
	crew: TMDBPersonCreditItem[];
}

export const getTMDBPersonCredits = async (
	personId: number,
): Promise<{ movie: TMDBPersonCredits; tv: TMDBPersonCredits }> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const [movieRes, tvRes] = await Promise.all([
		fetch(`${TMDB_BASE}/person/${personId}/movie_credits?api_key=${apiKey}`),
		fetch(`${TMDB_BASE}/person/${personId}/tv_credits?api_key=${apiKey}`),
	]);
	if (!movieRes.ok || !tvRes.ok) throw new Error("TMDB person credits error");
	const [movie, tv] = await Promise.all([
		movieRes.json() as Promise<TMDBPersonCredits>,
		tvRes.json() as Promise<TMDBPersonCredits>,
	]);
	return { movie, tv };
};

// ── Certification / Age Rating ───────────────────────────────────────────────

interface TMDBMovieReleaseDateEntry {
	certification: string;
	release_date: string;
	type: number;
}

interface TMDBMovieReleaseDateCountry {
	iso_3166_1: string;
	release_dates: TMDBMovieReleaseDateEntry[];
}

interface TMDBMovieReleaseDatesResponse {
	results: TMDBMovieReleaseDateCountry[];
}

interface TMDBTVContentRating {
	iso_3166_1: string;
	rating: string;
}

interface TMDBTVContentRatingsResponse {
	results: TMDBTVContentRating[];
}

const PREFERRED_COUNTRIES = ["US", "GB", "AU", "CA"];

export const mapToVietnamRating = (cert: string): string => {
	switch (cert) {
		case "G":
		case "TV-G":
			return "P";
		case "PG":
		case "TV-PG":
			return "T13";
		case "PG-13":
		case "TV-14":
		case "14+":
			return "T13";
		case "R":
		case "15":
		case "MA 15+":
			return "T16";
		case "NC-17":
		case "18+":
		case "TV-MA":
		case "R18+":
			return "T18";
		default:
			return "";
	}
};

export const getTMDBCertification = async (
	tmdbId: string,
	type: "movie" | "tv",
): Promise<string> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;

	if (type === "movie") {
		const res = await fetch(
			`${TMDB_BASE}/movie/${tmdbId}/release_dates?api_key=${apiKey}`,
		);
		if (!res.ok) return "";
		const data = (await res.json()) as TMDBMovieReleaseDatesResponse;
		for (const country of PREFERRED_COUNTRIES) {
			const entry = data.results.find((r) => r.iso_3166_1 === country);
			if (entry) {
				const cert =
					entry.release_dates.find((d) => d.certification)?.certification ?? "";
				if (cert) return mapToVietnamRating(cert);
			}
		}
		// Fallback: first non-empty certification
		for (const country of data.results) {
			const cert =
				country.release_dates.find((d) => d.certification)?.certification ?? "";
			if (cert) return mapToVietnamRating(cert);
		}
		return "";
	} else {
		const res = await fetch(
			`${TMDB_BASE}/tv/${tmdbId}/content_ratings?api_key=${apiKey}`,
		);
		if (!res.ok) return "";
		const data = (await res.json()) as TMDBTVContentRatingsResponse;
		for (const country of PREFERRED_COUNTRIES) {
			const entry = data.results.find((r) => r.iso_3166_1 === country);
			if (entry?.rating) return mapToVietnamRating(entry.rating);
		}
		// Fallback: first non-empty rating
		const first = data.results.find((r) => r.rating);
		return first ? mapToVietnamRating(first.rating) : "";
	}
};

// ── Season episodes ──────────────────────────────────────────────────────────

export interface TMDBEpisode {
	episode_number: number;
	name: string;
	overview: string;
	still_path: string | null;
	air_date: string;
	runtime: number | null;
}

export interface TMDBSeasonResponse {
	season_number: number;
	name: string;
	episodes: TMDBEpisode[];
}

export const getTMDBSeason = async (
	tvId: string,
	seasonNumber: number,
): Promise<TMDBSeasonResponse> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const url = (lang: string) =>
		`${TMDB_BASE}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=${lang}`;

	const [viRes, enRes] = await Promise.all([
		fetch(url("vi-VN")),
		fetch(url("en-US")),
	]);
	if (!viRes.ok) throw new Error(`TMDB season ${viRes.status}`);

	const viData = (await viRes.json()) as TMDBSeasonResponse;
	const enData = enRes.ok ? ((await enRes.json()) as TMDBSeasonResponse) : null;

	if (enData) {
		const enByEp = new Map(enData.episodes.map((e) => [e.episode_number, e]));
		viData.episodes = viData.episodes.map((ep) => {
			const enEp = enByEp.get(ep.episode_number);
			// If VI name is just "Episode N" (no real translation), use EN name
			const isGenericName = /^Episode\s+\d+$/i.test(ep.name.trim());
			return {
				...ep,
				name: isGenericName ? enEp?.name || ep.name : ep.name,
				overview: ep.overview || enEp?.overview || "",
			};
		});
	}

	return viData;
};

export const tmdbStillUrl = (
	stillPath: string | null,
	size = "w300",
): string | null =>
	stillPath ? proxyImageUrl(`${TMDB_IMAGE_BASE}/${size}${stillPath}`) : null;

// ── Search by title + year ────────────────────────────────────────────────────

interface TMDBSearchResult {
	id: number;
	title?: string;
	name?: string;
	original_title?: string;
	original_name?: string;
	release_date?: string;
	first_air_date?: string;
}

interface TMDBSearchResponse {
	results: TMDBSearchResult[];
}

export const searchTMDBId = async (
	title: string,
	type: "movie" | "tv",
	year?: number | string | null,
	originName?: string | null,
): Promise<string | null> => {
	const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
	const yearParam = year ? `&year=${year}` : "";
	const res = await fetch(
		`${TMDB_BASE}/search/${type}?query=${encodeURIComponent(title)}&language=en-US${yearParam}&api_key=${apiKey}`,
	);
	if (!res.ok) throw new Error(`TMDB search ${res.status}`);
	const data = (await res.json()) as TMDBSearchResponse;
	const { results } = data;
	if (!results.length) return null;
	if (results.length === 1) return String(results[0].id);

	// Multiple results: find best match by original_title / original_name
	const needle = (originName || title).toLowerCase().trim();
	const exact = results.find((r) => {
		const orig = (r.original_title ?? r.original_name ?? "")
			.toLowerCase()
			.trim();
		return orig === needle;
	});
	return String((exact ?? results[0]).id);
};

// ── URL helpers ───────────────────────────────────────────────────────────────

const proxy = proxyImageUrl;

export const tmdbProfileUrl = (
	profilePath: string | null,
	size = "w185",
): string | null =>
	profilePath ? proxy(`${TMDB_IMAGE_BASE}/${size}${profilePath}`) : null;

export const tmdbPosterUrl = (
	posterPath: string | null,
	size = "w185",
): string | null =>
	posterPath ? proxy(`${TMDB_IMAGE_BASE}/${size}${posterPath}`) : null;

export const tmdbBackdropUrl = (
	backdropPath: string | null,
	size = "w780",
): string | null =>
	backdropPath ? proxy(`${TMDB_IMAGE_BASE}/${size}${backdropPath}`) : null;
