// Full-body robot carved from crystal. Angular faceted polygons with
// per-facet light and shade, bright edge highlights and a prismatic halo,
// which is what makes a flat SVG read as 3D at small sizes.
export default function RobotIcon({ className = '' }) {
  return (
    <svg
      className={`robot-icon ${className}`}
      viewBox="0 0 64 96"
      role="img"
      aria-label="Crystal AI Robot Assistant"
    >
      <defs>
        <linearGradient id="cr-shell" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="35%" stopColor="#a5b4fc" />
          <stop offset="70%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        <linearGradient id="cr-body" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        <linearGradient id="cr-limb" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>

        <linearGradient id="cr-eye" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>

        <radialGradient id="cr-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>

        <filter id="cr-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* prismatic halo */}
      <ellipse cx="32" cy="50" rx="30" ry="45" fill="url(#cr-halo)" />

      {/* ================= antenna ================= */}
      <g filter="url(#cr-glow)">
        <polygon points="32,1 35,6 32,12 29,6" fill="url(#cr-shell)" stroke="#e0e7ff" strokeOpacity="0.7" strokeWidth="0.8" />
        <polygon points="32,1 35,6 32,6" fill="#ffffff" fillOpacity="0.6" />
        <circle cx="32" cy="1" r="2" fill="url(#cr-eye)" />
      </g>

      {/* ================= head ================= */}
      <g filter="url(#cr-glow)">
        <polygon
          points="32,9 45,14 49,25 43,35 32,38 21,35 15,25 19,14"
          fill="url(#cr-shell)"
          stroke="#ffffff"
          strokeOpacity="0.62"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* facets: light comes from the top-left */}
        <polygon points="32,9 45,14 32,23" fill="#ffffff" fillOpacity="0.46" />
        <polygon points="19,14 32,9 32,23" fill="#ffffff" fillOpacity="0.28" />
        <polygon points="45,14 49,25 32,23" fill="#ffffff" fillOpacity="0.1" />
        <polygon points="15,25 19,14 32,23" fill="#ffffff" fillOpacity="0.16" />
        <polygon points="49,25 43,35 32,23" fill="#1e1b4b" fillOpacity="0.3" />
        <polygon points="43,35 32,38 32,23" fill="#1e1b4b" fillOpacity="0.36" />
        <polygon points="32,38 21,35 32,23" fill="#ffffff" fillOpacity="0.14" />
        <polygon points="21,35 15,25 32,23" fill="#312e81" fillOpacity="0.2" />
      </g>

      {/* crystal eyes */}
      <g filter="url(#cr-glow)">
        <polygon points="25,19 31,20.5 31,26 25,24.5" fill="url(#cr-eye)" />
        <polygon points="33,20.5 39,19 39,24.5 33,26" fill="url(#cr-eye)" />
      </g>

      {/* ================= neck ================= */}
      <polygon points="28,37 36,37 37,42 27,42" fill="url(#cr-body)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" />

      {/* ================= arms ================= */}
      <g filter="url(#cr-glow)">
        <polygon points="10,43 16,42 15,60 9,60" fill="url(#cr-limb)" stroke="#e0e7ff" strokeOpacity="0.45" strokeWidth="0.8" />
        <polygon points="10,43 16,42 14,52 9,54" fill="#ffffff" fillOpacity="0.34" />
        <polygon points="48,42 54,43 55,60 49,60" fill="url(#cr-limb)" stroke="#e0e7ff" strokeOpacity="0.45" strokeWidth="0.8" />
        <polygon points="48,42 54,43 55,52 50,54" fill="#ffffff" fillOpacity="0.24" />
        <polygon points="49,60 55,60 55,62 49,62" fill="#1e1b4b" fillOpacity="0.3" />
        <polygon points="9,60 15,60 15,62 9,62" fill="#1e1b4b" fillOpacity="0.3" />
      </g>

      {/* ================= torso ================= */}
      <g filter="url(#cr-glow)">
        <polygon
          points="20,42 44,42 49,55 42,68 22,68 15,55"
          fill="url(#cr-body)"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <polygon points="20,42 44,42 32,52" fill="#ffffff" fillOpacity="0.38" />
        <polygon points="15,55 20,42 32,52" fill="#ffffff" fillOpacity="0.18" />
        <polygon points="44,42 49,55 32,52" fill="#ffffff" fillOpacity="0.08" />
        <polygon points="15,55 22,68 32,52" fill="#ffffff" fillOpacity="0.1" />
        <polygon points="49,55 42,68 32,52" fill="#1e1b4b" fillOpacity="0.32" />
        <polygon points="22,68 42,68 32,52" fill="#1e1b4b" fillOpacity="0.26" />
      </g>

      {/* refracting core */}
      <g filter="url(#cr-glow)">
        <polygon points="32,53 37,60 32,67 27,60" fill="#0e7490" fillOpacity="0.5" />
        <polygon points="32,55 35,60 32,65 29,60" fill="url(#cr-eye)" />
        <polygon points="32,55 32,65 29,60" fill="#ffffff" fillOpacity="0.4" />
      </g>

      {/* ================= legs ================= */}
      <g filter="url(#cr-glow)">
        <polygon points="23,68 30,68 30,86 22,86" fill="url(#cr-limb)" stroke="#e0e7ff" strokeOpacity="0.45" strokeWidth="0.8" />
        <polygon points="23,68 30,68 27,78 22,78" fill="#ffffff" fillOpacity="0.32" />
        <polygon points="34,68 41,68 42,86 34,86" fill="url(#cr-limb)" stroke="#e0e7ff" strokeOpacity="0.45" strokeWidth="0.8" />
        <polygon points="34,68 41,68 41,78 36,78" fill="#ffffff" fillOpacity="0.2" />
      </g>

      {/* ================= feet ================= */}
      <g filter="url(#cr-glow)">
        <polygon points="20,86 30,86 29,93 20,93" fill="url(#cr-body)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" />
        <polygon points="20,86 30,86 26,89 20,89" fill="#ffffff" fillOpacity="0.34" />
        <polygon points="34,86 44,86 44,93 35,93" fill="url(#cr-body)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" />
        <polygon points="34,86 44,86 42,89 36,89" fill="#ffffff" fillOpacity="0.22" />
      </g>
    </svg>
  )
}
