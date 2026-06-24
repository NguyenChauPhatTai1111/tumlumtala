import { apiClient } from "./client";
import type { TokenPair } from "@/types";
import type { Method } from "axios";

interface ApiRequestOptions {
  method?: Method;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  suppressNotify?: boolean;
}

export const apiRequest = async (
  endpoint: string,
  options: ApiRequestOptions = {},
) => {
  const { method = "GET", data, params, headers } = options;
  const response = await apiClient.request({
    url: endpoint,
    method,
    data,
    params,
    headers,
  });
  return response.data;
};

export const login = async (email: string, password: string): Promise<TokenPair> => {
  const res = await apiClient.post("/auth/login", { email, password });
  return res.data.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

export const getMe = async () => {
  const res = await apiClient.get("/me");
  return res.data.data;
};
