export function BridgeDiagram() {
  return (
    <svg
      viewBox="0 0 480 320"
      className="w-full max-w-md"
      role="img"
      aria-label="Ponte tra consulente e azienda tramite FinAgevolata"
    >
      <defs>
        <linearGradient id="bridgeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#312E81" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="20" y="100" width="140" height="120" rx="14" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
      <text x="90" y="155" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16" fill="#312E81">Consulente</text>
      <text x="90" y="180" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fill="#4F46E5">Dashboard clienti</text>

      <rect x="320" y="100" width="140" height="120" rx="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" />
      <text x="390" y="155" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16" fill="#065F46">Azienda</text>
      <text x="390" y="180" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fill="#047857">Documenti + stato</text>

      <path d="M 160 160 C 220 120, 260 120, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 160 160 C 220 200, 260 200, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />

      <circle cx="240" cy="140" r="6" fill="#6366F1">
        <animate attributeName="r" values="6;8;6" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="180" r="6" fill="#10B981">
        <animate attributeName="r" values="6;8;6" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#badgeShadow)">
        <rect x="160" y="28" width="160" height="56" rx="14" fill="url(#badgeGrad)" />
        <text
          x="240"
          y="62"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="white"
          letterSpacing="0.02em"
        >
          FinAgevolata
        </text>
      </g>
      <path d="M 240 84 L 240 130" stroke="#4F46E5" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  );
}
