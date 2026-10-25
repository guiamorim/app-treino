import { useState } from 'react'
import { db } from '../data/db'
import { estadoBloco } from '../domain/blocos'
import { motivoIncompatibilidade, prescricaoEfetiva, semanaDoPlano } from '../domain/plano'
import { sugerir } from '../domain/progressao'
import { estadoExercicio, historicoExercicio, registoDe } from '../domain/sessao'
import { NOMES_AREAS, NOMES_GRUPOS, type Plano, type Serie } from '../domain/types'
import { lerVideo, pesquisaYoutube } from '../domain/video'
import { abrirSessao, alterarRegisto, sessaoAberta } from './acoes'
import { agoraIso, catalogo, kg, type Dados } from './dados'
import { ir } from './rota'
import { Corpo } from './Corpo'
import { Temporizador } from './Temporizador'
import { VideoModal } from './Video'
import { t } from '../i18n'

const numero = (s: string) => Number(s.replace(',', '.'))

export function ExercicioEcra({ dados, plano, prescricaoId }: { dados: Dados; plano: Plano; prescricaoId: string }) {
  const treino = plano.treinos.find((x) => x.prescricoes.some((p) => p.id === prescricaoId))
  const p = treino?.prescricoes.find((x) => x.id === prescricaoId)
  if (!treino || !p) {
    return <><h1>{t('Exercício não encontrado')}</h1><button onClick={() => ir('/hoje')}>{t('Voltar')}</button></>
  }
  const sessao = sessaoAberta(dados.sessoes, plano, treino.id)
  const reg = sessao ? registoDe(sessao, p.id) : undefined
  const ex = catalogo.get(reg?.exercicioId ?? prescricaoEfetiva(p, plano, semanaDoPlano(plano, agoraIso())).exercicioId)!
  return <Registo key={`${p.id}-${ex.id}`} dados={dados} plano={plano} treinoId={treino.id} prescricaoId={p.id} exercicioId={ex.id} />
}

function Registo({ dados, plano, treinoId, prescricaoId, exercicioId }: { dados: Dados; plano: Plano; treinoId: string; prescricaoId: string; exercicioId: string }) {
  const treino = plano.treinos.find((x) => x.id === treinoId)!
  const p = treino.prescricoes.find((x) => x.id === prescricaoId)!
  const ex = catalogo.get(exercicioId)!
  const semanaAtual = semanaDoPlano(plano, agoraIso())
  const ef = prescricaoEfetiva(p, plano, semanaAtual)
  const base = catalogo.get(ef.exercicioId)!
  const sessao = sessaoAberta(dados.sessoes, plano, treino.id)
  const reg = sessao ? registoDe(sessao, p.id) : undefined
  const series = reg?.series ?? []
  const estado = estadoExercicio(reg, ef)
  const historico = historicoExercicio(dados.sessoes, ex.id, sessao?.id)
  const descarga = estadoBloco(plano, semanaAtual).fase === 'descarga'
  const sugestao = sugerir({ prescricao: ef, exercicio: ex, historico, readaptacao: plano.readaptacao, descarga })
  const ultima = historico.at(-1)
  const emSegundos = ex.medida === 'segundos'
  const semCarga = ex.incrementoKg === 0

  const ultimaSerie = series.at(-1)
  const [carga, setCarga] = useState(String(ultimaSerie?.carga ?? sugestao.carga ?? ''))
  const [reps, setReps] = useState(String(ultimaSerie?.reps ?? sugestao.reps))
  const [rir, setRir] = useState<number | undefined>(undefined)
  const [descanso, setDescanso] = useState<number | null>(null)
  const [verVideo, setVerVideo] = useState(false)
  const [trocar, setTrocar] = useState(false)
  const [erro, setErro] = useState('')
  // Estado local: a gravação é assíncrona e o controlo não pode esperar por ela.
  const [dor, setDor] = useState(reg?.dor ?? 0)

  const linkVideo = dados.videos[ex.id] ?? ex.video
  const video = linkVideo ? lerVideo(linkVideo) : null
  const substitutos = [...new Set([base.id, ...base.substitutos, ...ex.substitutos])]
    .filter((id) => id !== ex.id)
    .map((id) => catalogo.get(id)!)
    .filter((s) => dados.anamnese && !motivoIncompatibilidade(s, dados.anamnese))

  const alterar = async (f: Parameters<typeof alterarRegisto>[3]) => {
    const s = await abrirSessao(dados.sessoes, plano, treino.id)
    await alterarRegisto(s.id, p.id, ex.id, f)
  }

  async function concluirSerie() {
    const c = semCarga ? 0 : numero(carga)
    const r = numero(reps)
    if (!(r > 0 && r <= 1000 && Number.isInteger(r))) return setErro(emSegundos ? t('Indica os segundos.') : t('Indica as repetições.'))
    if (!(c >= 0 && c <= 1000)) return setErro(t('Indica a carga em kg.'))
    setErro('')
    const serie: Serie = { carga: c, reps: r, ...(rir !== undefined ? { rir } : {}) }
    await alterar((x) => ({ ...x, series: [...x.series, serie] }))
    setRir(undefined)
    if (series.length + 1 < ef.series) setDescanso(Date.now() + ef.descansoSeg * 1000)
  }

  function mudarDor(valor: number) {
    setDor(valor)
    void alterar((x) => ({ ...x, dor: valor }))
  }

  async function mudarVideo() {
    const novo = prompt(t('Cola o link do vídeo (YouTube ou Vimeo). Deixa vazio para repor o original.'), dados.videos[ex.id] ?? '')
    if (novo === null) return
    const videos = { ...dados.videos }
    if (novo.trim() === '') delete videos[ex.id]
    else if (lerVideo(novo)) videos[ex.id] = novo.trim()
    else return alert(t('Link não aceite. Usa um link do YouTube ou do Vimeo.'))
    await db.gravar('videos', videos)
  }

  async function substituir(id: string) {
    if (series.length > 0 && !confirm(t('Já registaste séries neste exercício. Trocar apaga-as. Continuar?'))) return
    const s = await abrirSessao(dados.sessoes, plano, treino.id)
    await alterarRegisto(s.id, p.id, id, (x) => ({ prescricaoId: x.prescricaoId, exercicioId: id, series: [] }))
    setTrocar(false)
  }

  const semana = semanaDoPlano(plano, agoraIso())
  const proximo = treino.prescricoes.find(
    (x) => x.id !== p.id && sessao && !['feito', 'saltado'].includes(estadoExercicio(registoDe(sessao, x.id), prescricaoEfetiva(x, plano, semana))),
  )
  const unidade = emSegundos ? 's' : 'reps'

  return (
    <>
      {descanso && <Temporizador fimEm={descanso} fechar={() => setDescanso(null)} />}
      <button onClick={() => ir('/hoje')} style={{ marginTop: 12 }}>‹ {treino.nome}</button>
      <h1>{ex.nome}</h1>
      <p>
        <span className="chip">{NOMES_GRUPOS[ex.grupoPrincipal]}</span>{' '}
        <span className="secundario">{ex.gruposSecundarios.map((g) => NOMES_GRUPOS[g]).join(' · ')}</span>
      </p>
      <Corpo ex={ex} sexo={dados.anamnese?.sexo} />
      <p>{ex.objetivo}</p>
      {ef.nota && ex.id === ef.exercicioId && <p className="secundario">{ef.nota}</p>}

      <div className="linha">
        {video ? (
          <button onClick={() => setVerVideo(true)}>▶ {t('Ver vídeo')}</button>
        ) : (
          <a className="botao" href={pesquisaYoutube(ex.nome)} target="_blank" rel="noopener noreferrer">{t('Procurar no YouTube')}</a>
        )}
        <button onClick={mudarVideo}>{t('Mudar vídeo')}</button>
      </div>
      {verVideo && video && <VideoModal video={video} titulo={ex.nome} fechar={() => setVerVideo(false)} />}

      <details className="cartao">
        <summary>{t('Como fazer')}</summary>
        <ul>{ex.pontosChave.map((k) => <li key={k}>{k}</li>)}</ul>
        {ex.contraindicacoes.length > 0 && <p className="secundario">{t('Cuidado se tiveres dor em: {zonas}.', { zonas: ex.contraindicacoes.map((a) => NOMES_AREAS[a]).join(', ') })}</p>}
      </details>

      <div className={`cartao ${sugestao.alerta === 'parar' ? 'perigo-borda' : sugestao.alerta ? 'aviso' : ''}`}>
        <h3>{t('Hoje:')} {ef.series} × {ef.faixa[0]}–{ef.faixa[1]} {unidade} · RIR {ef.rir[0]}–{ef.rir[1]}</h3>
        <p>
          <strong>{t('Sugestão:')} {sugestao.carga !== null && !semCarga ? `${kg(sugestao.carga)} kg × ` : ''}{sugestao.reps} {unidade}</strong>
        </p>
        <p className="secundario">{sugestao.motivo}</p>
        {ultima && (
          <p className="secundario">
            {t('Última vez:')} {semCarga ? '' : `${kg(ultima.series[0]!.carga)} kg × `}{ultima.series.map((s) => s.reps).join(', ')}{ultima.dor ? ` · ${t('dor')} ${ultima.dor}/10` : ''}
          </p>
        )}
        <p className="secundario">{t('RIR = repetições que ainda conseguias fazer no fim da série.')}</p>
      </div>

      {series.length > 0 && (
        <div className="cartao">
          <div className="series">
            <strong>#</strong><strong>{semCarga ? '' : 'kg'}</strong><strong>{unidade}</strong><strong>RIR</strong><span />
            {series.map((s, i) => (
              <Linha key={i} n={i + 1} s={s} semCarga={semCarga} apagar={() => alterar((x) => ({ ...x, series: x.series.filter((_, j) => j !== i), concluido: false }))} />
            ))}
          </div>
        </div>
      )}

      {estado === 'saltado' ? (
        <div className="cartao">
          <p>{t('Exercício saltado.')}</p>
          <button onClick={() => alterar((x) => ({ ...x, saltado: false }))}>{t('Desfazer')}</button>
        </div>
      ) : estado === 'feito' ? (
        <div className="cartao ok-borda">
          <p><strong>{t('Exercício feito')} ✓</strong></p>
          <div className="linha">
            <button onClick={() => alterar((x) => ({ ...x, concluido: false, series: x.series }))} disabled={series.length >= ef.series}>{t('Mais uma série')}</button>
            {proximo ? (
              <button className="primario" onClick={() => ir(`/exercicio/${encodeURIComponent(proximo.id)}`)}>{t('Próximo exercício')}</button>
            ) : (
              <button className="primario" onClick={() => ir('/hoje')}>{t('Voltar ao treino')}</button>
            )}
          </div>
        </div>
      ) : (
        <div className="cartao">
          <h3>{t('Série {n} de {total}', { n: series.length + 1, total: ef.series })}</h3>
          <div className="linha">
            {!semCarga && (
              <div><label htmlFor="carga">{t('Carga (kg)')}</label><input id="carga" inputMode="decimal" value={carga} onChange={(e) => setCarga(e.target.value)} /></div>
            )}
            <div><label htmlFor="reps">{emSegundos ? t('Segundos') : t('Repetições')}</label><input id="reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></div>
          </div>
          <label>{t('RIR (opcional)')}</label>
          <div className="linha" role="radiogroup" aria-label="RIR">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={rir === n} className={rir === n ? 'primario' : ''} onClick={() => setRir(rir === n ? undefined : n)} style={{ minWidth: 44, padding: 6 }}>
                {n === 5 ? '5+' : n}
              </button>
            ))}
          </div>
          {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
          <button className="primario largo" style={{ marginTop: 12 }} onClick={concluirSerie}>{t('Concluir série')}</button>
          <div className="linha" style={{ marginTop: 8 }}>
            {series.length > 0 && <button onClick={() => alterar((x) => ({ ...x, concluido: true }))}>{t('Terminar exercício')}</button>}
            <button onClick={() => alterar((x) => ({ ...x, saltado: true }))}>{t('Saltar')}</button>
          </div>
        </div>
      )}

      <div className="cartao">
        <label htmlFor="dor">{t('Dor ou desconforto neste exercício: {dor}/10', { dor })}</label>
        <input id="dor" type="range" min={0} max={10} value={dor} onChange={(e) => mudarDor(Number(e.target.value))} />
        {dor >= 7 && <p role="alert" style={{ color: 'var(--perigo)' }}>{t('Dor forte: para este exercício hoje e procura avaliação de um profissional de saúde.')}</p>}
        {dor >= 4 && dor < 7 && <p className="secundario">{t('Dor moderada: não subas a carga; considera trocar de exercício.')}</p>}
      </div>

      <button className="largo" onClick={() => setTrocar(!trocar)}>{t('Substituir exercício')}</button>
      {trocar && (
        <div className="cartao">
          {substitutos.length === 0 ? <p className="secundario">{t('Não há substitutos compatíveis com as tuas restrições e equipamento.')}</p> : (
            <ul className="lista">
              {substitutos.map((s) => (
                <li key={s.id}>
                  <button className="item" onClick={() => substituir(s.id)}>
                    <span className="corpo"><span className="titulo">{s.nome}</span><br /><span className="secundario">{s.objetivo}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function Linha({ n, s, semCarga, apagar }: { n: number; s: Serie; semCarga: boolean; apagar: () => void }) {
  return (
    <>
      <span>{n}</span>
      <span>{semCarga ? '' : kg(s.carga)}</span>
      <span>{s.reps}</span>
      <span>{s.rir ?? '–'}</span>
      <button onClick={apagar} aria-label={t('Apagar série {n}', { n })} style={{ minHeight: 36, padding: '4px 10px' }}>✕</button>
    </>
  )
}
