import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BrandState {
  brand: "bigwing" | "redwing";
  setBrand: (brand: "bigwing" | "redwing") => void;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      brand: "bigwing",
      setBrand: (brand) => set({ brand }),
    }),
    {
      name: "crm-brand-storage",
    }
  )
);
