export type { Conversation } from "./messenger";

export type UserGender = "male" | "female" | "other";

export interface IUser {
  id: number;
  uuid: string;
  email: string;
  fullname: string;
  name?: string;
  role: "administrator" | "manager" | "member";
  roles?: string[];
  permissions?: string[];
  created_at: string;
  updated_at: string;
  avatar?: string;
  balance?: number;
  age?: number;
  gender?: UserGender;
  status?: "active" | "inactive";
  level?: string;
  version?: number | string;
  idempotency_key?: string;
  idempotencyKey?: string;
  IdempotencyKey?: string;
}

export interface TokenPair {
  access_token: string;
}

export interface ListUsersResponse {
  users: IUser[];
  total: number;
  limit: number;
  offset: number;
}
