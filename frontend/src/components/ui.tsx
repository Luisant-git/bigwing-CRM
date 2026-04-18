import { useState, useEffect, type ReactNode } from "react";
import {
  Info, AlertTriangle, CheckCircle2, XCircle, X, ChevronRight,
  Home, AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Alert — line alert with icon
// ─────────────────────────────────────────────────────────────
type AlertType = "info" | "success" | "warning" | "error";

const ALERT_STYLES: Record<AlertType, { bg: string; border: string; text: string; Icon: any }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", Icon: Info },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", Icon: CheckCircle2 },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", Icon: AlertTriangle },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", Icon: XCircle },
};

export function Alert({
  type = "info",
  title,
  children,
  onDismiss,
}: {
  type?: AlertType;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  const style = ALERT_STYLES[type];
  return (
    <div className={`flex gap-3 rounded-lg border-l-4 ${style.border} ${style.bg} px-4 py-3 ${style.text}`}>
      <style.Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Badge — contextual, light bg variants
// ─────────────────────────────────────────────────────────────
type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "dark";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-cyan-100 text-cyan-700",
  dark: "bg-gray-700 text-white",
};

export function Badge({
  variant = "default",
  children,
  dot,
  className = "",
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_STYLES[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Breadcrumb — with icon support
// ─────────────────────────────────────────────────────────────
export function Breadcrumb({
  items,
}: {
  items: { label: string; to?: string; icon?: any }[];
}) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-gray-500">
      {items.map((item, i) => {
        const Icon = item.icon ?? (i === 0 ? Home : null);
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
            {item.to ? (
              <a href={item.to} className="flex items-center gap-1 hover:text-[#2E75B6]">
                {Icon && <Icon size={13} />}
                {item.label}
              </a>
            ) : (
              <span className="flex items-center gap-1 font-medium text-[#1F3864]">
                {Icon && <Icon size={13} />}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// Tooltip — simple hover tooltip
// ─────────────────────────────────────────────────────────────
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [show, setShow] = useState(false);
  const position = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={`absolute ${position} z-50 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg pointer-events-none`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Confirm Modal — flying modal for delete/inactive/import
// ─────────────────────────────────────────────────────────────
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const variantStyles = {
    danger: { icon: XCircle, iconBg: "bg-red-100", iconColor: "text-[#EB5757]", btn: "bg-[#EB5757] hover:bg-[#D43F3F]" },
    warning: { icon: AlertTriangle, iconBg: "bg-amber-100", iconColor: "text-[#F2994A]", btn: "bg-[#F2994A] hover:bg-[#E87818]" },
    info: { icon: AlertCircle, iconBg: "bg-blue-100", iconColor: "text-[#2E75B6]", btn: "bg-[#2E75B6] hover:bg-[#245f96]" },
  }[variant];

  const Icon = variantStyles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      {/* Fly-in animation */}
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        style={{ animation: "flyIn 0.25s ease-out" }}
      >
        <style>{`
          @keyframes flyIn {
            from { transform: translateY(-30px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>
        <div className="flex gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${variantStyles.iconBg}`}>
            <Icon size={24} className={variantStyles.iconColor} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#1F3864]">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${variantStyles.btn}`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Striped Progress Bar — animated for import
// ─────────────────────────────────────────────────────────────
export function StripedProgress({
  percent,
  label = "Processing, please wait...",
  color = "#2E75B6",
}: {
  percent: number;
  label?: string;
  color?: string;
}) {
  return (
    <div>
      <style>{`
        @keyframes stripes {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-bold" style={{ color }}>{percent}%</span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: color,
            backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
            backgroundSize: "40px 40px",
            animation: percent < 100 ? "stripes 1s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — gender-aware with initials fallback
// ─────────────────────────────────────────────────────────────
export function Avatar({
  name,
  gender,
  url,
  size = 36,
  className = "",
}: {
  name?: string;
  gender?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Gender-based avatar URL (DiceBear — no external deps, styled initials with gender palette)
  const genderColor =
    gender === "FEMALE" ? "#D63384" :
    gender === "MALE" ? "#2E75B6" :
    "#6C757D";

  const avatarSrc = !broken && url ? (url.startsWith("http") ? url : url) : null;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: genderColor,
        fontSize: Math.floor(size * 0.4),
      }}
      title={name}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name ?? ""}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
      {/* Subtle gender indicator dot */}
      {gender && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
          style={{
            backgroundColor:
              gender === "FEMALE" ? "#EC4899" :
              gender === "MALE" ? "#3B82F6" :
              "#9CA3AF",
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Timeline — for lead history modal
// ─────────────────────────────────────────────────────────────
export interface TimelineEvent {
  id: number | string;
  type: "created" | "stage" | "followup" | "quotation" | "booking" | "invoice" | "delivery" | "note";
  title: string;
  description?: string;
  time: string | Date;
  user?: string;
}

const TIMELINE_COLORS: Record<string, string> = {
  created: "#6C757D",
  stage: "#2E75B6",
  followup: "#9B59B6",
  quotation: "#F2994A",
  booking: "#E8792F",
  invoice: "#27AE60",
  delivery: "#1F3864",
  note: "#6C757D",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No timeline events yet</p>;
  }

  return (
    <ol className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-gray-200" />

      {events.map((event) => {
        const color = TIMELINE_COLORS[event.type] ?? "#6C757D";
        const time = typeof event.time === "string" ? new Date(event.time) : event.time;

        return (
          <li key={event.id} className="relative mb-5 pl-10 last:mb-0">
            {/* Dot */}
            <div
              className="absolute left-0 top-0.5 h-6 w-6 rounded-full ring-4 ring-white"
              style={{ backgroundColor: color }}
            />
            {/* Content */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[#1F3864]">{event.title}</p>
                <span className="shrink-0 text-[11px] text-gray-400">
                  {time.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {event.description && (
                <p className="mt-1 text-[12px] text-gray-600">{event.description}</p>
              )}
              {event.user && (
                <p className="mt-1 text-[11px] text-gray-400">by {event.user}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────
// Flying Modal — generic flying modal wrapper
// ─────────────────────────────────────────────────────────────
export function FlyingModal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} mx-4 rounded-xl bg-white shadow-2xl`}
        style={{ animation: "flyIn 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes flyIn {
            from { transform: translateY(-30px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-[#1F3864]">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
