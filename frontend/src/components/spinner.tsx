export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-[3px] border-gray-200" />
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-[#2E75B6]" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-400">{message}</p>
    </div>
  );
}

export function FullScreenLoader({ message = "Please wait..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-full border-[3px] border-gray-200" />
        <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-[3px] border-transparent border-t-[#2E75B6]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#E8792F] text-[10px] font-bold text-white">
            BW
          </div>
        </div>
      </div>
      <p className="text-sm font-medium text-[#1F3864]">{message}</p>
    </div>
  );
}
