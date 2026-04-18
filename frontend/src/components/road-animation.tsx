// Animated two-wheelers riding across the bottom of the login page, passing by the Bigwing showroom
export function RoadAnimation() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[140px] overflow-hidden">
      <style>{`
        @keyframes rideFast {
          0% { transform: translateX(-200px) translateY(0); }
          100% { transform: translateX(calc(100vw + 200px)) translateY(0); }
        }
        @keyframes rideSlow {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
        @keyframes rideMedium {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
        @keyframes roadDash {
          0% { background-position: 0 0; }
          100% { background-position: 60px 0; }
        }
        @keyframes wobble {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes signGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(232, 121, 47, 0.4)); }
          50% { filter: drop-shadow(0 0 14px rgba(232, 121, 47, 0.7)); }
        }
        @keyframes streetLight {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Showroom — fixed on the left, half-hidden by the bottom edge */}
      <div className="absolute bottom-8 left-8 hidden sm:block" style={{ animation: "signGlow 3s ease-in-out infinite" }}>
        <Showroom />
      </div>

      {/* Street lamp on the right side */}
      <div className="absolute bottom-8 right-10 hidden md:block">
        <StreetLamp />
      </div>

      {/* Road with moving dashes */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-700 to-gray-600" />
      <div
        className="absolute bottom-4 left-0 right-0 h-[3px]"
        style={{
          backgroundImage: "linear-gradient(to right, #FACC15 50%, transparent 50%)",
          backgroundSize: "60px 3px",
          animation: "roadDash 1.5s linear infinite",
        }}
      />

      {/* Sports bike — fast */}
      <div
        className="absolute bottom-6"
        style={{ animation: "rideFast 9s linear infinite", animationDelay: "0s" }}
      >
        <SportsBike />
      </div>

      {/* Cruiser — slower */}
      <div
        className="absolute bottom-7"
        style={{ animation: "rideSlow 14s linear infinite", animationDelay: "3s" }}
      >
        <Cruiser />
      </div>

      {/* Scooter — medium */}
      <div
        className="absolute bottom-6"
        style={{ animation: "rideMedium 11s linear infinite", animationDelay: "6s" }}
      >
        <Scooter />
      </div>

      {/* Delivery bike */}
      <div
        className="absolute bottom-7"
        style={{ animation: "rideSlow 13s linear infinite", animationDelay: "9s" }}
      >
        <DeliveryBike />
      </div>
    </div>
  );
}

// Bigwing showroom — small flat SVG on the left side
function Showroom() {
  return (
    <svg width="200" height="110" viewBox="0 0 200 110" fill="none">
      {/* Ground shadow */}
      <ellipse cx="100" cy="105" rx="90" ry="4" fill="#000" opacity="0.15" />

      {/* Main building */}
      <rect x="10" y="35" width="180" height="70" fill="#FFFFFF" stroke="#D4D9E0" strokeWidth="1" />

      {/* Slanted roof */}
      <polygon points="0,38 100,5 200,38 190,38 100,12 10,38" fill="#1F3864" />

      {/* Honda-style red band under the roof */}
      <rect x="10" y="35" width="180" height="8" fill="#DC2626" />

      {/* Big glass storefront */}
      <rect x="24" y="48" width="152" height="50" fill="url(#glassGrad)" stroke="#93C5FD" strokeWidth="1" />

      {/* Window mullions */}
      <line x1="88" y1="48" x2="88" y2="98" stroke="#D4D9E0" strokeWidth="1" />
      <line x1="24" y1="73" x2="176" y2="73" stroke="#D4D9E0" strokeWidth="0.8" opacity="0.6" />

      {/* Showcase bike inside the storefront (silhouette) */}
      <g transform="translate(40, 68) scale(0.45)">
        <path d="M 10 28 L 25 20 L 42 20 L 58 28 Z" fill="#DC2626" />
        <circle cx="14" cy="32" r="7" fill="#1a1a2e" />
        <circle cx="56" cy="32" r="7" fill="#1a1a2e" />
        <path d="M 25 20 L 32 15 L 40 15 L 42 20 Z" fill="#991B1B" />
      </g>

      {/* Second showcase bike */}
      <g transform="translate(110, 68) scale(0.4)">
        <path d="M 10 28 L 25 20 L 42 20 L 58 28 Z" fill="#1F3864" />
        <circle cx="14" cy="32" r="7" fill="#1a1a2e" />
        <circle cx="56" cy="32" r="7" fill="#1a1a2e" />
      </g>

      {/* Entrance doors */}
      <rect x="92" y="75" width="16" height="23" fill="#374151" stroke="#1F2937" strokeWidth="0.5" />
      <line x1="100" y1="75" x2="100" y2="98" stroke="#9CA3AF" strokeWidth="0.5" />
      <circle cx="96" cy="87" r="0.8" fill="#FBBF24" />
      <circle cx="104" cy="87" r="0.8" fill="#FBBF24" />

      {/* BIGWING sign on the roof band */}
      <g>
        <rect x="60" y="19" width="80" height="14" rx="2" fill="#E8792F" />
        <text x="100" y="29" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="800" fill="white" letterSpacing="1">
          BIGWING
        </text>
      </g>

      {/* Honda wing logo (tiny) — stylized */}
      <g transform="translate(14, 37)">
        <circle cx="5" cy="5" r="4" fill="white" />
        <path d="M 2 5 L 5 2 L 8 5 L 5 7 Z" fill="#DC2626" />
      </g>

      {/* Small awning/canopy above door */}
      <polygon points="85,55 115,55 118,62 82,62" fill="#DC2626" opacity="0.9" />

      {/* Window lights */}
      <rect x="30" y="52" width="4" height="4" fill="#FEF3C7" style={{ animation: "streetLight 2s ease-in-out infinite" }} />
      <rect x="166" y="52" width="4" height="4" fill="#FEF3C7" style={{ animation: "streetLight 2.5s ease-in-out 0.5s infinite" }} />

      {/* Gradients */}
      <defs>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="50%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#EFF6FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Simple street lamp
function StreetLamp() {
  return (
    <svg width="40" height="110" viewBox="0 0 40 110" fill="none">
      {/* Pole */}
      <rect x="18" y="30" width="4" height="75" fill="#4B5563" />
      {/* Arm */}
      <rect x="8" y="30" width="24" height="3" fill="#4B5563" />
      {/* Lamp head */}
      <polygon points="6,28 34,28 30,22 10,22" fill="#374151" />
      {/* Light glow */}
      <circle cx="20" cy="28" r="18" fill="#FEF3C7" opacity="0.25" style={{ animation: "streetLight 3s ease-in-out infinite" }} />
      <ellipse cx="20" cy="28" rx="8" ry="4" fill="#FEF3C7" opacity="0.7" />
    </svg>
  );
}

function SportsBike() {
  return (
    <svg width="70" height="40" viewBox="0 0 70 40" fill="none" style={{ animation: "wobble 0.3s ease-in-out infinite" }}>
      {/* Rider */}
      <circle cx="36" cy="12" r="4" fill="#1F3864" />
      <rect x="31" y="15" width="12" height="10" rx="2" fill="#E8792F" transform="rotate(-10 37 20)" />
      {/* Bike body */}
      <path d="M 10 28 L 25 20 L 42 20 L 58 28 Z" fill="#2E75B6" />
      <path d="M 25 20 L 32 15 L 40 15 L 42 20 Z" fill="#245f96" />
      {/* Wheels */}
      <circle cx="14" cy="32" r="7" fill="#1a1a2e" />
      <circle cx="14" cy="32" r="3" fill="#6C757D" />
      <circle cx="56" cy="32" r="7" fill="#1a1a2e" />
      <circle cx="56" cy="32" r="3" fill="#6C757D" />
      {/* Speed lines */}
      <line x1="0" y1="20" x2="8" y2="20" stroke="#E8792F" strokeWidth="1.5" opacity="0.4" />
      <line x1="0" y1="24" x2="6" y2="24" stroke="#E8792F" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

function Cruiser() {
  return (
    <svg width="75" height="40" viewBox="0 0 75 40" fill="none" style={{ animation: "wobble 0.4s ease-in-out infinite" }}>
      {/* Rider */}
      <circle cx="38" cy="14" r="4" fill="#1F3864" />
      <rect x="32" y="16" width="14" height="12" rx="2" fill="#27AE60" />
      {/* Bike body — cruiser shape */}
      <path d="M 8 30 L 20 24 L 55 24 L 65 30 Z" fill="#1a1a2e" />
      <rect x="30" y="22" width="14" height="4" rx="2" fill="#E8792F" />
      {/* Wheels — larger */}
      <circle cx="14" cy="32" r="8" fill="#1a1a2e" />
      <circle cx="14" cy="32" r="4" fill="#6C757D" />
      <circle cx="60" cy="32" r="8" fill="#1a1a2e" />
      <circle cx="60" cy="32" r="4" fill="#6C757D" />
    </svg>
  );
}

function Scooter() {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" fill="none" style={{ animation: "wobble 0.5s ease-in-out infinite" }}>
      {/* Rider */}
      <circle cx="30" cy="14" r="4" fill="#1F3864" />
      <rect x="25" y="17" width="10" height="10" rx="2" fill="#D63384" />
      {/* Scooter body (curved) */}
      <path d="M 10 30 Q 20 20 30 24 L 45 24 Q 50 28 50 30 Z" fill="#E8792F" />
      <rect x="42" y="12" width="3" height="12" fill="#6C757D" />
      {/* Wheels */}
      <circle cx="14" cy="32" r="6" fill="#1a1a2e" />
      <circle cx="14" cy="32" r="2.5" fill="#9CA3AF" />
      <circle cx="48" cy="32" r="6" fill="#1a1a2e" />
      <circle cx="48" cy="32" r="2.5" fill="#9CA3AF" />
    </svg>
  );
}

function DeliveryBike() {
  return (
    <svg width="72" height="40" viewBox="0 0 72 40" fill="none" style={{ animation: "wobble 0.4s ease-in-out infinite" }}>
      {/* Delivery box */}
      <rect x="44" y="8" width="16" height="16" rx="2" fill="#EB5757" />
      <rect x="46" y="10" width="12" height="5" rx="1" fill="white" opacity="0.3" />
      {/* Rider */}
      <circle cx="30" cy="14" r="4" fill="#1F3864" />
      <rect x="25" y="16" width="10" height="12" rx="2" fill="#2E75B6" />
      {/* Bike body */}
      <path d="M 8 30 L 22 24 L 50 24 L 60 30 Z" fill="#9B59B6" />
      {/* Wheels */}
      <circle cx="14" cy="32" r="6" fill="#1a1a2e" />
      <circle cx="14" cy="32" r="2.5" fill="#9CA3AF" />
      <circle cx="54" cy="32" r="6" fill="#1a1a2e" />
      <circle cx="54" cy="32" r="2.5" fill="#9CA3AF" />
    </svg>
  );
}
