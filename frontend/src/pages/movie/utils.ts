import type {
	MovieLikedRow,
	MovieWatchHistoryRow,
} from "@/services/movieBackendService";
import { COUNTRY_FLAG_MAP } from "./constants";
import type { OphimMovieItem } from "./types";

export const stripHtml = (html: string): string =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/\s{2,}/g, " ")
		.trim();

export const getCountryFlag = (slug: string): string =>
	COUNTRY_FLAG_MAP[slug] ?? "🌐";

const COUNTRY_ISO_MAP: Record<string, string> = {
	"viet-nam": "vn",
	"han-quoc": "kr",
	"trung-quoc": "cn",
	my: "us",
	"au-my": "us",
	"nhat-ban": "jp",
	"thai-lan": "th",
	anh: "gb",
	phap: "fr",
	duc: "de",
	"hong-kong": "hk",
	"dai-loan": "tw",
	"an-do": "in",
	"tay-ban-nha": "es",
	y: "it",
	nga: "ru",
	canada: "ca",
	uc: "au",
	brazil: "br",
	mexico: "mx",
	indonesia: "id",
	philippines: "ph",
	malaysia: "my",
	singapore: "sg",
	"tho-nhi-ky": "tr",
	israel: "il",
	iran: "ir",
	"bo-dao-nha": "pt",
	"dan-mach": "dk",
	"thuy-dien": "se",
	"na-uy": "no",
	"ha-lan": "nl",
	bi: "be",
	"thuy-si": "ch",
	ao: "at",
	"ba-lan": "pl",
	ukraina: "ua",
	argentina: "ar",
	colombia: "co",
	chili: "cl",
	chile: "cl",
	ireland: "ie",
	"nam-phi": "za",
	"ai-cap": "eg",
	"a-rap-xe-ut": "sa",
	pakistan: "pk",
	campuchia: "kh",
	lao: "la",
	myanmar: "mm",
	"trieu-tien": "kp",
	"mong-co": "mn",
	"hy-lap": "gr",
	czech: "cz",
	hungary: "hu",
	romania: "ro",
	"phan-lan": "fi",
	nigeria: "ng",
	uae: "ae",
	"chau-phi": "un",
};

export const getCountryIsoCode = (slug: string): string | null =>
	/^[a-z]{2}$/i.test(slug.trim())
		? slug.trim().toLowerCase()
		: COUNTRY_ISO_MAP[slug] ?? null;

export const formatDuration = (time: string): string | null => {
	if (!time?.trim()) return null;
	const clean = time.trim().toLowerCase();
	const hoursMatch = clean.match(/(\d+)\s*gi[oờ]/i);
	const minsMatch = clean.match(/(\d+)\s*ph[uú]t/i);

	if (!hoursMatch && !minsMatch) {
		const numMatch = clean.match(/^(\d+)$/);
		if (numMatch) {
			const total = parseInt(numMatch[1], 10);
			const h = Math.floor(total / 60);
			const m = total % 60;
			if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
			if (h > 0) return `${h} giờ`;
			return `${m} phút`;
		}
		return time.trim() || null;
	}

	const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
	const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
	const totalMins = hours * 60 + mins;
	const h = Math.floor(totalMins / 60);
	const m = totalMins % 60;

	if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
	if (h > 0) return `${h} giờ`;
	if (m > 0) return `${m} phút`;
	return time.trim() || null;
};

export const formatEpisode = (raw: string): string => {
	if (!raw?.trim()) return "";
	const s = raw.trim();
	// Phim lẻ: chuỗi explicit "full" / "phim lẻ"
	if (/^(full|Full|phim\s*l[eẻ])$/i.test(s)) return s;
	// "Hoàn tất (X/Y)" — nếu tổng tập = 1 thì là phim lẻ, bỏ qua format
	const hoanTatMatch = s.match(/ho[àa]n\s*t[aấ]t\s*\((\d+)\/(\d+)\)/i);
	if (hoanTatMatch) {
		if (hoanTatMatch[2] === "1") return s;
		return `Tập ${hoanTatMatch[2]}`;
	}
	// "Tập X", "Tập Tập X" (API lặp chữ Tập), "Tap X" → "Tập X"
	// Dùng [ậâa] để xử lý ký tự U+1EAD (ậ) trong "Tập"
	const tapMatch = s.match(/^(?:t[ậâa]p\s+)*t[ậâa]p\s*(\d+)/i);
	if (tapMatch) return `Tập ${tapMatch[1]}`;
	// Số thuần → "X tập"
	const numMatch = s.match(/^(\d+)$/);
	if (numMatch) return `${numMatch[1]} tập`;
	return s;
};

const CONTENT_RATING_MAP: Record<string, string> = {
	// T13
	PG: "T13",
	"TV-PG": "T13",
	"14+": "T13",
	// T16
	"PG-13": "T16",
	"TV-14": "T16",
	"15": "T16",
	"MA15+": "T16",
	// T18
	R: "T18",
	"NC-17": "T18",
	"18+": "T18",
	"TV-MA": "T18",
};

export const mapContentRating = (rated?: string): string | null => {
	if (!rated?.trim()) return null;
	const v = rated.trim();
	if (/^(P|T13|T16|T18)$/i.test(v)) return v.toUpperCase();
	return CONTENT_RATING_MAP[v.toUpperCase()] ?? CONTENT_RATING_MAP[v] ?? null;
};

export const getTrailerEmbedUrl = (url: string): string => {
	if (!url) return "";
	const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
	if (ytMatch)
		return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&enablejsapi=1&playsinline=1&rel=0`;
	return url;
};

export const likedRowToItem = (row: MovieLikedRow): OphimMovieItem => ({
	_id: row.slug,
	name: row.name,
	slug: row.slug,
	origin_name: row.origin_name,
	type: row.type as OphimMovieItem["type"],
	thumb_url: row.thumbnail,
	poster_url: row.poster_url || row.thumbnail,
	year: row.year,
	category: [],
	country: [],
	episode_current: "",
	episode_total: "",
	quality: row.quality,
	lang: row.lang,
	rated: mapContentRating(row.rating) ?? undefined,
});

export const historyRowToItem = (
	row: MovieWatchHistoryRow,
): OphimMovieItem => ({
	_id: row.slug,
	name: row.name,
	slug: row.slug,
	origin_name: row.origin_name,
	type: row.type as OphimMovieItem["type"],
	thumb_url: row.thumbnail,
	poster_url: row.poster_url || row.thumbnail,
	year: row.year,
	category: [],
	country: [],
	episode_current: row.episode_name
		? /^(full|phim\s*l[eẻ])$/i.test(row.episode_name.trim())
			? row.episode_name.trim()
			: `Tập ${row.episode_name}`
		: "",
	episode_total: "",
	quality: row.quality,
	lang: row.lang,
	rated: mapContentRating(row.rating) ?? undefined,
	watchProgress:
		row.last_watched_position > 5
			? {
					position: row.last_watched_position,
					duration: row.duration || undefined,
					completed: row.completed,
					episodeSlug: row.episode_slug || undefined,
				}
			: undefined,
});
