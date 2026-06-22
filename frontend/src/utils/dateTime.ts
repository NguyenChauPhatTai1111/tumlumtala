export const formatDateTime = (value?: string | null) => {
	if (!value) {
		return "--";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("vi-VN", {
		second: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
};

/**
 * Format date
 */
export const formatDate = (date: Date | string, format = "vi-VN"): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString(format);
};

/**
 * Format time
 */
export const formatTime = (date: Date | string, format = "vi-VN"): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleTimeString(format);
};

/**
 * Get time ago string (e.g., "2 hours ago")
 */
export const getTimeAgo = (date: Date | string): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

	const intervals: { [key: string]: number } = {
		year: 31536000,
		month: 2592000,
		week: 604800,
		day: 86400,
		hour: 3600,
		minute: 60,
	};

	for (const [key, value] of Object.entries(intervals)) {
		const interval = Math.floor(seconds / value);
		if (interval >= 1) {
			return `${interval} ${key}${interval > 1 ? "s" : ""} trước`;
		}
	}

	return "just now";
};

export const formatTimestamp = (value: string) => {
	const date = new Date(value);

	if (!Number.isFinite(date.getTime())) {
		return "";
	}

	const now = new Date();

	const isSameDay =
		now.getFullYear() === date.getFullYear() &&
		now.getMonth() === date.getMonth() &&
		now.getDate() === date.getDate();

	if (isSameDay) {
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		const intervals: { [key: string]: number } = {
			giờ: 3600,
			phút: 60,
		};

		for (const [key, value] of Object.entries(intervals)) {
			const interval = Math.floor(seconds / value);

			if (interval >= 1) {
				return `${interval} ${key} trước`;
			}
		}

		return "Vừa xong";
	}

	const yesterday = new Date(now);

	yesterday.setDate(now.getDate() - 1);

	const isYesterday =
		yesterday.getFullYear() === date.getFullYear() &&
		yesterday.getMonth() === date.getMonth() &&
		yesterday.getDate() === date.getDate();

	if (isYesterday) {
		return `Hôm qua ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	const startOfWeek = new Date(now);

	const dayOffset = (startOfWeek.getDay() + 6) % 7;

	startOfWeek.setHours(0, 0, 0, 0);

	startOfWeek.setDate(startOfWeek.getDate() - dayOffset);

	const endOfWeek = new Date(startOfWeek);

	endOfWeek.setDate(endOfWeek.getDate() + 7);

	if (date >= startOfWeek && date < endOfWeek) {
		return `${date.toLocaleDateString("vi-VN", {
			weekday: "short",
		})} ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	return `${date.toLocaleDateString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
	})} ${date.toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

export const formatTimestampRealtime = (
	value: string,
	nowTimestamp: number,
) => {
	const date = new Date(value);

	if (!Number.isFinite(date.getTime())) {
		return "";
	}

	const now = new Date(nowTimestamp);

	const isSameDay =
		now.getFullYear() === date.getFullYear() &&
		now.getMonth() === date.getMonth() &&
		now.getDate() === date.getDate();

	if (isSameDay) {
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		const intervals: { [key: string]: number } = {
			giờ: 3600,
			phút: 60,
		};

		for (const [key, value] of Object.entries(intervals)) {
			const interval = Math.floor(seconds / value);

			if (interval >= 1) {
				return `${interval} ${key} trước`;
			}
		}

		return "Vừa xong";
	}

	const yesterday = new Date(now);

	yesterday.setDate(now.getDate() - 1);

	const isYesterday =
		yesterday.getFullYear() === date.getFullYear() &&
		yesterday.getMonth() === date.getMonth() &&
		yesterday.getDate() === date.getDate();

	if (isYesterday) {
		return `Hôm qua ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	const startOfWeek = new Date(now);

	const dayOffset = (startOfWeek.getDay() + 6) % 7;

	startOfWeek.setHours(0, 0, 0, 0);

	startOfWeek.setDate(startOfWeek.getDate() - dayOffset);

	const endOfWeek = new Date(startOfWeek);

	endOfWeek.setDate(endOfWeek.getDate() + 7);

	if (date >= startOfWeek && date < endOfWeek) {
		return `${date.toLocaleDateString("vi-VN", {
			weekday: "short",
		})} ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	return `${date.toLocaleDateString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
	})} ${date.toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

export const formatTimestampV2 = (value: string) => {
	const date = new Date(value);

	if (!Number.isFinite(date.getTime())) {
		return "";
	}

	const now = new Date();

	const isSameDay =
		now.getFullYear() === date.getFullYear() &&
		now.getMonth() === date.getMonth() &&
		now.getDate() === date.getDate();

	if (isSameDay) {
		return `Hôm nay ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	const yesterday = new Date(now);

	yesterday.setDate(now.getDate() - 1);

	const isYesterday =
		yesterday.getFullYear() === date.getFullYear() &&
		yesterday.getMonth() === date.getMonth() &&
		yesterday.getDate() === date.getDate();

	if (isYesterday) {
		return `Hôm qua ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	const startOfWeek = new Date(now);

	const dayOffset = (startOfWeek.getDay() + 6) % 7;

	startOfWeek.setHours(0, 0, 0, 0);

	startOfWeek.setDate(startOfWeek.getDate() - dayOffset);

	const endOfWeek = new Date(startOfWeek);

	endOfWeek.setDate(endOfWeek.getDate() + 7);

	if (date >= startOfWeek && date < endOfWeek) {
		return `${date.toLocaleDateString("vi-VN", {
			weekday: "short",
		})} ${date.toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	return `${date.toLocaleDateString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
	})} ${date.toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

export const formatRelativeTime = (
	dateValue: string,
	nowMs = Date.now(),
): string => {
	const target = new Date(dateValue).getTime();
	if (!Number.isFinite(target)) {
		return "";
	}

	const diffMs = Math.max(0, nowMs - target);
	const minute = 60 * 1000;
	const hour = 60 * minute;
	const day = 24 * hour;

	if (diffMs < hour) {
		const minutes = Math.max(1, Math.floor(diffMs / minute));
		return `${minutes} phút`;
	}

	if (diffMs < day) {
		const hours = Math.max(1, Math.floor(diffMs / hour));
		return `${hours} giờ`;
	}

	const days = Math.max(1, Math.floor(diffMs / day));
	if (days < 7) {
		return `${days} ngày`;
	}

	if (days < 30) {
		return `${Math.floor(days / 7)} tuần`;
	}

	if (days < 365) {
		return `${Math.floor(days / 30)} tháng`;
	}

	return `${Math.floor(days / 365)} năm`;
};

export const formatRelativeTimeAgo = (
	dateValue?: string | null,
	nowMs = Date.now(),
): string => {
	if (!dateValue) {
		return "";
	}

	const relativeTime = formatRelativeTime(dateValue, nowMs);
	return relativeTime ? `${relativeTime} trước` : "";
};

export const formatDateV2 = (value: string) => {
	const date = new Date(value);

	if (!Number.isFinite(date.getTime())) {
		return "";
	}

	const now = new Date();

	const isSameDay =
		now.getFullYear() === date.getFullYear() &&
		now.getMonth() === date.getMonth() &&
		now.getDate() === date.getDate();

	if (isSameDay) {
		return "Hôm nay";
	}

	const yesterday = new Date(now);

	yesterday.setDate(now.getDate() - 1);

	const isYesterday =
		yesterday.getFullYear() === date.getFullYear() &&
		yesterday.getMonth() === date.getMonth() &&
		yesterday.getDate() === date.getDate();

	if (isYesterday) {
		return "Hôm qua";
	}

	return date.toLocaleDateString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};
