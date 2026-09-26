// Full-body robot cut from crystal. Built to read as 3D at small sizes:
// every surface is split into facets lit consistently from the top left,
// with a bright specular edge, deep shadow on the lower right, and a
// prismatic halo.
export default function RobotIcon({ className = '' }) {
  return (
    <svg
      className={`robot-icon ${className}`}
      viewBox="0 0 64 96"
      role="img"
      aria-label="Crystal AI Robot Assistant"
    >
      <defs>
        <linearGradient id="cr2-shell" x1="0.05" y1="0" x2="0.95" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="28%" stopColor="#c7d2fe" />
          <stop offset="62%" stopColor="#8b8ff0" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        <linearGradient id="cr2-body" x1="0" y1="0" x2="0.95" y2="1">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="40%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>

        <linearGradient id="cr2-limb" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="45%" stopColor="#8b8ff0" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        <linearGradient id="cr2-eye" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>

        <radialGradient id="cr2-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#c084fc" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>

        <filter id="cr2-glow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* prismatic halo */}
      <ellipse className="ri-halo" cx="32" cy="50" rx="30" ry="45" fill="url(#cr2-halo)" />

      {/* ground shadow, squashes in time with the body lift */}
      <ellipse className="ri-shadow" cx="32" cy="94" rx="16" ry="3.2" fill="#1e1b4b" fillOpacity="0.28" />

      {/* ==================== antenna ==================== */}
      <g className="ri-antenna" filter="url(#cr2-glow)">
        <polygon
          points="32,0 35.5,6 32,13 28.5,6"
          fill="url(#cr2-shell)"
          stroke="#ffffff"
          strokeOpacity="0.75"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <polygon points="32,0 35.5,6 32,6.5" fill="#ffffff" fillOpacity="0.65" />
        <polygon points="32,6.5 35.5,6 32,13" fill="#3730a3" fillOpacity="0.3" />
        <circle cx="32" cy="1" r="2.2" fill="url(#cr2-eye)" />
      </g>

      {/* ==================== head ==================== */}
      <g className="ri-head" filter="url(#cr2-glow)">
        <polygon
          points="32,8 40,10 46,15 49,24 46,32 40,37 32,39 24,37 18,32 15,24 18,15 24,10"
          fill="url(#cr2-shell)"
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* 12 facets, light from the top left */}
        <polygon points="24,10 32,8 32,24" fill="#ffffff" fillOpacity="0.5" />
        <polygon points="32,8 40,10 32,24" fill="#ffffff" fillOpacity="0.34" />
        <polygon points="40,10 46,15 32,24" fill="#ffffff" fillOpacity="0.2" />
        <polygon points="46,15 49,24 32,24" fill="#ffffff" fillOpacity="0.08" />
        <polygon points="49,24 46,32 32,24" fill="#1e1b4b" fillOpacity="0.24" />
        <polygon points="46,32 40,37 32,24" fill="#1e1b4b" fillOpacity="0.3" />
        <polygon points="40,37 32,39 32,24" fill="#1e1b4b" fillOpacity="0.34" />
        <polygon points="32,39 24,37 32,24" fill="#ffffff" fillOpacity="0.2" />
        <polygon points="24,37 18,32 32,24" fill="#ffffff" fillOpacity="0.14" />
        <polygon points="18,32 15,24 32,24" fill="#312e81" fillOpacity="0.2" />
        <polygon points="15,24 18,15 32,24" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="18,15 24,10 32,24" fill="#ffffff" fillOpacity="0.28" />
      </g>

      {/* crystal eyes */}
      <g className="ri-eyes" filter="url(#cr2-glow)">
        <polygon points="25,19.5 31,21 31,26.5 25,24.5" fill="url(#cr2-eye)" />
        <polygon points="33,21 39,19.5 39,24.5 33,26.5" fill="url(#cr2-eye)" />
        <polygon points="25,19.5 31,21 28,23" fill="#ffffff" fillOpacity="0.65" />
        <polygon points="33,21 39,19.5 36,23" fill="#ffffff" fillOpacity="0.5" />
      </g>

      {/* ==================== neck ==================== */}
      <polygon points="27.5,38 36.5,38 37.5,43 26.5,43" fill="url(#cr2-body)" stroke="#e0e7ff" strokeOpacity="0.55" strokeWidth="0.8" />
      <polygon points="27.5,38 36.5,38 32,40.5" fill="#ffffff" fillOpacity="0.35" />

      {/* ==================== arms ==================== */}
      <g className="ri-arms" filter="url(#cr2-glow)">
        {/* left */}
        <g className="ri-arm ri-arm-l">
        <polygon points="9,44 16,42 15.5,60 8.5,60" fill="url(#cr2-limb)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="9,44 16,42 12.5,52 8.5,55" fill="#ffffff" fillOpacity="0.4" />
        <polygon points="15.5,60 8.5,60 8.5,52 12.5,52" fill="#1e1b4b" fillOpacity="0.22" />
        <polygon points="8.5,60 15.5,60 15.5,62.5 8.5,62.5" fill="#312e81" fillOpacity="0.45" />
        </g>
        {/* right */}
        <g className="ri-arm ri-arm-r">
        <polygon points="48,42 55,44 55.5,60 48.5,60" fill="url(#cr2-limb)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="48,42 55,44 51.5,52 48,55" fill="#ffffff" fillOpacity="0.26" />
        <polygon points="55,44 55.5,60 51.5,52 48,55" fill="#1e1b4b" fillOpacity="0.24" />
        <polygon points="48.5,60 55.5,60 55.5,62.5 48.5,62.5" fill="#312e81" fillOpacity="0.45" />
        </g>
      </g>

      {/* ==================== torso ==================== */}
      <g filter="url(#cr2-glow)">
        <polygon
          points="20,42 44,42 48,48 50,57 44,66 36,70 28,70 20,66 14,57 16,48"
          fill="url(#cr2-body)"
          stroke="#ffffff"
          strokeOpacity="0.62"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* facets */}
        <polygon points="20,42 44,42 32,52" fill="#ffffff" fillOpacity="0.42" />
        <polygon points="16,48 20,42 32,52" fill="#ffffff" fillOpacity="0.24" />
        <polygon points="44,42 48,48 32,52" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="48,48 50,57 32,52" fill="#ffffff" fillOpacity="0.04" />
        <polygon points="50,57 44,66 32,52" fill="#1e1b4b" fillOpacity="0.3" />
        <polygon points="44,66 36,70 32,52" fill="#1e1b4b" fillOpacity="0.36" />
        <polygon points="36,70 28,70 32,52" fill="#1e1b4b" fillOpacity="0.28" />
        <polygon points="28,70 20,66 32,52" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="20,66 14,57 32,52" fill="#ffffff" fillOpacity="0.08" />
        <polygon points="14,57 16,48 32,52" fill="#312e81" fillOpacity="0.2" />
      </g>

      {/* refracting core */}
      <g className="ri-core" filter="url(#cr2-glow)">
        <polygon points="32,52 37.5,59.5 32,67 26.5,59.5" fill="#0e7490" fillOpacity="0.45" />
        <polygon points="32,54 35.5,59.5 32,65 28.5,59.5" fill="url(#cr2-eye)" />
        <polygon points="32,54 32,65 28.5,59.5" fill="#ffffff" fillOpacity="0.45" />
        <polygon points="32,54 35.5,59.5 32,59.5" fill="#ffffff" fillOpacity="0.3" />
      </g>

      {/* ==================== legs ==================== */}
      <g className="ri-legs" filter="url(#cr2-glow)">
        <polygon points="22,69 30,69 30,86 21,86" fill="url(#cr2-limb)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="22,69 30,69 26,78 21,78" fill="#ffffff" fillOpacity="0.38" />
        <polygon points="30,69 30,86 26,78" fill="#1e1b4b" fillOpacity="0.22" />
        <polygon points="34,69 42,69 43,86 34,86" fill="url(#cr2-limb)" stroke="#e0e7ff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="34,69 42,69 42,78 37,78" fill="#ffffff" fillOpacity="0.24" />
        <polygon points="34,86 43,86 42,78 37,78" fill="#1e1b4b" fillOpacity="0.24" />
      </g>

      {/* ==================== feet ==================== */}
      <g className="ri-feet" filter="url(#cr2-glow)">
        <polygon points="19,86 30,86 29,93 19,93" fill="url(#cr2-body)" stroke="#e0e7ff" strokeOpacity="0.55" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="19,86 30,86 25,89.5 19,89.5" fill="#ffffff" fillOpacity="0.4" />
        <polygon points="30,86 29,93 25,89.5" fill="#1e1b4b" fillOpacity="0.26" />
        <polygon points="34,86 45,86 45,93 35,93" fill="url(#cr2-body)" stroke="#e0e7ff" strokeOpacity="0.55" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="34,86 45,86 42,89.5 36,89.5" fill="#ffffff" fillOpacity="0.26" />
        <polygon points="45,86 45,93 42,89.5" fill="#1e1b4b" fillOpacity="0.3" />
      </g>

      {/* ==================== sparkle ==================== */}
      <g className="ri-sparkles" fill="#ffffff" opacity="0.9">
        <polygon points="53,20 54.1,23 57,24 54.1,25 53,28 51.9,25 49,24 51.9,23" />
        <polygon points="10,30 10.8,32.2 13,33 10.8,33.8 10,36 9.2,33.8 7,33 9.2,32.2" opacity="0.75" />
        <polygon points="47,72 47.7,73.8 49.5,74.5 47.7,75.2 47,77 46.3,75.2 44.5,74.5 46.3,73.8" opacity="0.6" />
      </g>
    </svg>
  )
}
