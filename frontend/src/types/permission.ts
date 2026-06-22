export interface IPermission {
	id: number;
	uuid: string;
	name: string;
	description: string;
	resource: string;
	action: string;
	status: number;
}

export interface IRole {
	id: number;
	uuid: string;
	name: string;
	description: string;
	status: number;
	permissions: number[];
	created_at: string;
	updated_at: string;
}

export interface IRoleWithPermissions {
	id: number;
	uuid: string;
	name: string;
	description: string;
	status: number;
	permissions: IPermission[];
	created_at: string;
	updated_at: string;
}
