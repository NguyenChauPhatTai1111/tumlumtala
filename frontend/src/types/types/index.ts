export type UserGender = "male" | "female" | "other";

export interface IUser {
	id: number;
	uuid: string;
	fullname: string;
	email: string;
	age: number;
	gender?: UserGender;
	status: string;
	level: string;
	roles?: string[];
	permissions?: string[];
	balance?: number;
	created_at?: string;
	avatar?: string;
	name?: string;
	version?: number | string;
	idempotency_key?: string;
	IdempotencyKey?: string;
	idempotencyKey?: string;
}

export type {
	ChatContentFormat,
	ChatContext,
	ChatRequestType,
	ChatRole,
} from "./chat";
export * from "./messenger";
