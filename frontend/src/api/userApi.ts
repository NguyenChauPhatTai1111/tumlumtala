import { apiClient } from "./client";
import type { IUser, ListUsersResponse } from "@/types";

export interface CreateUserPayload {
  email: string;
  password: string;
  fullname: string;
  role?: string;
}

export interface UpdateUserPayload {
  email?: string;
  fullname?: string;
  role?: string;
}

export const createUser = async (data: CreateUserPayload): Promise<IUser> => {
  const res = await apiClient.post("/users", data);
  return res.data.data;
};

export const listUsers = async (limit = 10, offset = 0): Promise<ListUsersResponse> => {
  const res = await apiClient.get("/users", { params: { limit, offset } });
  return res.data.data;
};

export const getUser = async (uuid: string): Promise<IUser> => {
  const res = await apiClient.get(`/users/${uuid}`);
  return res.data.data;
};

export const updateUser = async (uuid: string, data: UpdateUserPayload): Promise<IUser> => {
  const res = await apiClient.put(`/users/${uuid}`, data);
  return res.data.data;
};

export const deleteUser = async (uuid: string): Promise<void> => {
  await apiClient.delete(`/users/${uuid}`);
};
