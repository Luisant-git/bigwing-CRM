import { useQuery } from "@tanstack/react-query";
import api from "./api";

export function useLookup(name: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ["lookups", name, params],
    queryFn: () =>
      api.get(`/lookups/${name}`, { params }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users?pageSize=200").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Badge colors aligned with Bigwing UX designs
export const STAGE_COLORS: Record<string, string> = {
  NOT_CONTACTED: "bg-[#F1F3F5] text-[#6C757D]",
  CONTACTED: "bg-[#DBEAFE] text-[#1D4ED8]",
  NOT_REACHABLE: "bg-[#FFE8CC] text-[#D97706]",
  TEST_RIDE_SCHEDULED: "bg-[#EDE9FE] text-[#7C3AED]",
  TEST_RIDE_COMPLETED: "bg-[#E0E7FF] text-[#4F46E5]",
  QUOTATION_SHARED: "bg-[#FEF3C7] text-[#B45309]",
  BOOKED: "bg-[#FFEDD5] text-[#C2410C]",
  INVOICED: "bg-[#D1FAE5] text-[#047857]",
  DELIVERED_CLOSED: "bg-[#1F3864] text-white",
  LOST: "bg-[#FEE2E2] text-[#DC2626]",
};

export const INTEREST_COLORS: Record<string, string> = {
  HOT: "bg-[#FEE2E2] text-[#DC2626]",
  WARM: "bg-[#FEF3C7] text-[#D97706]",
  COLD: "bg-[#F1F3F5] text-[#6B7280]",
};


