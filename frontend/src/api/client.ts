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
let waitQueue: Array<(token: string | null) => void> = [];

function drainQueue(token: string | null) {
  waitQueue.forEach((resolve) => resolve(token));
  waitQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Không retry nếu đã retry rồi, hoặc không phải 401, hoặc là auth path
    if (
      original?._retry ||
      error.response?.status !== 401 ||
      AUTH_SKIP_PATHS.some((p) => original?.url?.includes(p))
    ) {
      return Promise.reject(error);
    }

    // Đánh dấu đã retry để tránh loop
    original._retry = true;

    if (isRefreshing) {
      // Chờ refresh đang chạy xong rồi dùng token mới
      return new Promise((resolve, reject) => {
        waitQueue.push((token) => {
          if (!token) return reject(error);
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
      apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      drainQueue(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      drainQueue(null);
      localStorage.removeItem("access_token");
      delete apiClient.defaults.headers.common.Authorization;
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
