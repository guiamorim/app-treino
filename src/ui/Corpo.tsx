import { destaques, GRUPOS_POR_VISTA, type Destaque, type Vista } from '../domain/musculos'
import { NOMES_GRUPOS, type Exercicio, type GrupoMuscular } from '../domain/types'

// F18: desenho próprio do corpo (frente e costas), sem imagens de terceiros.
// Cada figura usa viewBox 0 0 120 240; o lado direito é o espelho do esquerdo.
const espelho = (forma: string) => <g transform="matrix(-1 0 0 1 120 0)">{/* lado direito */}<path d={forma} /></g>

const SILHUETA = [
  'M36 42 Q60 36 84 42 L80 112 L40 112 Z', // tronco
  'M40 110 L80 110 L84 128 L36 128 Z', // anca
  'M54 30 L66 30 L66 42 L54 42 Z', // pescoço
]
const MEMBROS = [
  'M36 44 L26 50 L18 104 L26 106 L36 60 Z', // braço
  'M18 104 L12 146 L20 148 L26 106 Z', // antebraço
  'M37 126 L59 126 L56 186 L42 186 Z', // coxa
  'M42 186 L56 186 L54 232 L45 232 Z', // perna
]

type Formas = Partial<Record<GrupoMuscular, string[]>>
// Formas do lado esquerdo; as marcadas com * ficam ao centro e não são espelhadas.
const MUSCULOS: Record<Vista, Formas> = {
  frente: {
    ombros: ['M26 48 A7 8 0 1 0 40 48 A7 8 0 1 0 26 48 Z'],
    peito: ['M42 48 Q51 44 59 48 L59 68 Q48 72 41 64 Z'],
    biceps: ['M30 64 Q34 78 28 92 Q22 92 22 88 Q24 72 30 64 Z'],
    core: ['*M48 74 L72 74 L72 108 L48 108 Z'],
    quadriceps: ['M40 132 L58 132 L55 178 L44 178 Z'],
  },
  costas: {
    ombros: ['M26 48 A7 8 0 1 0 40 48 A7 8 0 1 0 26 48 Z'],
    costas: ['*M44 44 Q60 38 76 44 L80 64 L72 94 L60 100 L48 94 L40 64 Z'],
    triceps: ['M30 64 Q34 78 28 92 Q22 92 22 88 Q24 72 30 64 Z'],
    core: ['*M52 100 L68 100 L68 110 L52 110 Z'],
    gluteos: ['M40 114 L59 114 L59 130 Q48 134 40 126 Z'],
    posteriores: ['M41 136 L58 136 L55 180 L44 180 Z'],
    gemeos: ['M44 190 L55 190 L53 214 L46 214 Z'],
  },
}

function Figura({ vista, d }: { vista: Vista; d: Partial<Record<GrupoMuscular, Destaque>> }) {
  return (
    <figure className="corpo-figura">
      <svg viewBox="0 0 120 240" aria-hidden="true">
        <g className="corpo-base">
          <circle cx="60" cy="18" r="12" />
          {SILHUETA.map((f) => <path key={f} d={f} />)}
          {MEMBROS.map((f) => <g key={f}><path d={f} />{espelho(f)}</g>)}
        </g>
        {GRUPOS_POR_VISTA[vista].map((g) => (
          <g key={g} className={`musculo ${d[g] ?? ''}`} data-grupo={g}>
            {(MUSCULOS[vista][g] ?? []).map((f) =>
              f.startsWith('*') ? <path key={f} d={f.slice(1)} /> : <g key={f}><path d={f} />{espelho(f)}</g>,
            )}
          </g>
        ))}
      </svg>
      <figcaption>{vista === 'frente' ? 'Frente' : 'Costas'}</figcaption>
    </figure>
  )
}

export function Corpo({ ex }: { ex: Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios'> }) {
  const d = destaques(ex)
  const secundarios = ex.gruposSecundarios.filter((g) => g !== ex.grupoPrincipal).map((g) => NOMES_GRUPOS[g])
  const descricao = `Músculos trabalhados: ${NOMES_GRUPOS[ex.grupoPrincipal]}${secundarios.length ? `; secundários: ${secundarios.join(', ')}` : ''}.`
  return (
    <div className="corpo-musculos" role="img" aria-label={descricao}>
      <Figura vista="frente" d={d} />
      <Figura vista="costas" d={d} />
    </div>
  )
}
