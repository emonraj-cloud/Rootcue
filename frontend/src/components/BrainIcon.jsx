// Anatomical-style brain: two hemispheres with visible folds, a striped
// cerebellum and a brain stem. Multi-colour so it reads as a brain rather
// than a flat glyph.
export default function BrainIcon({ className = '' }) {
  return (
    <svg
      className={`brain-icon ${className}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="AI brain"
    >
      <defs>
        <linearGradient id="bi-left" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="45%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        <linearGradient id="bi-right" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="bi-cerebellum" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>

        <linearGradient id="bi-stem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* ---------- left hemisphere ---------- */}
      <path
        d="M32 7 C22 5 11 11 10 21 C6 26 7 35 11 38 C10 45 16 50 22 49
           C25 53 29 55 32 55 Z"
        fill="url(#bi-left)"
      />

      {/* ---------- right hemisphere ---------- */}
      <path
        d="M32 7 C42 5 53 11 54 21 C58 26 57 35 53 38 C54 45 48 50 42 49
           C39 53 35 55 32 55 Z"
        fill="url(#bi-right)"
      />

      {/* ---------- folds (sulci) ---------- */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        {/* right hemisphere */}
        <path d="M36 13 C40 12 43 15 42 19 C41 22 45 24 44 28" />
        <path d="M36 26 C40 25 44 28 43 32 C42 35 46 37 45 41" />
        <path d="M35 40 C39 39 43 42 42 45" />
        {/* left hemisphere */}
        <path d="M28 13 C24 12 21 15 22 19 C23 22 19 24 20 28" />
        <path d="M28 26 C24 25 20 28 21 32 C22 35 18 37 19 41" />
        <path d="M29 40 C25 39 21 42 22 45" />
        {/* central fissure */}
        <path d="M32 8 L32 54" strokeOpacity="0.42" />
      </g>

      {/* ---------- cerebellum ---------- */}
      <path
        d="M22 49 C26 53 38 53 42 49 C43.5 54 40 58 32 58 C24 58 20.5 54 22 49 Z"
        fill="url(#bi-cerebellum)"
      />
      <g stroke="#7c2d12" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round">
        <path d="M25 52 L25 56" />
        <path d="M29 53 L29 57" />
        <path d="M32 53 L32 58" />
        <path d="M35 53 L35 57" />
        <path d="M39 52 L39 56" />
      </g>

      {/* ---------- brain stem ---------- */}
      <path d="M28 57 L36 57 C36 60 35 62 34 62 L30 62 C29 62 28 60 28 57 Z" fill="url(#bi-stem)" />
    </svg>
  )
}
