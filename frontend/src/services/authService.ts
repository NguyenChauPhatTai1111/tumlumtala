import { apiRequest } from "@api/authApi";
import type { IUser } from "@/types";
import type {
	DevicesResponse,
	IDevice,
	LoginResponse,
	RegisterResponse,
} from "@/types/auth";
import { stripCdnUrl } from "@/utils/urlUtils";
import { API_PREFIX } from "./apiService";

export const login = async (
	email: string,
	password: string,
): Promise<LoginResponse> => {
	const response = await apiRequest(`${API_PREFIX}/auth/login`, {
		method: "POST",
		data: { email, password },
	});
	return response.data;
};

interface RegisterOptions {
	fullname?: string;
	age?: number;
	gender?: string;
	status?: string;
	level?: string;
}

export const register = async (
	email: string,
	password: string,
	options?: RegisterOptions,
): Promise<RegisterResponse> => {
	const response = await apiRequest(`${API_PREFIX}/user`, {
		method: "POST",
		data: { email, password, ...options },
	});

	return response;
};

export const getUserByUUID = async (uuid: string): Promise<IUser> => {
	const response = await apiRequest(`${API_PREFIX}/user/${uuid}`);
	return response.data;
};

export const getUserByEmail = async (email: string): Promise<IUser> => {
	const response = await apiRequest(`${API_PREFIX}/user/email`, {
		params: { email },
	});
	return response.data;
};

export const getUserProfile = async (): Promise<IUser> => {
	const response = await apiRequest(`${API_PREFIX}/user/profile`);
	return response.data;
};

export const updateMyAvatar = async (avatar: string | File): Promise<void> => {
	const data =
		avatar instanceof File
			? (() => {
					const formData = new FormData();
					formData.append("file", avatar, avatar.name);
					return formData;
				})()
			: { avatar: stripCdnUrl(avatar) ?? avatar };

	await apiRequest(`${API_PREFIX}/user/profile/avatar`, {
		method: "PATCH",
		data,
	});
};

export const getUsers = async (): Promise<IUser[]> => {
	const response = await apiRequest(`${API_PREFIX}/user/`);
	const payload = response.data as IUser[] | { data?: IUser[] };
	if (Array.isArray(payload)) {
		return payload;
	}

	return Array.isArray(payload?.data) ? payload.data : [];
};

export const apiCheckToken = async (token: string): Promise<boolean> => {
	try {
		await apiRequest(`${API_PREFIX}/auth/check`, {
			method: "POST",
			data: { token },
		});
		return true;
	} catch {
		return false;
	}
};

export const apiRefreshToken = async (
	refreshToken: string,
): Promise<string> => {
	const response = await apiRequest(`${API_PREFIX}/auth/refresh`, {
		method: "POST",
		data: { refresh_token: refreshToken },
	});
	return response.data.access_token;
};

export type TopUpType = "DEPOSIT" | "WITHDRAW";

interface TopUpOptions {
	tableId?: string | number;
	type?: TopUpType;
	version?: number | string;
	idempotencyKey?: string;
}

const toNonEmptyString = (value: unknown): string | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed !== "" ? trimmed : undefined;
};

export const apiTopUp = async (
	uuid: string,
	balance: number,
	options?: TopUpOptions,
): Promise<void> => {
	let resolvedVersion = options?.version;
	const resolvedIdempotencyKey = toNonEmptyString(options?.idempotencyKey);

	if (!resolvedIdempotencyKey) {
		throw new Error("Thiếu idempotency_key trong payload top-up.");
	}

	if (resolvedVersion == null) {
		const profile = await getUserProfile();
		resolvedVersion = resolvedVersion ?? profile.version;
	}

	const normalizedType: TopUpType =
		options?.type ?? (balance >= 0 ? "DEPOSIT" : "WITHDRAW");
	const normalizedAmount = Math.abs(balance);

	await apiRequest(`${API_PREFIX}/user/top-up/${uuid}`, {
		method: "POST",
		data: {
			balance: normalizedAmount,
			type: normalizedType,
			...(options?.tableId != null && options.tableId !== ""
				? { tableId: options.tableId }
				: {}),
			...(resolvedVersion != null ? { version: resolvedVersion } : {}),
			idempotency_key: resolvedIdempotencyKey,
		},
	});
};

interface UpdateUserStatusOptions {
	version?: number | string;
}

export const updateUserStatus = async (
	uuid: string,
	status: string,
	options?: UpdateUserStatusOptions,
): Promise<void> => {
	await apiRequest(`${API_PREFIX}/user/status/${uuid}`, {
		method: "PATCH",
		data: {
			status,
			...(options?.version != null ? { version: options.version } : {}),
		},
	});
};

export const changePassword = async (
	oldPassword: string,
	newPassword: string,
): Promise<void> => {
	await apiRequest(`${API_PREFIX}/auth/change-password`, {
		method: "PUT",
		data: { old_password: oldPassword, new_password: newPassword },
	});
};

export const getDevices = async (
	userId: number | string,
): Promise<IDevice[]> => {
	const payload = (await apiRequest(`${API_PREFIX}/auth/device/${userId}`)) as
		| DevicesResponse
		| IDevice[]
		| { data?: IDevice[] }
		| { devices?: IDevice[] };

	if (Array.isArray(payload)) {
		return payload;
	}

	const devices = Array.isArray((payload as { data?: IDevice[] }).data)
		? (payload as { data: IDevice[] }).data
		: Array.isArray((payload as DevicesResponse).data?.devices)
			? (payload as DevicesResponse).data?.devices
			: Array.isArray((payload as { devices?: IDevice[] }).devices)
				? (payload as { devices: IDevice[] }).devices
				: [];

	if (!Array.isArray(devices)) {
		return [];
	}

	return devices.map((device) => ({
		...device,
		browser:
			device.browser ??
			[device.browser_name, device.browser_version].filter(Boolean).join(" "),
		os:
			device.os ??
			[device.os_name, device.os_version].filter(Boolean).join(" "),
		ip_address: device.ip_address ?? device.ip,
		last_seen: device.last_seen ?? device.last_used_at,
		is_current: device.is_current ?? device.is_current_device,
		signed_in: device.signed_in ?? device.created_at,
	}));
};

export const revokeDevice = async (deviceId: string): Promise<void> => {
	await apiRequest(`${API_PREFIX}/auth/devices/revoke`, {
		method: "POST",
		data: {
			device_id: deviceId,
		},
	});
};

export const revokeAllDevices = async (
	currentDeviceId?: string,
): Promise<void> => {
	await apiRequest(`${API_PREFIX}/auth/devices/revoke-all`, {
		method: "POST",
		data: currentDeviceId ? { current_device_id: currentDeviceId } : {},
	});
};
