import { Flame, Sun, Snowflake } from "lucide-react";

export type InterestLevel = "HOT" | "WARM" | "COLD" | string | null | undefined;

interface Props {
  level: InterestLevel;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function InterestBadge({ level, size = "md", showIcon = true }: Props) {
  if (!level) return <span className="text-gray-300">—</span>;

  const upper = String(level).toUpperCase();
  const config = {
    HOT: {
      Icon: Flame,
      text: "HOT",
      className:
        "bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]",
      anim: "animate-hot-pulse",
    },
    WARM: {
      Icon: Sun,
      text: "WARM",
      className:
        "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white",
      anim: "animate-warm-glow",
    },
    COLD: {
      Icon: Snowflake,
      text: "COLD",
      className: "bg-[#E5E7EB] text-[#6B7280]",
      anim: "animate-cold-fade",
    },
  }[upper as "HOT" | "WARM" | "COLD"];

  if (!config) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
        {level}
      </span>
    );
  }

  const sz =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-[11px] gap-1.5";

  const iconSize = size === "sm" ? 10 : 12;

  return (
    <>
      <InterestBadgeStyles />
      <span
        className={`inline-flex items-center rounded-full font-bold tracking-wide ${sz} ${config.className} ${config.anim}`}
      >
        {showIcon && <config.Icon size={iconSize} strokeWidth={2.5} />}
        {config.text}
      </span>
    </>
  );
}

// Global keyframes — injected once
function InterestBadgeStyles() {
  return (
    <style>{`
      /* HOT — subtle pulse with glowing shadow */
      @keyframes hotPulse {
        0%, 100% {
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.35), 0 0 14px rgba(249, 115, 22, 0.2);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.6), 0 0 22px rgba(249, 115, 22, 0.4);
          transform: scale(1.04);
        }
      }
      .animate-hot-pulse {
        animation: hotPulse 1.8s ease-in-out infinite;
      }

      /* WARM — soft glow pulse */
      @keyframes warmGlow {
        0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.2); }
        50% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
      }
      .animate-warm-glow {
        animation: warmGlow 3s ease-in-out infinite;
      }

      /* COLD — very slow gentle fade */
      @keyframes coldFade {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 1; }
      }
      .animate-cold-fade {
        animation: coldFade 4s ease-in-out infinite;
      }
    `}</style>
  );
}

// ─── Compact dot-only variant (for space-constrained places) ───
export function InterestDot({ level }: { level: InterestLevel }) {
  if (!level) return null;
  const upper = String(level).toUpperCase();
  const config = {
    HOT: "bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-hot-pulse",
    WARM: "bg-[#F59E0B] animate-warm-glow",
    COLD: "bg-gray-400 animate-cold-fade",
  }[upper as "HOT" | "WARM" | "COLD"];
  if (!config) return null;
  return (
    <>
      <InterestBadgeStyles />
      <span
        className={`inline-block h-2 w-2 rounded-full ${config}`}
        title={upper}
      />
    </>
  );
}
