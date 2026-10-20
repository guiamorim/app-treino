import { useState } from 'react'
import { semanaDoPlano, treinoEfetivo } from '../domain/plano'
import { estadoExercicio, estadoSessao, proximoTreino, registoDe } from '../domain/sessao'
import { NOMES_GRUPOS, type EstadoExercicio, type Plano } from '../domain/types'
import { abrirSessao, sessaoAberta, terminarSessao } from './acoes'
import { agoraIso, catalogo, dataCurta, type Dados } from './dados'
import { textoFase } from './Fase'
import { ir } from './rota'

const ICONES: Record<EstadoExercicio, string> = { 'por-fazer': '', 'em-curso': '•', feito: '✓', saltado: '–' }
const NOMES_ESTADO: Record<EstadoExercicio, string> = { 'por-fazer': 'por fazer', 'em-curso': 'em curso', feito: 'feito', saltado: 'saltado' }

export function Hoje({ dados, plano }: { dados: Dados; plano: Plano }) {
  const proximo = proximoTreino(plano, dados.sessoes)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const treinoId = escolhido ?? proximo.treinoId
  const semana = semanaDoPlano(plano, agoraIso())
  const treino = treinoEfetivo(plano.treinos.find((t) => t.id === treinoId) ?? plano.treinos[0]!, plano, semana)
  const sessao = sessaoAberta(dados.sessoes, plano, treino.id)
  const estado = sessao ? estadoSessao(sessao, treino) : undefined
  const ultimaTerminada = dados.sessoes.filter((s) => s.fim).at(-1)

  async function abrir(prescricaoId: string) {
    await abrirSessao(dados.sessoes, plano, treino.id)
    ir(`/exercicio/${encodeURIComponent(prescricaoId)}`)
  }

  async function terminar() {
    if (!sessao) return
    if (!estado?.completa && !confirm('Ainda há exercícios por fazer. Terminar o treino mesmo assim?')) return
    await terminarSessao(sessao.id)
    setEscolhido(null)
  }

  return (
    <>
      <h1>{treino.nome}</h1>
      <p className="secundario">~{treino.duracaoEstimadaMin} min · {textoFase(plano, semana)}</p>
      <p>{treino.sintese}</p>

      {plano.avisos.length > 0 && (
        <details className="cartao aviso">
          <summary>⚠️ {plano.avisos.length === 1 ? '1 aviso' : `${plano.avisos.length} avisos`} sobre o teu plano</summary>
          {plano.avisos.map((a) => <p key={a}>{a}</p>)}
        </details>
      )}

      {estado?.completa && (
        <div className="cartao ok-borda" role="status">
          <h3>Treino completo 🎉</h3>
          {estado.saltados > 0 && <p className="secundario">{estado.saltados} exercício(s) saltado(s).</p>}
          <button className="primario largo" onClick={terminar}>Terminar treino</button>
        </div>
      )}

      <div className="cartao">
        <ul className="lista">
          {treino.prescricoes.map((p) => {
            const reg = sessao ? registoDe(sessao, p.id) : undefined
            const ex = catalogo.get(reg?.exercicioId ?? p.exercicioId)!
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
            <li className="item" style={{ cursor: 'default' }}>
              <span className="estado" aria-hidden="true">♥</span>
              <span className="corpo">
                <span className="titulo">Cardio {treino.cardioMin} min</span><br />
                <span className="secundario">Intensidade moderada: consegues falar frases curtas.</span>
              </span>
            </li>
          )}
        </ul>
      </div>

      {sessao && !estado?.completa && <button className="largo" onClick={terminar}>Terminar treino</button>}

      <label htmlFor="treino">Fazer outro treino</label>
      <select id="treino" value={treino.id} onChange={(e) => setEscolhido(e.target.value)}>
        {plano.treinos.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}{t.id === proximo.treinoId ? ' (próximo)' : ''}</option>
        ))}
      </select>
      {ultimaTerminada && (
        <p className="secundario">Último treino: {plano.treinos.find((t) => t.id === ultimaTerminada.treinoId)?.nome ?? 'plano anterior'}, {dataCurta(ultimaTerminada.inicio)}.</p>
      )}
    </>
  )
}
