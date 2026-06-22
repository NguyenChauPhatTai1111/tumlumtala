/**
 * Object and data structure utilities
 */

/**
 * Object and data structure utilities
 */

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
	if (obj === null || typeof obj !== "object") return obj;

	if (Array.isArray(obj)) {
		return obj.map((item) => deepClone(item)) as unknown as T;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as unknown as T;
	}

	if (obj instanceof Object) {
		const cloned = {} as T;
		for (const key in obj) {
			if (Object.hasOwn(obj, key)) {
				cloned[key as keyof T] = deepClone(
					(obj as Record<string, unknown>)[key],
				) as T[keyof T];
			}
		}
		return cloned;
	}

	return obj;
};

/**
 * Merge objects (shallow)
 */
export const mergeObjects = <T>(...objects: Partial<T>[]): T => {
	return Object.assign({}, ...objects) as T;
};

/**
 * Omit properties from object
 */
export const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
	const result = { ...obj };
	keys.forEach((key) => {
		delete result[key];
	});
	return result as Omit<T, K>;
};

/**
 * Pick properties from object
 */
export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
	const result = {} as Pick<T, K>;
	keys.forEach((key) => {
		result[key] = obj[key];
	});
	return result;
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: unknown): boolean => {
	return Object.keys(obj as Record<string, unknown>).length === 0;
};

/**
 * Invert object keys and values
 */
export const invertObject = <T extends Record<string, unknown>>(
	obj: T,
): Record<string, string> => {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		result[String(value)] = key;
	}
	return result;
};

/**
 * Filter object by predicate
 */
export const filterObject = <T extends Record<string, unknown>>(
	obj: T,
	predicate: (key: string, value: unknown) => boolean,
): Partial<T> => {
	const result = {} as Partial<T>;
	for (const [key, value] of Object.entries(obj)) {
		if (predicate(key, value)) {
			result[key as keyof T] = value as T[keyof T];
		}
	}
	return result;
};

/**
 * Map object values
 */
export const mapObjectValues = <T extends Record<string, unknown>, R>(
	obj: T,
	fn: (value: unknown, key: string) => R,
): Record<string, R> => {
	const result: Record<string, R> = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = fn(value, key);
	}
	return result;
};
