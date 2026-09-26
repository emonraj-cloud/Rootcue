// Full-body robot drawn for small sizes: bold silhouette, high contrast,
// minimal interior detail so it stays readable around 46px tall.
export default function RobotIcon({ className = '' }) {
  return (
    <svg
      className={`robot-icon ${className}`}
      viewBox="0 0 64 96"
      role="img"
      aria-label="AI Robot Assistant"
    >
      <defs>
        <linearGradient id="ri-shell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="40%" stopColor="#a5b4fc" />
          <stop offset="78%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="ri-body" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="60%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id="ri-limb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="ri-eye" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="60%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>

        <filter id="ri-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* soft halo so it lifts off both light and dark backgrounds */}
      <ellipse cx="32" cy="50" rx="30" ry="44" fill="#6366f1" fillOpacity="0.12" />

      {/* ---------- antenna ---------- */}
      <g filter="url(#ri-glow)">
        <line x1="32" y1="11" x2="32" y2="5" stroke="#818cf8" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="32" cy="3.4" r="2.6" fill="url(#ri-eye)" />
      </g>

      {/* ---------- head ---------- */}
      <rect
        x="18"
        y="11"
        width="28"
        height="22"
        rx="6.5"
        fill="url(#ri-shell)"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="1.3"
      />
      {/* sheen */}
      <path d="M22 26 Q22 15 31 15 L35 15 Q25 17 24 28 Z" fill="#ffffff" fillOpacity="0.38" />
      {/* eyes */}
      <g filter="url(#ri-glow)">
        <rect x="24.5" y="18" width="5.5" height="6.5" rx="2.7" fill="url(#ri-eye)" />
        <rect x="34" y="18" width="5.5" height="6.5" rx="2.7" fill="url(#ri-eye)" />
      </g>

      {/* ---------- neck ---------- */}
      <rect x="28" y="32" width="8" height="5" fill="#6366f1" />

      {/* ---------- arms ---------- */}
      <rect x="9.5" y="40" width="7" height="22" rx="3.5" fill="url(#ri-limb)" />
      <rect x="47.5" y="40" width="7" height="22" rx="3.5" fill="url(#ri-limb)" />

      {/* ---------- torso ---------- */}
      <rect
        x="19"
        y="37"
        width="26"
        height="27"
        rx="7"
        fill="url(#ri-body)"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      {/* chest core */}
      <g filter="url(#ri-glow)">
        <circle cx="32" cy="49" r="4.6" fill="#312e81" />
        <circle cx="32" cy="49" r="2.6" fill="url(#ri-eye)" />
      </g>

      {/* ---------- legs ---------- */}
      <rect x="22.5" y="65" width="7.5" height="22" rx="3.7" fill="url(#ri-limb)" />
      <rect x="34" y="65" width="7.5" height="22" rx="3.7" fill="url(#ri-limb)" />

      {/* ---------- feet ---------- */}
      <rect x="20" y="86" width="12.5" height="6" rx="3" fill="#4f46e5" />
      <rect x="31.5" y="86" width="12.5" height="6" rx="3" fill="#4f46e5" />
    </svg>
  )
}
