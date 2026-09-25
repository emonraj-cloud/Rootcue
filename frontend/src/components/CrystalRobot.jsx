// Full crystal robot rendered as inline SVG so it stays crisp at any size,
// needs no network request, and can be recoloured from CSS.
export default function CrystalRobot({ className = '' }) {
  return (
    <svg
      className={`crystal-robot ${className}`}
      viewBox="0 0 220 300"
      role="img"
      aria-label="Crystal AI robot"
    >
      <defs>
        <linearGradient id="cr-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="35%" stopColor="#6366f1" />
          <stop offset="65%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        <linearGradient id="cr-head" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="40%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>

        <linearGradient id="cr-arm" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        <linearGradient id="cr-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>

        <radialGradient id="cr-eye" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>

        <radialGradient id="cr-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        <filter id="cr-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="cr-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* ambient halo behind the whole figure */}
      <ellipse cx="110" cy="150" rx="105" ry="140" fill="url(#cr-halo)" />

      {/* ---------------- head: hexagonal crystal ---------------- */}
      <g filter="url(#cr-glow)">
        <polygon
          points="110,18 152,44 152,88 110,112 68,88 68,44"
          fill="url(#cr-head)"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* facets: each triangle catches light differently */}
        <polygon points="110,18 152,44 110,65" fill="#ffffff" fillOpacity="0.42" />
        <polygon points="110,18 68,44 110,65" fill="#ffffff" fillOpacity="0.2" />
        <polygon points="152,44 152,88 110,65" fill="#4f46e5" fillOpacity="0.35" />
        <polygon points="68,44 68,88 110,65" fill="#ffffff" fillOpacity="0.13" />
        <polygon points="68,88 110,112 110,65" fill="#312e81" fillOpacity="0.28" />
        <polygon points="152,88 110,112 110,65" fill="#0e7490" fillOpacity="0.3" />
        {/* forehead highlight */}
        <polygon points="110,24 143,45 126,52" fill="#ffffff" fillOpacity="0.3" />
      </g>

      {/* eyes */}
      <g filter="url(#cr-glow)">
        <polygon points="88,58 96,68 88,78 80,68" fill="url(#cr-eye)" />
        <polygon points="132,58 140,68 132,78 124,68" fill="url(#cr-eye)" />
      </g>

      {/* antenna */}
      <g filter="url(#cr-glow)">
        <line x1="110" y1="18" x2="110" y2="4" stroke="#c7d2fe" strokeWidth="2.5" />
        <circle cx="110" cy="3" r="5" fill="#67e8f9" />
      </g>

      {/* ---------------- neck ---------------- */}
      <polygon points="98,112 122,112 126,128 94,128" fill="url(#cr-body)" stroke="#e0e7ff" strokeWidth="1" />

      {/* ---------------- arms ---------------- */}
      <g filter="url(#cr-glow)">
        <polygon points="66,138 84,134 78,196 56,190" fill="url(#cr-arm)" stroke="#e0e7ff" strokeWidth="1.2" />
        <polygon points="154,138 136,134 142,196 164,190" fill="url(#cr-arm)" stroke="#e0e7ff" strokeWidth="1.2" />
        <polygon points="66,138 84,134 80,158 62,156" fill="#ffffff" fillOpacity="0.28" />
        <polygon points="154,138 136,134 140,158 158,156" fill="#ffffff" fillOpacity="0.2" />
      </g>

      {/* ---------------- torso ---------------- */}
      <g filter="url(#cr-glow)">
        <polygon
          points="86,130 134,130 150,168 126,214 94,214 70,168"
          fill="url(#cr-body)"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* torso facets */}
        <polygon points="86,130 134,130 110,152" fill="#ffffff" fillOpacity="0.4" />
        <polygon points="70,168 110,152 94,214" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="150,168 110,152 126,214" fill="#1e1b4b" fillOpacity="0.3" />
        <polygon points="86,130 70,168 110,152" fill="#ffffff" fillOpacity="0.22" />
        <polygon points="134,130 150,168 110,152" fill="#4c1d95" fillOpacity="0.32" />
      </g>

      {/* glowing core in the chest */}
      <g filter="url(#cr-glow)">
        <polygon points="110,162 124,178 110,194 96,178" fill="url(#cr-core)" />
        <polygon points="110,166 119,178 110,190 101,178" fill="#ffffff" fillOpacity="0.55" />
      </g>

      {/* waist / hips */}
      <polygon points="94,214 126,214 132,240 88,240" fill="url(#cr-body)" stroke="#e0e7ff" strokeWidth="1.2" />
      <polygon points="94,214 126,214 110,228" fill="#ffffff" fillOpacity="0.3" />

      {/* pedestal */}
      <ellipse cx="110" cy="252" rx="52" ry="10" fill="#4f46e5" fillOpacity="0.5" filter="url(#cr-soft)" />
      <polygon points="70,244 150,244 138,268 82,268" fill="url(#cr-body)" stroke="#e0e7ff" strokeWidth="1.2" />
      <polygon points="70,244 150,244 110,256" fill="#ffffff" fillOpacity="0.35" />
      <ellipse cx="110" cy="278" rx="60" ry="9" fill="#6366f1" fillOpacity="0.35" filter="url(#cr-soft)" />
    </svg>
  )
}
