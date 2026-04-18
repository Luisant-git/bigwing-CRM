import { useEffect, useState } from "react";

// 3-second post-login animation
// 0.0 - 1.0s: Bike appears, wheels spin up, ignition smoke
// 1.0 - 2.0s: Bike at full speed, speed lines flying, road rushing
// 2.0 - 3.0s: Bike slows, logo fades in, screen fades out

export default function PostLoginLoader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"start" | "middle" | "end" | "fadeout">("start");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("middle"), 1000);
    const t2 = setTimeout(() => setPhase("end"), 2000);
    const t3 = setTimeout(() => setPhase("fadeout"), 2800);
    const t4 = setTimeout(onComplete, 3000);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${phase === "fadeout" ? "opacity-0" : "opacity-100"}`}
      style={{
        background: "linear-gradient(135deg, #1F3864 0%, #162B4D 50%, #0F1E38 100%)",
      }}
    >
      <style>{`
        /* Wheel spin — very fast during middle, slows at end */
        @keyframes wheelSpinFast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wheelSpinStart {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(720deg); }
        }

        /* Bike slide in from left, settle middle, bounce in end */
        @keyframes bikeEnter {
          0% { transform: translate(-150vw, 0) scale(0.8); opacity: 0; }
          60% { transform: translate(0, 0) scale(1.05); opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes bikeVibrate {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(1px, -2px); }
        }
        @keyframes bikeSettle {
          from { transform: translate(0, 0); }
          to { transform: translate(0, 0); }
        }

        /* Speed lines — appear during middle phase */
        @keyframes speedLine {
          0% { transform: translateX(200%); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateX(-800%); opacity: 0; }
        }

        /* Road dashes flying past */
        @keyframes roadFly {
          from { background-position: 0 0; }
          to { background-position: -800px 0; }
        }
        @keyframes roadFlyFast {
          from { background-position: 0 0; }
          to { background-position: -2400px 0; }
        }

        /* Smoke puff from exhaust */
        @keyframes smokePuff {
          0% { transform: scale(0.3) translateX(0); opacity: 0; }
          30% { opacity: 0.8; }
          100% { transform: scale(2.5) translateX(-30px); opacity: 0; }
        }

        /* Logo reveal at end */
        @keyframes logoReveal {
          0% { transform: translateY(20px) scale(0.7); opacity: 0; }
          60% { transform: translateY(0) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        /* Progress bar — fills 0 to 100 over 3s */
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Headlight pulse */
        @keyframes headlightPulse {
          0%, 100% { opacity: 0.7; filter: blur(0); }
          50% { opacity: 1; filter: blur(1px); }
        }

        /* Background particles */
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
      `}</style>

      {/* Background glow particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-[#E8792F]/30"
            style={{
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
              animation: `float ${3 + (i % 3)}s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Headlight glow behind bike (middle phase) */}
      {phase === "middle" && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-80 -translate-x-[70%] -translate-y-[55%] rounded-full bg-[#FFF5D6]/30 blur-3xl"
          style={{ animation: "headlightPulse 0.6s ease-in-out infinite" }}
        />
      )}

      {/* Main bike scene */}
      <div className="relative flex flex-col items-center">
        {/* Speed lines — during middle phase */}
        {phase === "middle" && (
          <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[600px]">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#E8792F] to-transparent"
                style={{
                  top: `${-60 + i * 12}px`,
                  right: 0,
                  width: `${80 + (i % 3) * 50}px`,
                  animation: `speedLine 0.6s linear ${i * 0.05}s infinite`,
                }}
              />
            ))}
            {[...Array(8)].map((_, i) => (
              <div
                key={`w${i}`}
                className="absolute h-[2px] rounded-full bg-gradient-to-r from-transparent via-white to-transparent"
                style={{
                  top: `${-50 + i * 14}px`,
                  right: 0,
                  width: `${120 + (i % 2) * 40}px`,
                  opacity: 0.6,
                  animation: `speedLine 0.5s linear ${0.1 + i * 0.08}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Bike SVG */}
        <div
          className="relative"
          style={{
            animation:
              phase === "start" ? "bikeEnter 0.9s cubic-bezier(0.2, 0.9, 0.3, 1) forwards" :
              phase === "middle" ? "bikeVibrate 0.1s linear infinite" :
              "bikeSettle 0.5s ease-out forwards",
          }}
        >
          <SportsRider phase={phase} />

          {/* Exhaust smoke */}
          {(phase === "start" || phase === "middle") && (
            <>
              <div
                className="absolute left-[10px] top-[155px] h-6 w-6 rounded-full bg-gray-400/50 blur-sm"
                style={{ animation: "smokePuff 0.8s ease-out infinite" }}
              />
              <div
                className="absolute left-[5px] top-[160px] h-8 w-8 rounded-full bg-gray-300/40 blur-md"
                style={{ animation: "smokePuff 1s ease-out 0.2s infinite" }}
              />
              <div
                className="absolute left-0 top-[158px] h-10 w-10 rounded-full bg-gray-200/30 blur-lg"
                style={{ animation: "smokePuff 1.2s ease-out 0.4s infinite" }}
              />
            </>
          )}
        </div>

        {/* Road — below bike */}
        <div className="relative mt-4 h-3 w-[700px]">
          {/* Road surface */}
          <div className="absolute inset-0 rounded bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
          {/* Dashed yellow line */}
          <div
            className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
            style={{
              backgroundImage: "linear-gradient(to right, #FACC15 50%, transparent 50%)",
              backgroundSize: "40px 2px",
              animation: phase === "middle" ? "roadFlyFast 0.3s linear infinite" : "roadFly 1s linear infinite",
            }}
          />
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1 w-80 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E8792F] via-[#F2994A] to-[#E8792F]"
            style={{
              animation: "progressFill 3s cubic-bezier(0.3, 0.2, 0.2, 1) forwards",
              backgroundSize: "200% 100%",
            }}
          />
        </div>

        {/* Logo — reveals during end phase */}
        {(phase === "end" || phase === "fadeout") && (
          <div
            className="mt-8 flex flex-col items-center"
            style={{ animation: "logoReveal 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8792F] text-lg font-bold text-white shadow-[0_0_30px_rgba(232,121,47,0.5)]">
                BW
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Bigwing CRM</p>
                <p className="text-xs font-medium text-white/50">
                  Revving up your dashboard...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phase text — start + middle */}
        {phase === "start" && (
          <p className="mt-6 text-sm font-medium text-white/70">Starting engine...</p>
        )}
        {phase === "middle" && (
          <p className="mt-6 text-sm font-medium text-[#E8792F]">Accelerating...</p>
        )}
      </div>
    </div>
  );
}

function SportsRider({ phase }: { phase: string }) {
  const wheelAnim =
    phase === "start" ? "wheelSpinStart 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards" :
    phase === "middle" ? "wheelSpinFast 0.15s linear infinite" :
    "wheelSpinFast 0.8s linear infinite";

  return (
    <svg width="320" height="200" viewBox="0 0 320 200" fill="none" style={{ filter: "drop-shadow(0 10px 30px rgba(232, 121, 47, 0.4))" }}>
      {/* Exhaust/muffler */}
      <path d="M 30 120 L 80 115 L 85 128 L 35 132 Z" fill="#6B7280" />
      <circle cx="32" cy="126" r="6" fill="#1F2937" />

      {/* Rear fender — red */}
      <path d="M 75 95 Q 110 70 160 75 L 170 110 L 90 115 Z" fill="#DC2626" />

      {/* Seat */}
      <path d="M 120 75 L 200 70 L 210 85 L 140 95 Z" fill="#1F2937" />

      {/* Fuel tank — red */}
      <path d="M 150 80 Q 180 60 220 70 L 225 95 Q 200 92 155 95 Z" fill="#DC2626" />
      <path d="M 170 72 Q 190 63 215 70" stroke="#B91C1C" strokeWidth="1" fill="none" />

      {/* Front fairing — red */}
      <path d="M 220 70 Q 260 55 270 80 L 275 110 L 230 115 Z" fill="#DC2626" />
      <path d="M 240 72 L 265 65 L 270 82 L 250 85 Z" fill="#B91C1C" />

      {/* Headlight */}
      <ellipse cx="275" cy="88" rx="8" ry="12" fill="#FEF3C7" opacity="0.9" style={{ animation: phase === "middle" ? "headlightPulse 0.4s ease-in-out infinite" : "none" }} />
      <ellipse cx="277" cy="88" rx="5" ry="8" fill="#FFFFFF" />

      {/* Handlebar + front part */}
      <path d="M 225 65 L 260 50 L 280 60" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />

      {/* Rider body */}
      {/* Torso — white jacket */}
      <path d="M 145 55 Q 160 40 195 42 L 210 80 L 170 85 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      {/* Black pants / leg */}
      <path d="M 168 82 L 195 78 L 200 135 Q 190 145 175 145 L 165 110 Z" fill="#1F2937" />
      {/* Boot */}
      <path d="M 170 138 L 200 138 L 208 148 L 175 150 Z" fill="#111827" />

      {/* Arm */}
      <path d="M 190 55 Q 210 50 230 62" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M 190 55 Q 210 50 230 62" stroke="#E5E7EB" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Glove */}
      <circle cx="232" cy="62" r="7" fill="#1F2937" />

      {/* Helmet */}
      <circle cx="175" cy="42" r="22" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <path d="M 155 38 Q 165 18 195 20 Q 200 36 195 50 Z" fill="#DC2626" />
      {/* Helmet visor */}
      <path d="M 160 42 Q 170 35 190 37 L 192 52 Q 175 55 160 52 Z" fill="#1a1a2e" />
      <path d="M 162 45 Q 172 40 188 42" stroke="#DC2626" strokeWidth="1.5" fill="none" />
      {/* Helmet stripe */}
      <path d="M 162 28 Q 172 24 190 26" stroke="#DC2626" strokeWidth="2" fill="none" opacity="0.7" />

      {/* Rear wheel — spinning */}
      <g style={{ transformOrigin: "85px 155px", animation: wheelAnim }}>
        <circle cx="85" cy="155" r="32" fill="#1a1a2e" />
        <circle cx="85" cy="155" r="26" fill="#2C2C3E" />
        <circle cx="85" cy="155" r="10" fill="#6B7280" />
        {/* Spokes */}
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1="85" y1="155"
            x2={85 + 26 * Math.cos((a * Math.PI) / 180)}
            y2={155 + 26 * Math.sin((a * Math.PI) / 180)}
            stroke="#9CA3AF" strokeWidth="2.5"
          />
        ))}
        <circle cx="85" cy="155" r="4" fill="#1F2937" />
      </g>

      {/* Front wheel — spinning */}
      <g style={{ transformOrigin: "255px 155px", animation: wheelAnim }}>
        <circle cx="255" cy="155" r="32" fill="#1a1a2e" />
        <circle cx="255" cy="155" r="26" fill="#2C2C3E" />
        <circle cx="255" cy="155" r="10" fill="#6B7280" />
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1="255" y1="155"
            x2={255 + 26 * Math.cos((a * Math.PI) / 180)}
            y2={155 + 26 * Math.sin((a * Math.PI) / 180)}
            stroke="#9CA3AF" strokeWidth="2.5"
          />
        ))}
        <circle cx="255" cy="155" r="4" fill="#1F2937" />
      </g>

      {/* Engine block */}
      <rect x="145" y="110" width="55" height="35" rx="4" fill="#4B5563" />
      <rect x="148" y="113" width="8" height="29" rx="1" fill="#374151" />
      <rect x="160" y="113" width="8" height="29" rx="1" fill="#374151" />
      <rect x="172" y="113" width="8" height="29" rx="1" fill="#374151" />
      <rect x="184" y="113" width="8" height="29" rx="1" fill="#374151" />

      {/* Frame connecting wheels */}
      <line x1="95" y1="150" x2="150" y2="130" stroke="#6B7280" strokeWidth="5" strokeLinecap="round" />
      <line x1="200" y1="130" x2="245" y2="150" stroke="#6B7280" strokeWidth="5" strokeLinecap="round" />

      {/* Front fork */}
      <line x1="245" y1="75" x2="255" y2="155" stroke="#6B7280" strokeWidth="4" strokeLinecap="round" />
      <line x1="265" y1="75" x2="260" y2="155" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
