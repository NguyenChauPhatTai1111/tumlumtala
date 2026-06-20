export interface IUser {
  id: number;
  uuid: string;
  email: string;
  fullname: string;
  role: "administrator" | "manager" | "member";
  created_at: string;
  updated_at: string;
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
