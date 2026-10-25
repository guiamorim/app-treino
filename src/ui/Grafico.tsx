import { locale, t } from '../i18n'
export interface Ponto {
  x: number
  y: number
  destaque?: boolean
  rotulo?: string
}

/** Gráfico de linha simples em SVG, sem bibliotecas externas. */
export function GraficoLinha({ pontos, titulo, unidade, cor = 'var(--acento)', extra }: { pontos: Ponto[]; titulo: string; unidade: string; cor?: string; extra?: Ponto[] }) {
  if (pontos.length === 0) return <p className="secundario">{t('Ainda sem dados.')}</p>
  const L = 320, A = 160, m = { e: 36, d: 8, t: 10, b: 22 }
  const todos = [...pontos, ...(extra ?? [])]
  const xs = todos.map((p) => p.x), ys = todos.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  if (y0 === y1) { y0 -= 1; y1 += 1 }
  const folga = (y1 - y0) * 0.1
  y0 -= folga; y1 += folga
  const px = (x: number) => m.e + (x1 === x0 ? (L - m.e - m.d) / 2 : ((x - x0) / (x1 - x0)) * (L - m.e - m.d))
  const py = (y: number) => m.t + (1 - (y - y0) / (y1 - y0)) * (A - m.t - m.b)
  const caminho = (ps: Ponto[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
  const fmt = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
  const data = (ms: number) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
  return (
    <svg className="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label={t('{titulo}: de {de} para {para} {unidade}', { titulo, de: fmt(pontos[0]!.y), para: fmt(pontos.at(-1)!.y), unidade })}>
      {[y0 + folga, (y0 + y1) / 2, y1 - folga].map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={py(v)} y2={py(v)} stroke="var(--linha)" />
          <text x={m.e - 4} y={py(v) + 4} textAnchor="end">{fmt(v)}</text>
        </g>
      ))}
      <text x={m.e} y={A - 4}>{data(x0)}</text>
      <text x={L - m.d} y={A - 4} textAnchor="end">{data(x1)}</text>
      {extra && extra.length > 1 && <path d={caminho(extra)} fill="none" stroke="var(--texto-2)" strokeWidth={1.5} strokeDasharray="4 3" />}
      <path d={caminho(pontos)} fill="none" stroke={cor} strokeWidth={2.5} />
      {pontos.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={p.destaque ? 5 : 3} fill={p.destaque ? 'var(--ok)' : cor}>
          <title>{p.rotulo ?? `${fmt(p.y)} ${unidade}`}</title>
        </circle>
      ))}
    </svg>
  )
}
