import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { router } from "@/app/router";
import MaintenancePage from "@/features/errors/maintenance-page";
import "./index.css";

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [apiReachable, setApiReachable] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Health check on mount + every 30s
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        setApiReachable(res.ok);
      } catch {
        setApiReachable(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!apiReachable) {
    return <MaintenancePage onRetry={() => setApiReachable(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "14px",
            borderRadius: "8px",
            padding: "12px 16px",
            fontWeight: 500,
          },
          success: {
            iconTheme: { primary: "#27AE60", secondary: "#fff" },
            style: { background: "#F0FDF4", color: "#065F46", border: "1px solid #BBF7D0" },
          },
          error: {
            iconTheme: { primary: "#EB5757", secondary: "#fff" },
            style: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" },
          },
        }}
      />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
