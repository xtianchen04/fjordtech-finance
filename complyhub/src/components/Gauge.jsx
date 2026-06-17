// Jauge circulaire SVG affichant le score de préparation à l'inspection.
export default function Gauge({ score = 0, size = 130, stroke = 11 }) {
  const r = (size - stroke) / 2 - 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(Math.max(score, 0), 100) / 100) * c
  const color = score >= 85 ? '#2E9E6B' : score >= 70 ? '#E0A030' : '#D1495B'
  const center = size / 2

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="#E8F1F8" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold font-serif">{score}%</div>
        <div className="text-[11px] text-[#5E7385] font-semibold uppercase tracking-wide">Prêt</div>
      </div>
    </div>
  )
}
