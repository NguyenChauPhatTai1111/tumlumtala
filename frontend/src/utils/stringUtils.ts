/**
 * String and data transformation utilities
 */

/**
 * Capitalize first letter of string
 */
export const capitalizeFirst = (str: string): string => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert a sentence/string to Title Case (capitalize first letter of each word)
 * Example: "update status" -> "Update Status"
 */
export const toTitleCase = (str: string): string => {
	if (!str) return "";

	return str
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => capitalizeFirst(word))
		.join(" ");
};

/**
 * Format permission action for display.
 * Example: "update.status" -> "Update status"
 */
export const formatPermissionAction = (action: string): string => {
	if (!action) return "";

	const normalized = action
		.replace(/[._-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

	return toTitleCase(normalized);
};

/**
 * Convert camelCase to Title Case
 */
export const camelToTitleCase = (str: string): string => {
	return str
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (s) => s.toUpperCase())
		.trim();
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str: string, length: number): string => {
	if (str.length <= length) return str;
	return `${str.substring(0, length)}...`;
};

/**
 * Format number with comma separator
 */
export const formatNumber = (num: number): string => {
	return num.toLocaleString("vi-VN");
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency = "USD"): string => {
	return new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency,
	}).format(amount);
};
