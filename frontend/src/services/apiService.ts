import { apiRequest } from "@api/authApi";

/**
 * API Prefix - Centralized to avoid hardcoding /api/v1/ in every endpoint
 */
export const API_PREFIX = "/api/v1";

/**
 * Generic API Service - Reduces boilerplate for common CRUD operations
 */
export const apiService = {
	/**
	 * GET request
	 */
	get: async <T>(endpoint: string): Promise<T> => {
		const response = await apiRequest(endpoint, { method: "GET" });
		return response.data;
	},

	/**
	 * POST request
	 */
	post: async <T>(endpoint: string, data: unknown): Promise<T> => {
		const response = await apiRequest(endpoint, { method: "POST", data });
		return response.data;
	},

	/**
	 * PUT request
	 */
	put: async <T>(endpoint: string, data: unknown): Promise<T> => {
		const response = await apiRequest(endpoint, { method: "PUT", data });
		return response.data;
	},

	/**
	 * PATCH request
	 */
	patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
		const response = await apiRequest(endpoint, { method: "PATCH", data });
		return response.data;
	},

	/**
	 * DELETE request
	 */
	delete: async <T>(endpoint: string): Promise<T> => {
		const response = await apiRequest(endpoint, { method: "DELETE" });
		return response.data;
	},

	/**
	 * Check if backend is available
	 */
	isAvailable: async (): Promise<boolean> => {
		try {
			await apiRequest(`${API_PREFIX}/health`, { method: "GET" });
			return true;
		} catch {
			return false;
		}
	},
};
