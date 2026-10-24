import { destaquesPorRegiao } from '../domain/musculos'
import { NOMES_GRUPOS, type Exercicio, type Sexo } from '../domain/types'
// F18: desenhos de react-native-body-highlighter 3.2.0, © 2022 Hicham Elabbassi, licença MIT (ver corpo/LICENSE).
import corpos from './corpo/corpos.json'

type Vista = (typeof corpos)['masculino']['frente']
// Cabeça, mãos, pés e articulações ficam num tom neutro, para não parecerem músculos.
const NEUTRAS = new Set(['hair', 'head', 'neck', 'hands', 'feet', 'knees', 'ankles'])

function Figura({ vista, titulo, d }: { vista: Vista; titulo: string; d: ReturnType<typeof destaquesPorRegiao> }) {
  return (
    <figure className="corpo-figura">
      <svg viewBox={vista.viewBox} aria-hidden="true">
        <path className="corpo-contorno" d={vista.contorno} />
        {vista.partes.map((p, i) => {
          const x = d.get(p.regiao)
          return (
            <g key={i} className={x ? `musculo ${x.destaque}` : NEUTRAS.has(p.regiao) ? 'corpo-neutro' : 'musculo'} {...(x ? { 'data-grupo': x.grupo } : {})}>
              {p.d.map((caminho, j) => <path key={j} d={caminho} />)}
            </g>
          )
        })}
      </svg>
      <figcaption>{titulo}</figcaption>
    </figure>
  )
}

export function Corpo({ ex, sexo }: { ex: Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios'>; sexo?: Sexo }) {
  const d = destaquesPorRegiao(ex)
  const corpo = corpos[sexo === 'feminino' ? 'feminino' : 'masculino']
  const secundarios = ex.gruposSecundarios.filter((g) => g !== ex.grupoPrincipal).map((g) => NOMES_GRUPOS[g])
  const descricao = `Músculos trabalhados: ${NOMES_GRUPOS[ex.grupoPrincipal]}${secundarios.length ? `; secundários: ${secundarios.join(', ')}` : ''}.`
  return (
    <div className="corpo-musculos" role="img" aria-label={descricao} data-corpo={sexo === 'feminino' ? 'feminino' : 'masculino'}>
      <Figura vista={corpo.frente} titulo="Frente" d={d} />
      <Figura vista={corpo.costas} titulo="Costas" d={d} />
    </div>
  )
}
