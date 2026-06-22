export interface OphimCategory {
	id: string;
	name: string;
	slug: string;
}

export interface OphimCountry {
	id: string;
	name: string;
	slug: string;
}

export interface OphimMovieItem {
	_id: string;
	name: string;
	slug: string;
	origin_name: string;
	type: "series" | "single" | "hoathinh" | "tvshows";
	thumb_url: string;
	poster_url: string;
	year: number;
	category: OphimCategory[];
	country: OphimCountry[];
	episode_current: string;
	episode_total: string;
	quality: string;
	lang: string;
	tmdb?: {
		type?: string;
		id?: string | null;
		season?: number;
		vote_average?: number;
		vote_count?: number;
	};
	imdb?: { id?: string | null };
	modified?: { time: string };
	watchProgress?: {
		position: number;
		duration?: number;
		completed?: boolean;
		episodeSlug?: string;
	};
	// rating được merge từ batch certification (không có trong API, inject ở frontend)
	rated?: string;
}

export interface OphimEpisodeData {
	name: string;
	slug: string;
	filename: string;
	link_embed: string;
	link_m3u8: string;
}

export interface OphimEpisodeServer {
	server_name: string;
	server_data: OphimEpisodeData[];
}

export interface OphimMovieDetail {
	_id: string;
	name: string;
	slug: string;
	origin_name: string;
	content: string;
	type: "series" | "single" | "hoathinh" | "tvshows";
	status: string;
	thumb_url: string;
	poster_url: string;
	year: number;
	actor: string[];
	director: string[];
	category: OphimCategory[];
	country: OphimCountry[];
	episode_current: string;
	episode_total: string;
	quality: string;
	lang: string;
	time: string;
	chieurap: boolean;
	trailer_url?: string;
	is_copyright?: boolean;
	tmdb?: {
		type: string;
		id: string | null;
		season: number;
		vote_average: number;
		vote_count: number;
	};
	imdb?: { id: string | null; vote_average?: number; vote_count?: number };
	rated?: string;
	episodes?: OphimEpisodeServer[];
}

// V1 API response wrappers (shared between Ophim/KKPhim v1 list endpoints)

export interface OphimV1Pagination {
	totalItems: number;
	totalItemsPerPage: number;
	currentPage: number;
	totalPages?: number;
	pageRanges?: number;
}

export interface OphimV1ListData {
	items: OphimMovieItem[];
	params?: {
		pagination?: OphimV1Pagination;
	};
	APP_DOMAIN_CDN_IMAGE?: string;
}

export interface OphimV1CatalogItem {
	_id: string;
	name: string;
	slug: string;
}

export interface OphimV1CatalogData {
	items: OphimV1CatalogItem[];
}

export interface OphimV1Response<T> {
	status: string | boolean;
	msg?: string;
	data: T;
}

export interface OphimListResponse {
	status: string;
	items: OphimMovieItem[];
	pagination: {
		totalItems: number;
		totalItemsPerPage: number;
		currentPage: number;
		totalPages: number;
	};
}

export interface OphimDetailResponse {
	status: string;
	movie: OphimMovieDetail;
	episodes: OphimEpisodeServer[];
}

// KKPhim (phimapi.com) specific response types

export interface KKPhimLatestResponse {
	status: boolean | string;
	items: OphimMovieItem[];
	pagination: {
		totalItems: number;
		totalItemsPerPage: number;
		currentPage: number;
		totalPages: number;
	};
}

export interface KKPhimDetailResponse {
	status: boolean | string;
	msg?: string;
	movie: OphimMovieDetail;
	episodes: OphimEpisodeServer[];
}

export type MovieType = "series" | "single" | "hoathinh" | "tvshows";

export type MovieTab = "home" | "search" | "liked" | "history";

export interface MovieListDef {
	slug: string;
	label: string;
}

export interface MovieListFilterState {
	listSlug: string;
	sortField: import("@/services/movieService").MovieSortField;
	sortType: import("@/services/movieService").MovieSortType;
	genreSlug: string | null;
	countrySlug: string | null;
	yearSlug: string | null;
}
