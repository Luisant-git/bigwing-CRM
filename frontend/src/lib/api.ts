import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://147.79.67.93:3005/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach access token and brand to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const brandStore = localStorage.getItem("crm-brand-storage");
  const brand = brandStore ? JSON.parse(brandStore).state?.brand : "bigwing";
  config.headers["X-Brand"] = (brand || "bigwing").toUpperCase();
  
  return config;
});

// Handle 401 — attempt token refresh once, then force logout
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = refreshAccessToken();
        }
        const newToken = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshing = null;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");
  const baseURL = import.meta.env.VITE_API_URL || "http://147.79.67.93:3005/api/v1";
  const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefresh } = data.data;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", newRefresh);
  return accessToken;
}

export default api;
