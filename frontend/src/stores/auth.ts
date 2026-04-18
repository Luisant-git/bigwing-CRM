import { create } from "zustand";
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({ user: null, isAuthenticated: false });
    }
  },

  hydrate: () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          set({
            user: {
              id: payload.userId,
              email: payload.email,
              fullName: "",
              roles: payload.roles,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        // Invalid token
      }
    }
    set({ isLoading: false });
  },
}));
