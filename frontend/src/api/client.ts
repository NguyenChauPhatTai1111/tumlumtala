import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_SKIP_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

let isRefreshing = false;
let waitQueue: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  waitQueue.forEach((resolve) => resolve(token));
  waitQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthPath = AUTH_SKIP_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status !== 401 || isAuthPath) {
      return Promise.reject(error);
    }

    // Nếu đang có refresh chạy, đưa request này vào queue chờ token mới
    if (isRefreshing) {
      return new Promise((resolve) => {
        waitQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const res = await apiClient.post("/auth/refresh");
      const newToken = res.data.data?.access_token;
      if (!newToken) throw new Error("no token");

      localStorage.setItem("access_token", newToken);
      onRefreshed(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      waitQueue = [];
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
