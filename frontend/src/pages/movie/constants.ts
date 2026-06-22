export type { MovieListDef, MovieListFilterState } from "@pages/movie/types";

export const MOVIE_TYPE_LABELS: Record<string, string> = {
	series: "Phim bộ",
	single: "Phim lẻ",
	hoathinh: "Hoạt hình",
	tvshows: "TV Shows",
};

export const MOVIE_STATUS_LABEL: Record<string, string> = {
	ongoing: "Đang cập nhật",
	completed: "Hoàn thành",
	trailer: "Trailer",
};

export const COUNTRY_FLAG_MAP: Record<string, string> = {
	"viet-nam": "🇻🇳",
	"han-quoc": "🇰🇷",
	"trung-quoc": "🇨🇳",
	my: "🇺🇸",
	"au-my": "🇺🇸",
	"nhat-ban": "🇯🇵",
	"thai-lan": "🇹🇭",
	anh: "🇬🇧",
	phap: "🇫🇷",
	duc: "🇩🇪",
	"hong-kong": "🇭🇰",
	"dai-loan": "🇹🇼",
	"an-do": "🇮🇳",
	"tay-ban-nha": "🇪🇸",
	y: "🇮🇹",
	nga: "🇷🇺",
	canada: "🇨🇦",
	uc: "🇦🇺",
	brazil: "🇧🇷",
	mexico: "🇲🇽",
	indonesia: "🇮🇩",
	philippines: "🇵🇭",
	malaysia: "🇲🇾",
	singapore: "🇸🇬",
	"tho-nhi-ky": "🇹🇷",
	israel: "🇮🇱",
	iran: "🇮🇷",
	"bo-dao-nha": "🇵🇹",
	"dan-mach": "🇩🇰",
	"thuy-dien": "🇸🇪",
	"na-uy": "🇳🇴",
	"ha-lan": "🇳🇱",
	bi: "🇧🇪",
	"thuy-si": "🇨🇭",
	ao: "🇦🇹",
	"ba-lan": "🇵🇱",
	ukraina: "🇺🇦",
	argentina: "🇦🇷",
	colombia: "🇨🇴",
	chili: "🇨🇱",
	"nam-phi": "🇿🇦",
	"ai-cap": "🇪🇬",
	"a-rap-xe-ut": "🇸🇦",
	pakistan: "🇵🇰",
	campuchia: "🇰🇭",
	lao: "🇱🇦",
	myanmar: "🇲🇲",
	"trieu-tien": "🇰🇵",
	"mong-co": "🇲🇳",
	"hy-lap": "🇬🇷",
	czech: "🇨🇿",
	hungary: "🇭🇺",
	romania: "🇷🇴",
	"phan-lan": "🇫🇮",
};

export const MOVIE_GRID_TEMPLATE_COLUMNS_THUMB = {
	xs: "repeat(3, minmax(0, 1fr))",
	sm: "repeat(4, minmax(0, 1fr))",
	md: "repeat(5, minmax(0, 1fr))",
	lg: "repeat(7, minmax(0, 1fr))",
	xl: "repeat(9, minmax(0, 1fr))",
};

export const MOVIE_GRID_TEMPLATE_COLUMNS_POSTER = {
	xs: "repeat(2, minmax(0, 1fr))",
	sm: "repeat(3, minmax(0, 1fr))",
	md: "repeat(4, minmax(0, 1fr))",
	lg: "repeat(5, minmax(0, 1fr))",
	xl: "repeat(6, minmax(0, 1fr))",
};

export const MOVIE_PAGE_SIZE = 48;
export const MOVIE_LOAD_MORE_TRIGGER_INDEX = 32;
export const INFINITE_SCROLL_MAX_PAGES = 2;
export const HOME_INFINITE_SCROLL_MAX_PAGES = 4;

export const MOVIE_LISTS: import("@pages/movie/types").MovieListDef[] = [
	{ slug: "phim-moi", label: "Phim Mới" },
	{ slug: "phim-bo", label: "Phim Bộ" },
	{ slug: "phim-le", label: "Phim Lẻ" },
	{ slug: "tv-shows", label: "TV Show" },
	{ slug: "hoat-hinh", label: "Hoạt Hình" },
	{ slug: "phim-vietsub", label: "Vietsub" },
	{ slug: "phim-thuyet-minh", label: "Thuyết Minh" },
	{ slug: "phim-long-tieng", label: "Lồng Tiếng" },
	{ slug: "phim-bo-dang-chieu", label: "Đang Chiếu" },
	{ slug: "phim-bo-hoan-thanh", label: "Hoàn Thành" },
	{ slug: "phim-sap-chieu", label: "Sắp Chiếu" },
	{ slug: "phim-chieu-rap", label: "Chiếu Rạp" },
];

export const MOVIE_SORT_OPTIONS = [
	{ value: "modified.time" as const, label: "Mới nhất" },
	{ value: "_id" as const, label: "Mới đăng" },
	{ value: "year" as const, label: "Năm sản xuất" },
] satisfies {
	value: import("@/services/movieService").MovieSortField;
	label: string;
}[];

export const DEFAULT_LIST_SLUG = "phim-moi";

export const DEFAULT_FILTER_STATE: import("@pages/movie/types").MovieListFilterState =
	{
		listSlug: DEFAULT_LIST_SLUG,
		sortField: "modified.time",
		sortType: "desc",
		genreSlug: null,
		countrySlug: null,
		yearSlug: null,
	};
