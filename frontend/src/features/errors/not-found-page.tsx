import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-[#1F3864]">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 flex items-center gap-2 rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245f96]"
      >
        <Home size={16} /> Back to Dashboard
      </Link>
    </div>
  );
}
