import { apiClient } from "./client";
import type { TokenPair } from "@/types";
export { apiRequest } from "./movieApiClient";

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
