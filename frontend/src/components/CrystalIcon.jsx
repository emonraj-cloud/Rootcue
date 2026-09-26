// Compact crystal gem with an AI chip core. Inline SVG so it stays sharp
// at any size and needs no network request.
export default function CrystalIcon({ className = '' }) {
  return (
    <svg
      className={`crystal-icon ${className}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Crystal AI chip"
    >
      <defs>
        <linearGradient id="ci-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="38%" stopColor="#818cf8" />
          <stop offset="72%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        <linearGradient id="ci-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>

        <radialGradient id="ci-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>

        <filter id="ci-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#ci-glow)" />

      <g filter="url(#ci-soft)">
        {/* ---------- gem ---------- */}
        <polygon
          points="32,3 55,22 45,48 32,61 19,48 9,22"
          fill="url(#ci-gem)"
          stroke="#e0e7ff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* crown facets */}
        <polygon points="32,3 55,22 32,27" fill="#ffffff" fillOpacity="0.4" />
        <polygon points="32,3 9,22 32,27" fill="#ffffff" fillOpacity="0.18" />

        {/* girdle band */}
        <polygon points="9,22 55,22 49,30 15,30" fill="#4f46e5" fillOpacity="0.3" />

        {/* pavilion facets */}
        <polygon points="15,30 32,61 32,34" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="49,30 32,61 32,34" fill="#312e81" fillOpacity="0.3" />

        {/* top-left specular highlight */}
        <polygon points="32,6 49,21 38,24" fill="#ffffff" fillOpacity="0.32" />
      </g>

      {/* ---------- AI chip core ---------- */}
      <g filter="url(#ci-soft)">
        {/* circuit traces radiating out to the facets */}
        <g stroke="#e0e7ff" strokeWidth="1" strokeLinecap="round" opacity="0.75">
          <path d="M32 27 L32 21" />
          <path d="M25 31 L17 27" />
          <path d="M39 31 L47 27" />
          <path d="M28 39 L23 48" />
          <path d="M36 39 L41 48" />
        </g>

        {/* pin nodes at the ends of the traces */}
        <g fill="#a5f3fc">
          <circle cx="32" cy="20" r="1.5" />
          <circle cx="16" cy="26" r="1.5" />
          <circle cx="48" cy="26" r="1.5" />
          <circle cx="22" cy="50" r="1.5" />
          <circle cx="42" cy="50" r="1.5" />
        </g>

        {/* the die itself */}
        <rect x="25" y="29" width="14" height="14" rx="2.5" fill="#0f172a" fillOpacity="0.55" />
        <rect
          x="25"
          y="29"
          width="14"
          height="14"
          rx="2.5"
          fill="none"
          stroke="url(#ci-chip)"
          strokeWidth="1.3"
        />
        <path d="M28.5 33.5 H35.5 M28.5 36 H33 M28.5 38.5 H34.5" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
