import { apiClient } from "@api/client";
import type { ITheme } from "@/types/theme";
import { apiService } from "./apiService";

const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown } = {}) => {
	const response = await apiClient.request({ url: endpoint, method: options.method ?? "GET", data: options.data });
	return response.data;
};

type ThemeListResponse =
	| ITheme[]
	| {
			data?: ITheme[] | { data?: ITheme[] };
	  };

export const getActiveThemes = async (): Promise<ITheme[]> => {
	const response = await apiService.get<ThemeListResponse>(
		"/theme?limit=1000&status=active",
	);
	if (Array.isArray(response)) {
		return response;
	}
	if (Array.isArray(response.data)) {
		return response.data;
	}
	if (
		response.data &&
		typeof response.data === "object" &&
		Array.isArray(response.data.data)
	) {
		return response.data.data;
	}
	return [];
};

export const updateThemeStatus = async (
	id: number,
	status: "active" | "inactive",
): Promise<void> => {
	await apiRequest(`/theme/status/${id}`, {
		method: "PATCH",
		data: { status },
	});
};
