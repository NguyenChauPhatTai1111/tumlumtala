import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type Method,
} from "axios";

const MOVIES_BASE_URL =
  import.meta.env.VITE_MOVIES_SERVICE_URL ?? "http://localhost:25055";

const movieApi = axios.create({
  baseURL: MOVIES_BASE_URL,
  withCredentials: true,
});

movieApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

const forceLogout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

movieApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const isTokenError =
      error.response?.status === 401 &&
      !original?._retry &&
      !original?.url?.includes("/auth/");

    if (isTokenError) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(movieApi(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const gatewayUrl =
        import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8888/api/v1";

      try {
        const res = await axios.post(`${gatewayUrl}/auth/refresh`, null, {
          withCredentials: true,
        });
        const newToken = res.data?.data?.access_token;
        if (newToken) {
          localStorage.setItem("access_token", newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return movieApi(original);
        }
        throw new Error("No token in refresh response");
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

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
  try {
    const response = await movieApi.request({
      url: endpoint,
      method,
      data,
      params,
      headers,
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) throw err;
    throw new Error((err as Error).message ?? "Unknown error");
  }
};
