// Clean, professional robot head icon. Inline SVG so it stays sharp at
// any size, needs no image file, and weighs nothing.
export default function RobotIcon({ className = '' }) {
  return (
    <svg
      className={`robot-icon ${className}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="AI Robot Assistant"
    >
      <defs>
        <linearGradient id="ri-shell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="40%" stopColor="#a5b4fc" />
          <stop offset="75%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="ri-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>

        <linearGradient id="ri-eye" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>

        <linearGradient id="ri-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <filter id="ri-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* soft ambient glow behind the head */}
      <circle cx="32" cy="34" r="24" fill="#6366f1" fillOpacity="0.12" />

      {/* antenna */}
      <g filter="url(#ri-glow)">
        <line x1="32" y1="17" x2="32" y2="9" stroke="url(#ri-metal)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="7" r="3.4" fill="url(#ri-eye)" />
      </g>

      {/* side ears */}
      <rect x="8" y="28" width="5" height="13" rx="2.5" fill="url(#ri-metal)" />
      <rect x="51" y="28" width="5" height="13" rx="2.5" fill="url(#ri-metal)" />

      {/* head shell */}
      <rect
        x="13"
        y="16"
        width="38"
        height="36"
        rx="10"
        fill="url(#ri-shell)"
        stroke="#ffffff"
        strokeOpacity="0.65"
        strokeWidth="1.4"
      />

      {/* top-left sheen for a little dimension */}
      <path d="M17 30 Q17 20 27 20 L33 20 Q23 22 22 32 Z" fill="#ffffff" fillOpacity="0.35" />

      {/* face plate */}
      <rect x="18" y="23" width="28" height="22" rx="7" fill="url(#ri-face)" />

      {/* eyes */}
      <g filter="url(#ri-glow)">
        <rect x="23" y="28" width="6.5" height="8" rx="3.2" fill="url(#ri-eye)" />
        <rect x="34.5" y="28" width="6.5" height="8" rx="3.2" fill="url(#ri-eye)" />
        <circle cx="25.4" cy="30" r="1.3" fill="#ffffff" fillOpacity="0.85" />
        <circle cx="36.9" cy="30" r="1.3" fill="#ffffff" fillOpacity="0.85" />
      </g>

      {/* mouth */}
      <rect x="26" y="39.5" width="12" height="2.6" rx="1.3" fill="#67e8f9" fillOpacity="0.9" />
    </svg>
  )
}
