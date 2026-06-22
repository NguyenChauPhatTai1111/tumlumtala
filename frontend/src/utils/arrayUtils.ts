/**
 * Array and collection utilities
 */

/**
 * Chunk array into smaller arrays
 */
export const chunkArray = <T>(arr: T[], size: number): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
};

/**
 * Flatten nested array
 */
export const flattenArray = <T>(arr: unknown[]): T[] => {
	return arr.reduce((acc: T[], val) => {
		return Array.isArray(val)
			? acc.concat(flattenArray(val))
			: acc.concat(val as T);
	}, []);
};

/**
 * Remove duplicates from array
 */
export const removeDuplicates = <T>(arr: T[]): T[] => {
	return [...new Set(arr)];
};

/**
 * Remove duplicates by property
 */
export const removeDuplicatesByProperty = <T>(
	arr: T[],
	property: keyof T,
): T[] => {
	const seen = new Set();
	return arr.filter((item) => {
		const value = item[property];
		if (seen.has(value)) {
			return false;
		}
		seen.add(value);
		return true;
	});
};

/**
 * Group array by property
 */
export const groupByProperty = <T>(
	arr: T[],
	property: keyof T,
): Record<string, T[]> => {
	return arr.reduce(
		(acc, item) => {
			const key = String(item[property]);
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(item);
			return acc;
		},
		{} as Record<string, T[]>,
	);
};

/**
 * Sort array by property
 */
export const sortByProperty = <T>(
	arr: T[],
	property: keyof T,
	order: "asc" | "desc" = "asc",
): T[] => {
	return [...arr].sort((a, b) => {
		const valueA = a[property];
		const valueB = b[property];

		if (valueA < valueB) return order === "asc" ? -1 : 1;
		if (valueA > valueB) return order === "asc" ? 1 : -1;
		return 0;
	});
};

/**
 * Find differences between two arrays
 */
export const arrayDifference = <T>(arr1: T[], arr2: T[]): T[] => {
	return arr1.filter((item) => !arr2.includes(item));
};

/**
 * Find common elements between two arrays
 */
export const arrayIntersection = <T>(arr1: T[], arr2: T[]): T[] => {
	return arr1.filter((item) => arr2.includes(item));
};

/**
 * Merge arrays and remove duplicates
 */
export const mergeArrays = <T>(...arrays: T[][]): T[] => {
	return removeDuplicates(arrays.flat());
};
