export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	csrf_token: string;
	expires_in: number;
}

export interface RegisterResponse {
	status: "success" | "error";
	message?: string;
}

export interface IDevice {
	id: string;
	uuid?: string;
	user_id?: string | number;
	browser?: string;
	browser_name?: string;
	browser_version?: string;
	device_name?: string;
	os?: string;
	os_name?: string;
	os_version?: string;
	ip_address?: string;
	ip?: string;
	last_seen?: string;
	last_activity?: string;
	last_used_at?: string;
	created_at?: string;
	signed_in?: string;
	user_agent?: string;
	is_current?: boolean;
	is_current_device?: boolean;
}

export interface DevicesResponse {
	status?: string;
	message?: string;
	data?: {
		devices?: IDevice[];
		total?: number;
	};
}
