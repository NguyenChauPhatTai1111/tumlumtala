/**
 * Validation utility functions
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
	const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
	return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

/**
 * Validate phone number (basic)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
	const phoneRegex = /^\+?1?\d{9,15}$/;
	return phoneRegex.test(phone.replace(/\D/g, ""));
};

/**
 * Check if string is numeric
 */
export const isNumeric = (str: string): boolean => {
	return !Number.isNaN(Number(str)) && !Number.isNaN(parseFloat(str));
};

/**
 * Check if string is alphanumeric
 */
export const isAlphanumeric = (str: string): boolean => {
	return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Validate password strength
 */
export const getPasswordStrength = (
	password: string,
): "weak" | "medium" | "strong" => {
	let strength = 0;

	if (password.length >= 6) strength++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
	if (/\d/.test(password)) strength++;
	if (/[^a-zA-Z0-9]/.test(password)) strength++;

	if (strength <= 1) return "weak";
	if (strength === 2) return "medium";
	return "strong";
};

/**
 * Validate required fields
 */
export const areRequiredFieldsFilled = (
	data: Record<string, unknown>,
	requiredFields: string[],
): boolean => {
	return requiredFields.every((field) => {
		const value = data[field];

		return value !== undefined && value !== null && value !== "";
	});
};
