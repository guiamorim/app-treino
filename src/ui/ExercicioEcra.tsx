import { useRef, useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { estadoBloco } from '../domain/blocos'
import { equipamentoDisponivel, motivoIncompatibilidade, prescricaoEfetiva, semanaDoPlano } from '../domain/plano'
import { sugerir } from '../domain/progressao'
import { estadoExercicio, historicoExercicio, registoDe } from '../domain/sessao'
import { NOMES_AREAS, NOMES_GRUPOS, NOMES_NIVEIS, type Plano, type Serie } from '../domain/types'
import { AvisoResponsabilidade } from './AvisoResponsabilidade'
import { lerVideo, pesquisaYoutube } from '../domain/video'
import { abrirSessao, alterarRegisto, sessaoAberta } from './acoes'
import { admitePesoExtra, incrementoDaForma, mesmaForma, nomeTipoCarga, rotuloCarga, semCarga as semCargaDe, tipoCarga, tiposCarga, totalComBarra, type TipoCarga } from '../domain/carga'
import { desdeQuando, diasEntre, mudarDegrau, posicaoNaEscada } from '../domain/escadas'
import { RESERVAS, reservaAlvo, rotuloReserva, textoReserva } from '../domain/reserva'
import { decimal, deUnidade, paraCampo, paraUnidade, peso, unidadePeso } from '../domain/unidades'
import { agoraIso, catalogo, hojeIso, type Dados } from './dados'
import { substitutosProprios } from '../domain/proprios'
import { anamneseEmFerias, feriasAtivas } from '../domain/ferias'
import { ir } from './rota'
import { Corpo } from './Corpo'
import { iniciarDescanso, prepararSom } from './descanso'
import { VideoModal } from './Video'
import { t } from '../i18n'

const numero = (s: string) => Number(s.replace(',', '.'))
const RIRS = [0, 1, 2, 3, 4, 5] as const
/** F23.2: o 0 é a falha. */
const textoRir = (n: number) => (n === 0 ? t('0 (falha)') : n === 5 ? '5+' : String(n))

/** Valida os campos de uma série (F22.9: a carga escreve-se na unidade escolhida e guarda-se em quilos). Devolve a série ou a mensagem de erro. */
/** O esforço é o RIR, ou a reserva em segundos nos exercícios por tempo (F23.1). */
/** F24.4: com `barraKg`, a carga escrita são os discos de cada lado e guarda-se o total com a barra. */
function lerSerie(carga: string, reps: string, esforco: number | undefined, semCarga: boolean, emSegundos: boolean, barraKg?: number): Serie | string {
  const escrita = deUnidade(numero(carga))
  const c = semCarga ? 0 : barraKg === undefined ? escrita : escrita >= 0 ? totalComBarra(barraKg, escrita) : NaN
  const r = numero(reps)
  if (!(r > 0 && r <= 1000 && Number.isInteger(r))) return emSegundos ? t('Indica os segundos.') : t('Indica as repetições.')
  if (!(c >= 0 && c <= 1000)) return t('Indica a carga em {u}.', { u: unidadePeso() })
  return { carga: c, reps: r, ...(esforco === undefined ? {} : emSegundos ? { reservaSeg: esforco } : { rir: esforco }) }
}

export function ExercicioEcra({ dados, plano, prescricaoId }: { dados: Dados; plano: Plano; prescricaoId: string }) {
  const treino = plano.treinos.find((x) => x.prescricoes.some((p) => p.id === prescricaoId))
  const p = treino?.prescricoes.find((x) => x.id === prescricaoId)
  if (!treino || !p) {
    return <><h1>{t('Exercício não encontrado')}</h1><button onClick={() => ir('/hoje')}>{t('Voltar')}</button></>
  }
  const sessao = sessaoAberta(dados.sessoes, plano, treino.id)
  const reg = sessao ? registoDe(sessao, p.id) : undefined
  const ex = (reg && catalogo.get(reg.exercicioId)) ?? catalogo.get(prescricaoEfetiva(p, plano, semanaDoPlano(plano, agoraIso())).exercicioId)!
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
  // F29.3: nas férias, os substitutos e o equipamento seguem o das férias.
  const anamneseAgora = dados.anamnese && feriasAtivas(dados.ferias, hojeIso()) ? anamneseEmFerias(dados.anamnese, dados.ferias!) : dados.anamnese
  const possivel = (x: typeof ex) => !anamneseAgora || !motivoIncompatibilidade(x, anamneseAgora)
  // F24: como se conta o peso; a sugestão só compara sessões contadas da mesma forma. F30.7: por omissão, o equipamento que tenho.
  const tipos = tiposCarga(ex)
  const tipo = tipoCarga(ex, dados.tiposCarga, anamneseAgora && equipamentoDisponivel(anamneseAgora))
  const semCarga = semCargaDe(ex, tipo)
  // F30.2: a escada aparece quando o exercício é feito sem carga ou com peso extra.
  const posicao = semCarga || tipo === 'peso-extra' ? posicaoNaEscada(ex, catalogo, possivel) : undefined
  const desde = posicao && desdeQuando(dados.degraus, ex.id, dados.sessoes)
  const historico = mesmaForma(historicoExercicio(dados.sessoes, ex.id, sessao?.id), ex, tipo)
  const descarga = estadoBloco(plano, semanaAtual).fase === 'descarga'
  const sugestao = sugerir({
    prescricao: ef,
    exercicio: { ...ex, incrementoKg: incrementoDaForma(ex, tipo) },
    historico,
    readaptacao: plano.readaptacao,
    descarga,
    ...(tipo === 'halter' && dados.anamnese?.halteresMaxKg ? { cargaMaxKg: dados.anamnese.halteresMaxKg } : {}),
    ...(posicao ? { escada: { ...(posicao.anterior ? { anterior: posicao.anterior } : {}), ...(posicao.seguinte ? { seguinte: posicao.seguinte } : {}), ...(desde ? { diasNoDegrau: diasEntre(desde, hojeIso()) } : {}), pesoExtra: admitePesoExtra(ex) } } : {}),
  })
  const ultima = historico.at(-1)
  const emSegundos = ex.medida === 'segundos'

  const ultimaSerie = series.at(-1)
  const cargaInicial = ultimaSerie?.carga ?? sugestao.carga
  const [carga, setCarga] = useState(cargaInicial === null ? '' : paraCampo(cargaInicial))
  const [reps, setReps] = useState(String(ultimaSerie?.reps ?? sugestao.reps))
  const [esforco, setEsforco] = useState<number | undefined>(undefined)
  const [porLado, setPorLado] = useState(false)
  const [verVideo, setVerVideo] = useState(false)
  const [trocar, setTrocar] = useState(false)
  const [erro, setErro] = useState('')
  // Estado local: a gravação é assíncrona e o controlo não pode esperar por ela.
  const [dor, setDor] = useState(reg?.dor ?? 0)
  // F22.10 e F22.11: série em correção e última série apagada (para «Desfazer»).
  const [aCorrigir, setACorrigir] = useState<number | null>(null)
  const [apagada, setApagada] = useState<{ serie: Serie; i: number } | null>(null)

  const linkVideo = dados.videos[ex.id] ?? ex.video
  const video = linkVideo ? lerVideo(linkVideo) : null
  const substitutos = [
    ...[...new Set([base.id, ...base.substitutos, ...ex.substitutos])]
      .filter((id) => id !== ex.id)
      .map((id) => catalogo.get(id)!)
      .filter((s) => anamneseAgora && possivel(s)),
    // F26.3: os exercícios próprios do mesmo grupo e medida; quem os criou sabe se os pode fazer.
    ...substitutosProprios(dados.proprios, base).filter((id) => id !== ex.id).map((id) => catalogo.get(id)!),
  ]

  // F22.2: um toque duplo não grava duas vezes. A referência bloqueia já; o estado desativa os botões.
  const ocupado = useRef(false)
  const [aGravar, setAGravar] = useState(false)
  async function umaVez(acao: () => Promise<void>) {
    if (ocupado.current) return
    ocupado.current = true
    setAGravar(true)
    try {
      await acao()
    } finally {
      ocupado.current = false
      setAGravar(false)
    }
  }

  const alterar = async (f: Parameters<typeof alterarRegisto>[3]) => {
    const s = await abrirSessao(dados.sessoes, plano, treino.id)
    await alterarRegisto(s.id, p.id, ex.id, f)
  }
  const gravar = (f: Parameters<typeof alterarRegisto>[3]) => umaVez(() => alterar(f))

  const concluirSerie = () => {
    prepararSom()
    return gravarSerie()
  }
  const gravarSerie = () => umaVez(async () => {
    const serie = lerSerie(carga, reps, esforco, semCarga, emSegundos, porLado && tipo === 'total' ? dados.barraKg : undefined)
    if (typeof serie === 'string') return void setErro(serie)
    setErro('')
    await alterar((x) => ({ ...x, ...(tipo ? { tipoCarga: tipo } : {}), series: [...x.series, serie] }))
    if (porLado) setCarga(String(Math.round(paraUnidade((serie.carga - dados.barraKg) / 2) * 10) / 10))
    setEsforco(undefined)
    setApagada(null)
    if (series.length + 1 < ef.series) iniciarDescanso(ef.descansoSeg)
  })

  const apagar = (i: number) => umaVez(async () => {
    const serie = series[i]
    if (!serie) return
    await alterar((x) => ({ ...x, series: x.series.filter((_, j) => j !== i), concluido: false }))
    setACorrigir(null)
    setApagada({ serie, i })
  })
  const desfazerApagar = () => umaVez(async () => {
    if (!apagada) return
    await alterar((x) => ({ ...x, series: [...x.series.slice(0, apagada.i), apagada.serie, ...x.series.slice(apagada.i)] }))
    setApagada(null)
  })
  const corrigir = (i: number, serie: Serie) => umaVez(async () => {
    await alterar((x) => ({ ...x, series: x.series.map((s, j) => (j === i ? serie : s)) }))
    setACorrigir(null)
  })

  function mudarDor(valor: number) {
    setDor(valor)
    void alterar((x) => ({ ...x, dor: valor }))
  }

  /** F24.2: a escolha fica para as sessões seguintes; o registo aberto passa a contar da mesma forma. */
  async function mudarTipo(novo: TipoCarga) {
    await db.gravar('tiposCarga', { ...dados.tiposCarga, [ex.id]: novo })
    if (reg) await alterar((x) => ({ ...x, tipoCarga: novo }))
    if (novo !== 'total') setPorLado(false)
  }

  /** F24.4: troca entre o total e os discos de cada lado, convertendo o que está escrito. */
  function mudarPorLado(ligar: boolean) {
    const escrita = deUnidade(numero(carga))
    if (carga.trim() !== '' && escrita >= 0) {
      const novo = ligar ? (escrita - dados.barraKg) / 2 : totalComBarra(dados.barraKg, escrita)
      setCarga(novo >= 0 ? paraCampo(novo) : '')
    }
    setPorLado(ligar)
  }
  const ladoKg = deUnidade(numero(carga))

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

  /** F30.2: muda o degrau (fica guardado) e troca já o exercício de hoje. */
  async function mudarVariacao(id: string) {
    if (series.length > 0 && !confirm(t('Já registaste séries neste exercício. Trocar apaga-as. Continuar?'))) return
    await db.gravar('degraus', mudarDegrau(dados.degraus, ex.id, id, hojeIso()))
    if (reg) await alterarRegisto(sessao!.id, p.id, id, (x) => ({ prescricaoId: x.prescricaoId, exercicioId: id, series: [] }))
  }

  const semana = semanaDoPlano(plano, agoraIso())
  const proximo = treino.prescricoes.find(
    (x) => x.id !== p.id && sessao && !['feito', 'saltado'].includes(estadoExercicio(registoDe(sessao, x.id), prescricaoEfetiva(x, plano, semana))),
  )
  const unidade = emSegundos ? 's' : 'reps'

  return (
    <>
      <button onClick={() => ir('/hoje')} style={{ marginTop: 12 }}>‹ {treino.nome}</button>
      <h1>{ex.nome}</h1>
      <p>
        <span className="chip">{NOMES_GRUPOS[ex.grupoPrincipal]}</span>{' '}
        <span className="secundario">{ex.gruposSecundarios.map((g) => NOMES_GRUPOS[g]).join(' · ')}</span>
        {ex.nivel && <>{' '}<span className="chip">{t('Nível: {nivel}', { nivel: NOMES_NIVEIS[ex.nivel] })}</span></>}
      </p>
      {ef.nota && ex.id === ef.exercicioId && <p className="secundario">{ef.nota}</p>}

      <div className={`cartao ${sugestao.alerta === 'parar' ? 'perigo-borda' : sugestao.alerta ? 'aviso' : ''}`}>
        <h3>{t('Hoje:')} {ef.series} × {ef.faixa[0]}–{ef.faixa[1]} {unidade} · {emSegundos ? t('reserva +{a}–{b} s', { a: reservaAlvo(ef.rir)[0], b: reservaAlvo(ef.rir)[1] }) : `RIR ${ef.rir[0]}–${ef.rir[1]}`}</h3>
        <p>
          <strong>{t('Sugestão:')} {sugestao.carga !== null && !semCarga ? `${peso(sugestao.carga)} × ` : ''}{sugestao.reps} {unidade}</strong>
        </p>
        <p className="secundario">{sugestao.motivo}</p>
        {sugestao.variacao && (
          <button className="primario largo" disabled={aGravar} onClick={() => void mudarVariacao(sugestao.variacao!.exercicioId)}>
            {sugestao.variacao.sentido === 'subir' ? t('Passar para «{nome}»', { nome: sugestao.variacao.nome }) : t('Voltar a «{nome}»', { nome: sugestao.variacao.nome })}
          </button>
        )}
        {ultima && (
          <p className="secundario">
            {t('Última vez:')} {semCarga ? '' : `${peso(ultima.series[0]!.carga)} × `}{ultima.series.map((s) => s.reps).join(', ')}{ultima.dor ? ` · ${t('dor')} ${ultima.dor}/10` : ''}
          </p>
        )}
        <p className="secundario">{emSegundos ? t('Reserva = segundos que ainda aguentavas no fim da série.') : t('RIR = repetições que ainda conseguias fazer no fim da série. 0 = até à falha.')}</p>
      </div>

      {series.length > 0 && (
        <div className="cartao">
          <div className="series">
            <strong>#</strong><strong>{semCarga ? '' : unidadePeso()}</strong><strong>{unidade}</strong><strong>{emSegundos ? t('Reserva') : 'RIR'}</strong><span />
            {series.map((s, i) =>
              aCorrigir === i ? (
                <CorrigirSerie key={i} n={i + 1} s={s} tipo={tipo} semCarga={semCarga} emSegundos={emSegundos} ocupado={aGravar} guardar={(nova) => corrigir(i, nova)} cancelar={() => setACorrigir(null)} />
              ) : (
                <Linha key={i} n={i + 1} s={s} semCarga={semCarga} emSegundos={emSegundos} ocupado={aGravar} corrigir={() => setACorrigir(i)} apagar={() => apagar(i)} />
              ),
            )}
          </div>
        </div>
      )}
      {apagada && (
        <div className="cartao linha" role="status">
          <span>{t('Série {n} apagada.', { n: apagada.i + 1 })}</span>
          <button style={{ flex: 'none' }} disabled={aGravar} onClick={desfazerApagar}>{t('Desfazer')}</button>
        </div>
      )}

      {estado === 'saltado' ? (
        <div className="cartao">
          <p>{t('Exercício saltado.')}</p>
          <button disabled={aGravar} onClick={() => gravar((x) => ({ ...x, saltado: false }))}>{t('Desfazer')}</button>
        </div>
      ) : estado === 'feito' ? (
        <div className="cartao ok-borda">
          <p><strong>{t('Exercício feito')} ✓</strong></p>
          <div className="linha">
            <button onClick={() => gravar((x) => ({ ...x, concluido: false, series: x.series }))} disabled={aGravar || series.length >= ef.series}>{t('Mais uma série')}</button>
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
          {tipos.length > 1 && (
            <>
              <label htmlFor="tipo-carga">{t('Como contas o peso?')}</label>
              <select id="tipo-carga" value={tipo} onChange={(e) => void mudarTipo(e.target.value as TipoCarga)}>
                {tipos.map((x) => <option key={x} value={x}>{nomeTipoCarga(x)}</option>)}
              </select>
            </>
          )}
          <div className="linha" style={{ alignItems: 'flex-end' }}>
            {!semCarga && (
              <div><label htmlFor="carga">{porLado ? t('Discos por lado ({u})', { u: unidadePeso() }) : rotuloCarga(tipo)}</label><input id="carga" inputMode="decimal" value={carga} onChange={(e) => setCarga(e.target.value)} /></div>
            )}
            <div><label htmlFor="reps">{emSegundos ? t('Segundos') : t('Repetições')}</label><input id="reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></div>
          </div>
          {tipo === 'total' && (
            <label className="escolha-lado">
              <input type="checkbox" checked={porLado} onChange={(e) => mudarPorLado(e.target.checked)} /> {t('Escrever discos por lado')}
            </label>
          )}
          {porLado && tipo === 'total' && carga.trim() !== '' && ladoKg >= 0 && (
            <p className="secundario" role="status">{t('{barra} barra + 2 × {lado} = {total}', { barra: peso(dados.barraKg), lado: peso(ladoKg), total: peso(totalComBarra(dados.barraKg, ladoKg)) })}</p>
          )}
          <label id="titulo-esforco">{emSegundos ? t('Reserva (opcional)') : t('RIR (opcional)')}</label>
          <div className="linha escolha-esforco" role="radiogroup" aria-labelledby="titulo-esforco">
            {(emSegundos ? RESERVAS : RIRS).map((n) => (
              <button key={n} role="radio" aria-checked={esforco === n} aria-label={emSegundos ? textoReserva(n) : textoRir(n)} className={esforco === n ? 'primario' : ''} onClick={() => setEsforco(esforco === n ? undefined : n)}>
                {emSegundos ? rotuloReserva(n) : n === 5 ? '5+' : n}
                {!emSegundos && n === 0 && <small>{t('falha')}</small>}
              </button>
            ))}
          </div>
          {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
          <button className="primario largo" style={{ marginTop: 12 }} onClick={concluirSerie} disabled={aGravar}>{t('Concluir série')}</button>
          <div className="linha" style={{ marginTop: 8 }}>
            {series.length > 0 && <button disabled={aGravar} onClick={() => gravar((x) => ({ ...x, concluido: true }))}>{t('Terminar exercício')}</button>}
            <button disabled={aGravar} onClick={() => gravar((x) => ({ ...x, saltado: true }))}>{t('Saltar')}</button>
          </div>
        </div>
      )}

      <div className="cartao">
        <label htmlFor="dor">{t('Dor ou desconforto neste exercício: {dor}/10', { dor })}</label>
        <input id="dor" type="range" min={0} max={10} value={dor} aria-valuetext={t('{dor} de 10', { dor })} onChange={(e) => mudarDor(Number(e.target.value))} />
        {dor >= 7 && <p role="alert" style={{ color: 'var(--perigo)' }}>{t('Dor forte: para este exercício hoje e procura avaliação de um profissional de saúde.')}</p>}
        {dor >= 4 && dor < 7 && <p className="secundario">{t('Dor moderada: não subas a carga; considera trocar de exercício.')}</p>}
      </div>

      {posicao && posicao.total > 1 && (
        <div className="cartao">
          <p className="secundario">{t('Escada «{nome}»: degrau {n} de {total}', { nome: posicao.escada.nome, n: posicao.degrau, total: posicao.total })}</p>
          <div className="linha">
            {posicao.anterior && <button disabled={aGravar} onClick={() => void mudarVariacao(posicao.anterior!.id)}>{t('Mais fácil: {nome}', { nome: posicao.anterior.nome })}</button>}
            {posicao.seguinte && <button disabled={aGravar} onClick={() => void mudarVariacao(posicao.seguinte!.id)}>{t('Mais difícil: {nome}', { nome: posicao.seguinte.nome })}</button>}
          </div>
        </div>
      )}

      {/* F33.1: o registo vem primeiro; os músculos, a técnica e o vídeo abrem-se à parte (abertos na primeira vez). */}
      <details className="cartao" open={!ultima}>
        <summary>{t('Músculos, técnica e vídeo')}</summary>
        <Corpo ex={ex} sexo={dados.anamnese?.sexo} />
        {ex.objetivo && <p>{ex.objetivo}</p>}
        {ex.pontosChave.length > 0 && <ul>{ex.pontosChave.map((k) => <li key={k}>{k}</li>)}</ul>}
        {ex.contraindicacoes.length > 0 && <p className="secundario">{t('Cuidado se tiveres dor em: {zonas}.', { zonas: ex.contraindicacoes.map((a) => NOMES_AREAS[a]).join(', ') })}</p>}
        <div className="linha sem-quebra">
          {video ? (
            <button onClick={() => setVerVideo(true)}>▶ {t('Ver vídeo')}</button>
          ) : (
            <a className="botao" href={pesquisaYoutube(ex.nome)} target="_blank" rel="noopener noreferrer">{t('Procurar no YouTube')}</a>
          )}
          <button onClick={mudarVideo}>{t('Mudar vídeo')}</button>
        </div>
      </details>
      {verVideo && video && <VideoModal video={video} titulo={ex.nome} fechar={() => setVerVideo(false)} />}

      <button className="largo" onClick={() => setTrocar(!trocar)}>{t('Substituir exercício')}</button>
      {trocar && (
        <div className="cartao">
          {substitutos.length === 0 ? <p className="secundario">{t('Não há substitutos compatíveis com as tuas restrições e equipamento.')}</p> : (
            <ul className="lista">
              {substitutos.map((s) => (
                <li key={s.id}>
                  <button className="item" onClick={() => substituir(s.id)}>
                    <span className="corpo"><span className="titulo">{s.nome}</span>{s.objetivo && <><br /><span className="secundario">{s.objetivo}</span></>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <AvisoResponsabilidade />
    </>
  )
}

function Linha({ n, s, semCarga, emSegundos, ocupado, corrigir, apagar }: { n: number; s: Serie; semCarga: boolean; emSegundos: boolean; ocupado: boolean; corrigir: () => void; apagar: () => void }) {
  return (
    <>
      <span>{n}</span>
      <span>{semCarga ? '' : decimal(paraUnidade(s.carga))}</span>
      <span>{s.reps}</span>
      <span>{s.reservaSeg !== undefined ? textoReserva(s.reservaSeg) : s.rir === undefined ? '–' : emSegundos ? `RIR ${s.rir}` : s.rir}</span>
      <span className="acoes-serie">
        <button onClick={corrigir} disabled={ocupado} aria-label={t('Corrigir série {n}', { n })}>✎</button>
        <button onClick={apagar} disabled={ocupado} aria-label={t('Apagar série {n}', { n })}>✕</button>
      </span>
    </>
  )
}

/** F22.10: a linha da série passa a campos, validados como ao registar. */
function CorrigirSerie({ n, s, tipo, semCarga, emSegundos, ocupado, guardar, cancelar }: { n: number; s: Serie; tipo: TipoCarga | undefined; semCarga: boolean; emSegundos: boolean; ocupado: boolean; guardar: (s: Serie) => void; cancelar: () => void }) {
  const [carga, setCarga] = useState(paraCampo(s.carga))
  const [reps, setReps] = useState(String(s.reps))
  const inicial = emSegundos ? s.reservaSeg : s.rir
  const [esforco, setEsforco] = useState(inicial === undefined ? '' : String(inicial))
  const [erro, setErro] = useState('')
  function submeter(e: FormEvent) {
    e.preventDefault()
    const nova = lerSerie(carga, reps, esforco === '' ? undefined : Number(esforco), semCarga, emSegundos)
    if (typeof nova === 'string') return setErro(nova)
    // Registos antigos por tempo têm RIR (antes da F23.1): fica, a menos que se escolha uma reserva.
    guardar(emSegundos && s.rir !== undefined && nova.reservaSeg === undefined ? { ...nova, rir: s.rir } : nova)
  }
  return (
    <form className="corrigir-serie" onSubmit={submeter} noValidate aria-label={t('Corrigir série {n}', { n })}>
      <div className="linha">
        {!semCarga && <div><label htmlFor={`carga-${n}`}>{rotuloCarga(tipo)}</label><input id={`carga-${n}`} inputMode="decimal" value={carga} onChange={(e) => setCarga(e.target.value)} /></div>}
        <div><label htmlFor={`reps-${n}`}>{emSegundos ? t('Segundos') : t('Repetições')}</label><input id={`reps-${n}`} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></div>
        <div>
          <label htmlFor={`esforco-${n}`}>{emSegundos ? t('Reserva') : 'RIR'}</label>
          <select id={`esforco-${n}`} value={esforco} onChange={(e) => setEsforco(e.target.value)}>
            <option value="">–</option>
            {(emSegundos ? RESERVAS : RIRS).map((x) => <option key={x} value={x}>{emSegundos ? textoReserva(x) : textoRir(x)}</option>)}
          </select>
        </div>
      </div>
      {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      <div className="linha" style={{ marginTop: 8 }}>
        <button type="submit" className="primario" disabled={ocupado}>{t('Guardar')}</button>
        <button type="button" onClick={cancelar}>{t('Cancelar')}</button>
      </div>
    </form>
  )
}
