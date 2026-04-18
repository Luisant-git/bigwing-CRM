import { useState, useEffect } from "react";
import { RefreshCw, Wifi, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

export default function MaintenancePage({ onRetry }: { onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const check = async () => {
    setRetrying(true);
    try {
      await api.get("/health").catch(() => fetch("/api/health"));
      onRetry();
    } catch {
      // still down
    } finally {
      setTimeout(() => setRetrying(false), 600);
    }
  };

  // Auto-retry every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/health")
        .then((r) => r.ok && onRetry())
        .catch(() => { });
    }, 15000);
    return () => clearInterval(interval);
  }, [onRetry]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1F3864] to-[#162B4D] px-4 text-center text-white font-sans">
      <style>{`
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="relative mb-8">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm" style={{ animation: "bounce 2s ease-in-out infinite" }}>
          <AlertTriangle size={48} className="text-[#E8792F]" />
        </div>
        <div className="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#EB5757] shadow-lg" style={{ animation: "spin-slow 3s linear infinite" }}>
          <Wifi size={20} className="text-white" />
        </div>
      </div>

      <h1 className="mb-2 text-4xl font-bold">We'll be back soon!</h1>
      <p className="mb-1 max-w-md text-lg text-white/70">
        Our servers are taking a quick break.
      </p>
      <p className="mb-8 max-w-md text-sm text-white/50">
        We're working to restore service. This page will refresh automatically once we're back online.
      </p>

      <button
        onClick={check}
        disabled={retrying}
        className="flex items-center gap-2 rounded-lg bg-[#E8792F] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#D06820] disabled:opacity-60"
      >
        <RefreshCw size={16} className={retrying ? "animate-spin" : ""} />
        {retrying ? "Checking..." : "Try Again"}
      </button>

      <p className="mt-10 text-[11px] text-white/30">Bigwing CRM — Honda Premium Dealership</p>
    </div>
  );
}
