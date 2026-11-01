import { useState } from 'react'
import { parabens as calcularParabens, type Parabens } from '../domain/parabens'
import { semanaDoPlano, treinoEfetivo } from '../domain/plano'
import { estadoExercicio, estadoSessao, proximoTreino, registoDe } from '../domain/sessao'
import { NOMES_GRUPOS, type Anamnese, type EstadoExercicio, type Plano } from '../domain/types'
import { abrirSessao, sessaoAberta, terminarSessao } from './acoes'
import { agoraIso, catalogo, dataCurta, type Dados } from './dados'
import { LembreteAlongamento } from './Alongamento'
import { CartaoNivelamento } from './Nivelamento'
import { textoFase } from './Fase'
import { ir } from './rota'
import { BotaoReportar } from './Reportar'
import { BotaoCardio, textoCardio } from './Cardio'
import { JanelaParabens } from './Parabens'
import { instalada, SugestaoInstalar } from './Instalar'
import { m, t, traduzido } from '../i18n'

const ICONES: Record<EstadoExercicio, string> = { 'por-fazer': '', 'em-curso': '•', feito: '✓', saltado: '–' }
const NOMES_ESTADO: Record<EstadoExercicio, string> = traduzido({ 'por-fazer': m('por fazer'), 'em-curso': m('em curso'), feito: m('feito'), saltado: m('saltado') })

export function Hoje({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  const proximo = proximoTreino(plano, dados.sessoes)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [parabens, setParabens] = useState<Parabens | null>(null)
  const treinoId = escolhido ?? proximo.treinoId
  const semana = semanaDoPlano(plano, agoraIso())
  const treino = treinoEfetivo(plano.treinos.find((x) => x.id === treinoId) ?? plano.treinos[0]!, plano, semana)
  const sessao = sessaoAberta(dados.sessoes, plano, treino.id)
  const estado = sessao ? estadoSessao(sessao, treino) : undefined
  const ultimaTerminada = dados.sessoes.filter((s) => s.fim).at(-1)

  const cardioFeito = sessao ? dados.cardio.filter((c) => c.sessaoId === sessao.id) : []

  async function abrirCardio() {
    const s = await abrirSessao(dados.sessoes, plano, treino.id)
    ir(`/cardio/${encodeURIComponent(s.id)}`)
  }

  async function abrir(prescricaoId: string) {
    await abrirSessao(dados.sessoes, plano, treino.id)
    ir(`/exercicio/${encodeURIComponent(prescricaoId)}`)
  }

  async function terminar() {
    if (!sessao) return
    if (!estado?.completa && !confirm(t('Ainda há exercícios por fazer. Terminar o treino mesmo assim?'))) return
    const fim = agoraIso()
    await terminarSessao(sessao.id, fim)
    setEscolhido(null)
    // F35.4: as metas comparam o histórico sem e com este treino.
    if (dados.parabens) {
      const sessoes = dados.sessoes.map((x) => (x.id === sessao.id ? { ...x, fim } : x))
      setParabens(calcularParabens(sessoes, sessao.id, dados.planoBase ?? plano, anamnese.diasPorSemana, new Date(fim)))
    }
  }

  return (
    <>
      <LembreteAlongamento dados={dados} anamnese={anamnese} />
      <CartaoNivelamento dados={dados} plano={dados.planoBase ?? plano} anamnese={anamnese} />
      <h1>{treino.nome}</h1>
      <p className="secundario">~{treino.duracaoEstimadaMin} min · {textoFase(plano, semana)}</p>
      {treino.sintese && <p>{treino.sintese}</p>}

      {plano.avisos.length > 0 && (
        <details className="cartao aviso">
          <summary>⚠️ {plano.avisos.length === 1 ? t('1 aviso sobre o teu plano') : t('{n} avisos sobre o teu plano', { n: plano.avisos.length })}</summary>
          {plano.avisos.map((a) => <p key={a}>{a}</p>)}
        </details>
      )}

      {estado?.completa && (
        <div className="cartao ok-borda" role="status">
          <h3>{t('Treino completo')} 🎉</h3>
          {estado.saltados > 0 && <p className="secundario">{t('{n} exercício(s) saltado(s).', { n: estado.saltados })}</p>}
          <button className="primario largo" onClick={terminar}>{t('Terminar treino')}</button>
        </div>
      )}

      <div className="cartao">
        <ul className="lista">
          {treino.prescricoes.map((p) => {
            const reg = sessao ? registoDe(sessao, p.id) : undefined
            const ex = (reg && catalogo.get(reg.exercicioId)) ?? catalogo.get(p.exercicioId)!
            const e = estadoExercicio(reg, p)
            const unidade = ex.medida === 'segundos' ? 's' : ''
            return (
              <li key={p.id}>
                <button className="item" onClick={() => abrir(p.id)}>
                  <span className={`estado ${e}`} aria-label={NOMES_ESTADO[e]}>{ICONES[e]}</span>
                  <span className="corpo">
                    <span className="titulo">{ex.nome}</span>
                    <br />
                    <span className="secundario">
                      {p.series} × {p.faixa[0]}–{p.faixa[1]}{unidade} · <span className="chip">{NOMES_GRUPOS[ex.grupoPrincipal]}</span>
                      {reg && reg.series.length > 0 && !reg.saltado && ` · ${reg.series.length}/${p.series}`}
                    </span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
          {treino.cardioMin && (
            <li>
              {/* F36.1: o cardio do plano abre o registo, com os minutos já preenchidos. */}
              <button className="item" onClick={() => abrirCardio()}>
                <span className={`estado ${cardioFeito.length ? 'feito' : 'por-fazer'}`} aria-label={cardioFeito.length ? NOMES_ESTADO.feito : NOMES_ESTADO['por-fazer']}>{cardioFeito.length ? '✓' : '♥'}</span>
                <span className="corpo">
                  <span className="titulo">{t('Cardio {min} min', { min: treino.cardioMin })}</span><br />
                  <span className="secundario">{cardioFeito.length ? cardioFeito.map(textoCardio).join('; ') : t('Intensidade moderada: consegues falar frases curtas.')}</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* F35.2: no Treino de hoje, depois da lista, para não empurrar o treino para fora do ecrã. */}
      {!dados.instalacaoVista && !instalada() && <SugestaoInstalar />}
      {sessao && !estado?.completa && <button className="largo" onClick={terminar}>{t('Terminar treino')}</button>}
      <div className="linha" style={{ marginTop: 8 }}>
        <button onClick={() => ir('/alongamento')}>🧘 {t('Alongamentos')}</button>
        <BotaoCardio sessaoId={sessao?.id} texto={sessao ? t('Acrescentar cardio') : undefined} largo={false} />
      </div>

      <label htmlFor="treino">{t('Fazer outro treino')}</label>
      <select id="treino" value={treino.id} onChange={(e) => setEscolhido(e.target.value)}>
        {plano.treinos.map((x) => (
          <option key={x.id} value={x.id}>{x.nome}{x.id === proximo.treinoId ? ` (${t('próximo')})` : ''}</option>
        ))}
      </select>
      {ultimaTerminada && (
        <p className="secundario">{t('Último treino: {treino}, {data}.', { treino: plano.treinos.find((x) => x.id === ultimaTerminada.treinoId)?.nome ?? t('plano anterior'), data: dataCurta(ultimaTerminada.inicio) })}</p>
      )}
      <BotaoReportar tipo="treino" id={treino.id} />
      {parabens && <JanelaParabens p={parabens} fechar={() => setParabens(null)} />}
    </>
  )
}
