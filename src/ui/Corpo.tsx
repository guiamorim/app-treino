import { destaquesPorRegiao } from '../domain/musculos'
import { NOMES_GRUPOS, type Exercicio, type Sexo } from '../domain/types'
// F18: desenhos de react-native-body-highlighter 3.2.0, © 2022 Hicham Elabbassi, licença MIT (ver corpo/LICENSE).
import corpos from './corpo/corpos.json'
import { t } from '../i18n'

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

export function Corpo({ ex, sexo, compacto }: { ex: Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios'>; sexo?: Sexo; compacto?: boolean }) {
  const d = destaquesPorRegiao(ex)
  const corpo = corpos[sexo === 'feminino' ? 'feminino' : 'masculino']
  const secundarios = ex.gruposSecundarios.filter((g) => g !== ex.grupoPrincipal).map((g) => NOMES_GRUPOS[g])
  const descricao = secundarios.length
    ? t('Músculos trabalhados: {principal}; secundários: {secundarios}.', { principal: NOMES_GRUPOS[ex.grupoPrincipal], secundarios: secundarios.join(', ') })
    : t('Músculos trabalhados: {principal}.', { principal: NOMES_GRUPOS[ex.grupoPrincipal] })
  return (
    <div className={`corpo-musculos${compacto ? ' compacto' : ''}`} role="img" aria-label={descricao} data-corpo={sexo === 'feminino' ? 'feminino' : 'masculino'}>
      <Figura vista={corpo.frente} titulo={t('Frente')} d={d} />
      <Figura vista={corpo.costas} titulo={t('Costas')} d={d} />
    </div>
  )
}
