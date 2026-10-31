import { destaquesPorRegiao } from '../domain/musculos'
import { NOMES_GRUPOS, type Exercicio, type GrupoMuscular, type Sexo } from '../domain/types'
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

export function Corpo({ ex, sexo, compacto }: { ex: Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios' | 'gruposTerciarios'>; sexo?: Sexo; compacto?: boolean }) {
  const d = destaquesPorRegiao(ex)
  const corpo = corpos[sexo === 'feminino' ? 'feminino' : 'masculino']
  const nomes = (gs: readonly GrupoMuscular[] | undefined, fora: readonly GrupoMuscular[]) => [...new Set(gs ?? [])].filter((g) => !fora.includes(g)).map((g) => NOMES_GRUPOS[g])
  const auxiliares1 = nomes(ex.gruposSecundarios, [ex.grupoPrincipal])
  const auxiliares2 = nomes(ex.gruposTerciarios, [ex.grupoPrincipal, ...ex.gruposSecundarios])
  // F31.3: a descrição diz os três níveis.
  const descricao = [
    t('Músculos trabalhados: {principal}.', { principal: NOMES_GRUPOS[ex.grupoPrincipal] }),
    ...(auxiliares1.length ? [t('Auxiliares 1: {grupos}.', { grupos: auxiliares1.join(', ') })] : []),
    ...(auxiliares2.length ? [t('Auxiliares 2: {grupos}.', { grupos: auxiliares2.join(', ') })] : []),
  ].join(' ')
  return (
    <>
      <div className={`corpo-musculos${compacto ? ' compacto' : ''}`} role="img" aria-label={descricao} data-corpo={sexo === 'feminino' ? 'feminino' : 'masculino'}>
        <Figura vista={corpo.frente} titulo={t('Frente')} d={d} />
        <Figura vista={corpo.costas} titulo={t('Costas')} d={d} />
      </div>
      {!compacto && (
        <p className="legenda-musculos" aria-hidden="true">
          <span><i className="principal" />{t('Principal')}</span>
          {auxiliares1.length > 0 && <span><i className="secundario" />{t('Auxiliar 1')}</span>}
          {auxiliares2.length > 0 && <span><i className="terciario" />{t('Auxiliar 2')}</span>}
        </p>
      )}
    </>
  )
}
