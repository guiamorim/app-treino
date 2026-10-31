// F26: lista e editor dos exercícios criados pelo utilizador.
import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { nomeTipoCarga, TIPOS_CARGA_PROPRIOS, type TipoCargaProprio } from '../domain/carga'
import { apagarProprio, guardarProprio, incrementoPadrao, novoIdProprio, temRegistos, type ExercicioProprio } from '../domain/proprios'
import { GRUPOS_MUSCULARES, NOMES_GRUPOS, type GrupoMuscular, type Medida } from '../domain/types'
import { deUnidade, paraCampo, unidadePeso } from '../domain/unidades'
import { lerVideo } from '../domain/video'
import { t } from '../i18n'
import { novoId, type Dados } from './dados'
import { noPlano } from '../domain/planoProprio'
import { ir } from './rota'

const numero = (s: string) => Number(s.replace(',', '.'))
const nomeMedida = (m: Medida) => (m === 'reps' ? t('Repetições') : t('Segundos'))

/** Cartão em «Mais» (F26.1). */
export function CartaoProprios({ dados }: { dados: Dados }) {
  const ativos = dados.proprios.filter((p) => !p.arquivado)
  return (
    <div className="cartao">
      <h3>{t('Os meus exercícios')}</h3>
      {ativos.length === 0 ? (
        <p className="secundario">{t('Ainda não criaste exercícios. Aparecem em «Substituir exercício», junto dos do mesmo grupo muscular.')}</p>
      ) : (
        <ul className="lista">
          {ativos.map((p) => (
            <li key={p.id}>
              <button className="item" onClick={() => ir(`/meu-exercicio/${p.id}`)}>
                <span className="corpo">
                  <span className="titulo">{p.nome}</span><br />
                  <span className="secundario">{NOMES_GRUPOS[p.grupoPrincipal]} · {nomeMedida(p.medida)} · {nomeTipoCarga(p.tipoCarga)}</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="largo" style={{ marginTop: 8 }} onClick={() => ir('/meu-exercicio/novo')}>{t('Novo exercício')}</button>
    </div>
  )
}

export function EditorProprio({ dados, id }: { dados: Dados; id: string }) {
  const atual = id === 'novo' ? undefined : dados.proprios.find((p) => p.id === id && !p.arquivado)
  if (id !== 'novo' && !atual) {
    return <><h1>{t('Exercício não encontrado')}</h1><button onClick={() => ir('/mais')}>{t('Voltar')}</button></>
  }
  return <Formulario key={id} dados={dados} atual={atual} />
}

function Formulario({ dados, atual }: { dados: Dados; atual?: ExercicioProprio }) {
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [medida, setMedida] = useState<Medida>(atual?.medida ?? 'reps')
  const [tipo, setTipo] = useState<TipoCargaProprio>(atual?.tipoCarga ?? 'halter')
  const [grupo, setGrupo] = useState<GrupoMuscular | ''>(atual?.grupoPrincipal ?? '')
  const [secundarios, setSecundarios] = useState<GrupoMuscular[]>(atual?.gruposSecundarios ?? [])
  const [incremento, setIncremento] = useState(atual?.incrementoKg === undefined ? '' : paraCampo(atual.incrementoKg))
  const [comoFazer, setComoFazer] = useState((atual?.comoFazer ?? []).join('\n'))
  const [video, setVideo] = useState(atual?.video ?? '')
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)
  // F26.4: com registos, a medida fica fixa para não misturar repetições com segundos.
  const medidaFixa = !!atual && temRegistos(atual.id, dados.sessoes)

  const alternar = (g: GrupoMuscular) => setSecundarios(secundarios.includes(g) ? secundarios.filter((x) => x !== g) : [...secundarios, g])

  function ler(): ExercicioProprio | string {
    if (!nome.trim()) return t('Indica o nome do exercício.')
    if (!grupo) return t('Escolhe o grupo muscular principal.')
    let incrementoKg: number | undefined
    if (tipo !== 'corporal' && incremento.trim() !== '') {
      incrementoKg = deUnidade(numero(incremento))
      if (!(incrementoKg >= 0.25 && incrementoKg <= 50)) return t('Indica o incremento em {u}, ou deixa vazio.', { u: unidadePeso() })
    }
    if (video.trim() && !lerVideo(video.trim())) return t('Link não aceite. Usa um link do YouTube ou do Vimeo.')
    return {
      id: atual?.id ?? novoIdProprio(novoId()),
      nome: nome.trim().slice(0, 80),
      medida,
      tipoCarga: tipo,
      grupoPrincipal: grupo,
      gruposSecundarios: GRUPOS_MUSCULARES.filter((g) => g !== grupo && secundarios.includes(g)),
      ...(incrementoKg === undefined ? {} : { incrementoKg }),
      comoFazer: comoFazer.split('\n').map((l) => l.trim().slice(0, 300)).filter(Boolean).slice(0, 20),
      ...(video.trim() ? { video: video.trim() } : {}),
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const novo = ler()
    if (typeof novo === 'string') return setErro(novo)
    setAGravar(true)
    try {
      await db.gravar('exerciciosProprios', guardarProprio(dados.proprios, novo))
      ir('/mais')
    } finally {
      setAGravar(false)
    }
  }

  async function apagar() {
    if (!atual) return
    const emPlano = noPlano(dados.plano, atual.id)
    const pergunta = emPlano
      ? t('Este exercício está no teu plano e continua lá até o tirares no editor do plano. Sai desta lista. Apagar?')
      : temRegistos(atual.id, dados.sessoes)
        ? t('Este exercício tem registos. Continua no histórico, mas sai da lista e de «Substituir exercício». Apagar?')
        : t('Apagar «{nome}»?', { nome: atual.nome })
    if (!confirm(pergunta)) return
    await db.gravar('exerciciosProprios', apagarProprio(dados.proprios, atual.id, dados.sessoes, emPlano))
    ir('/mais')
  }

  return (
    <form onSubmit={guardar} noValidate>
      <button type="button" onClick={() => ir('/mais')} style={{ marginTop: 12 }}>‹ {t('Mais')}</button>
      <h1>{atual ? t('Editar exercício') : t('Novo exercício')}</h1>

      <label htmlFor="proprio-nome">{t('Nome')}</label>
      <input id="proprio-nome" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />

      <label htmlFor="proprio-medida">{t('Medida')}</label>
      <select id="proprio-medida" value={medida} disabled={medidaFixa} onChange={(e) => setMedida(e.target.value as Medida)}>
        <option value="reps">{t('Repetições')}</option>
        <option value="segundos">{t('Segundos')}</option>
      </select>
      {medidaFixa && <p className="secundario">{t('Já tem registos: a medida não pode mudar.')}</p>}

      <label htmlFor="proprio-carga">{t('Como contas o peso?')}</label>
      <select id="proprio-carga" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCargaProprio)}>
        {TIPOS_CARGA_PROPRIOS.map((x) => <option key={x} value={x}>{nomeTipoCarga(x)}</option>)}
      </select>

      <label htmlFor="proprio-grupo">{t('Grupo muscular principal')}</label>
      <select id="proprio-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoMuscular)}>
        <option value="" disabled>{t('Escolhe…')}</option>
        {GRUPOS_MUSCULARES.map((g) => <option key={g} value={g}>{NOMES_GRUPOS[g]}</option>)}
      </select>

      <label id="proprio-secundarios">{t('Grupos secundários (opcional)')}</label>
      <div className="grupos-escolha" role="group" aria-labelledby="proprio-secundarios">
        {GRUPOS_MUSCULARES.filter((g) => g !== grupo).map((g) => (
          <button key={g} type="button" aria-pressed={secundarios.includes(g)} className={secundarios.includes(g) ? 'primario' : ''} onClick={() => alternar(g)}>{NOMES_GRUPOS[g]}</button>
        ))}
      </div>
      <p className="secundario">{t('Contam meia série no volume semanal.')}</p>

      {tipo !== 'corporal' && (
        <>
          <label htmlFor="proprio-incremento">{t('Incremento de carga ({u}, opcional)', { u: unidadePeso() })}</label>
          <input id="proprio-incremento" inputMode="decimal" placeholder={paraCampo(incrementoPadrao(tipo))} value={incremento} onChange={(e) => setIncremento(e.target.value)} />
          <p className="secundario">{t('Quanto sobe a carga quando chegas ao topo da faixa. Vazio: {valor}.', { valor: `${paraCampo(incrementoPadrao(tipo))} ${unidadePeso()}` })}</p>
        </>
      )}

      <label htmlFor="proprio-como">{t('Como fazer (opcional, um ponto por linha)')}</label>
      <textarea id="proprio-como" rows={4} value={comoFazer} onChange={(e) => setComoFazer(e.target.value)} />

      <label htmlFor="proprio-video">{t('Link do vídeo (opcional)')}</label>
      <input id="proprio-video" type="url" inputMode="url" placeholder="https://www.youtube.com/…" value={video} onChange={(e) => setVideo(e.target.value)} />

      {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      <button type="submit" className="primario largo" style={{ marginTop: 16 }} disabled={aGravar}>{t('Guardar')}</button>
      {atual && <button type="button" className="perigo largo" style={{ marginTop: 8 }} onClick={apagar}>{t('Apagar exercício')}</button>}
    </form>
  )
}
