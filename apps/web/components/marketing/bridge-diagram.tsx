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
      </defs>

      <rect x="20" y="100" width="140" height="120" rx="14" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
      <text x="90" y="155" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="16" fill="#312E81">Consulente</text>
      <text x="90" y="180" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#4F46E5">Dashboard clienti</text>

      <rect x="320" y="100" width="140" height="120" rx="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" />
      <text x="390" y="155" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="16" fill="#065F46">Azienda</text>
      <text x="390" y="180" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#047857">Documenti + stato</text>

      <path d="M 160 160 C 220 120, 260 120, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 160 160 C 220 200, 260 200, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />

      <circle cx="240" cy="140" r="6" fill="#6366F1" />
      <circle cx="240" cy="180" r="6" fill="#10B981" />

      <rect x="205" y="40" width="70" height="40" rx="8" fill="#0F172A" />
      <text x="240" y="65" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="14" fill="white">FinAgevolata</text>
      <path d="M 240 80 L 240 130" stroke="#0F172A" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  );
}
