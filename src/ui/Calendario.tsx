// F25.3: calendário com os treinos feitos e previstos, e o detalhe de cada dia.
import { semCarga as semCargaDe } from '../domain/carga'
import { useState } from 'react'
import { faseDoDia, grelhaMes, meioDia, previsao, proximosTreinos, sessoesDoDia } from '../domain/calendario'
import { pdfDia, pdfMes, pdfSemana } from '../domain/exportar'
import { semanaDoPlano, treinoEfetivo } from '../domain/plano'
import { reservaAlvo, textoReserva } from '../domain/reserva'
import { estadoExercicio, registoDe } from '../domain/sessao'
import type { Plano, Sessao, TreinoModelo } from '../domain/types'
import { peso } from '../domain/unidades'
import { locale, t } from '../i18n'
import { agoraIso, catalogo, hojeIso, type Dados } from './dados'
import { descarregar, paraExportacao, TIPO_PDF } from './ficheiros'
import { ir } from './rota'

const dataLonga = (dia: string) => new Date(meioDia(dia)).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
const nomeMes = (ano: number, mes: number) => {
  const s = new Date(ano, mes - 1, 15).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const diasCurtos = () => Array.from({ length: 7 }, (_, d) => new Date(2026, 10, 2 + d, 12).toLocaleDateString(locale(), { weekday: 'narrow' }))

/** F25.4: PDF do dia, da semana e do mês (também em «Mais»). */
export function BotoesPdfPlano({ dados }: { dados: Dados }) {
  const gerar = (nome: string, f: typeof pdfDia) => descarregar(`${nome}-${hojeIso()}.pdf`, f(paraExportacao(dados), catalogo, agoraIso()), TIPO_PDF)
  return (
    <div className="linha">
      <button disabled={!dados.plano} onClick={() => gerar(t('treino-do-dia'), pdfDia)}>{t('Dia (PDF)')}</button>
      <button disabled={!dados.plano} onClick={() => gerar(t('treinos-da-semana'), pdfSemana)}>{t('Semana (PDF)')}</button>
      <button disabled={!dados.plano} onClick={() => gerar(t('plano-do-mes'), pdfMes)}>{t('Mês (PDF)')}</button>
    </div>
  )
}

export function Calendario({ dados, plano }: { dados: Dados; plano: Plano }) {
  const hoje = hojeIso()
  const [mes, setMes] = useState({ ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) })
  const [escolhido, setEscolhido] = useState(hoje)
  const grelha = grelhaMes(mes.ano, mes.mes)
  const ultimo = grelha.flat().filter(Boolean).at(-1)!
  const diasTreino = dados.anamnese?.diasTreino
  const previstos = new Map(previsao(plano, dados.sessoes, diasTreino, hoje, ultimo > hoje ? ultimo : hoje).map((x) => [x.dia, x.treinoId]))
  const nome = (id: string) => plano.treinos.find((x) => x.id === id)?.nome ?? id
  const mudarMes = (n: number) => {
    const d = new Date(mes.ano, mes.mes - 1 + n, 1)
    setMes({ ano: d.getFullYear(), mes: d.getMonth() + 1 })
  }

  return (
    <>
      <div className="cartao">
        <div className="linha">
          <button onClick={() => mudarMes(-1)} aria-label={t('Mês anterior')} style={{ flex: 'none' }}>‹</button>
          <h3 style={{ textAlign: 'center' }}>{nomeMes(mes.ano, mes.mes)}</h3>
          <button onClick={() => mudarMes(1)} aria-label={t('Mês seguinte')} style={{ flex: 'none' }}>›</button>
        </div>
        <div className="calendario" role="grid" aria-label={nomeMes(mes.ano, mes.mes)}>
          <div role="row" className="cal-semana">
            {diasCurtos().map((d, i) => <span key={i} role="columnheader" className="secundario">{d}</span>)}
          </div>
          {grelha.map((semana, i) => (
            <div role="row" className="cal-semana" key={i}>
              {semana.map((dia, j) => {
                if (!dia) return <span key={j} role="gridcell" />
                const feitos = sessoesDoDia(dados.sessoes, dia)
                const previsto = previstos.get(dia)
                const descarga = dia >= plano.criadoEm.slice(0, 10) && faseDoDia(plano, dia).fase === 'descarga'
                const estado = feitos.some((s) => s.fim) ? t('treino feito: {treino}', { treino: nome(feitos[0]!.treinoId) })
                  : feitos.length ? t('treino a meio: {treino}', { treino: nome(feitos[0]!.treinoId) })
                  : previsto ? t('treino previsto: {treino}', { treino: nome(previsto) }) : ''
                return (
                  <button
                    key={j}
                    role="gridcell"
                    aria-selected={dia === escolhido}
                    aria-current={dia === hoje ? 'date' : undefined}
                    aria-label={[dataLonga(dia), estado, descarga ? t('semana de descarga') : ''].filter(Boolean).join(', ')}
                    className={['cal-dia', dia === hoje ? 'hoje' : '', dia === escolhido ? 'escolhido' : '', descarga ? 'descarga' : '', feitos.length ? 'feito' : ''].join(' ')}
                    onClick={() => setEscolhido(dia)}
                  >
                    <span>{Number(dia.slice(8))}</span>
                    <small>{feitos.some((s) => s.fim) ? '✓' : feitos.length ? '…' : previsto ? nome(previsto).split(' ').map((p) => p[0]).join('') : ''}</small>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <p className="secundario">{t('✓ treino feito · letras = treino previsto · fundo = semana de descarga')}</p>
      </div>

      <DetalheDia dia={escolhido} hoje={hoje} dados={dados} plano={plano} previsto={previstos.get(escolhido) ?? (escolhido === hoje && !diasTreino?.length && !sessoesDoDia(dados.sessoes, hoje).some((s) => s.fim) ? proximosTreinos(plano, dados.sessoes, 1)[0] : undefined)} />

      {!diasTreino?.length && (
        <div className="cartao">
          <h3>{t('Próximos treinos')}</h3>
          <ol>{proximosTreinos(plano, dados.sessoes, dados.anamnese?.diasPorSemana ?? plano.treinos.length).map((id, i) => <li key={i}>{nome(id)}</li>)}</ol>
          <p className="secundario">{t('Escolhe os dias em que treinas, na anamnese, para veres os próximos treinos no calendário.')}</p>
          <button className="largo" onClick={() => ir('/anamnese')}>{t('Escolher dias de treino')}</button>
        </div>
      )}

      <div className="cartao">
        <h3>{t('Plano para levar')}</h3>
        <BotoesPdfPlano dados={dados} />
      </div>
    </>
  )
}

function DetalheDia({ dia, hoje, dados, plano, previsto }: { dia: string; hoje: string; dados: Dados; plano: Plano; previsto: string | undefined }) {
  const sessoes = sessoesDoDia(dados.sessoes, dia)
  const semana = semanaDoPlano(plano, meioDia(dia))
  const treino = (id: string) => plano.treinos.find((x) => x.id === id)
  return (
    <div className="cartao" aria-live="polite">
      <h3>{maiuscula(dataLonga(dia))}</h3>
      {sessoes.map((s) => <SessaoFeita key={s.id} s={s} plano={plano} aMeio={!s.fim && dia === hoje} semana={semana} />)}
      {sessoes.length === 0 && previsto && treino(previsto) && dia >= hoje && (
        <>
          <p><strong>{dia === hoje ? t('Hoje: {treino}', { treino: treino(previsto)!.nome }) : t('Previsto: {treino}', { treino: treino(previsto)!.nome })}</strong></p>
          <ListaPrevista tr={treinoEfetivo(treino(previsto)!, plano, semana)} />
          {dia === hoje && <button className="primario largo" onClick={() => ir('/hoje')}>{t('Começar treino')}</button>}
        </>
      )}
      {sessoes.length === 0 && !(previsto && dia >= hoje) && <p className="secundario">{t('Sem treino neste dia.')}</p>}
    </div>
  )
}

function ListaPrevista({ tr, ignorar = [] }: { tr: TreinoModelo; ignorar?: string[] }) {
  return (
    <ul>
      {tr.prescricoes.filter((p) => !ignorar.includes(p.id)).map((p) => {
        const ex = catalogo.get(p.exercicioId)
        const emSegundos = ex?.medida === 'segundos'
        const esforco = emSegundos ? t('reserva +{a}–{b} s', { a: reservaAlvo(p.rir)[0], b: reservaAlvo(p.rir)[1] }) : `RIR ${p.rir[0]}–${p.rir[1]}`
        return <li key={p.id}>{ex?.nome ?? p.exercicioId}: {p.series} × {p.faixa[0]}–{p.faixa[1]} {emSegundos ? 's' : 'reps'} · {esforco} · {t('descanso {s} s', { s: p.descansoSeg })}</li>
      })}
    </ul>
  )
}

function SessaoFeita({ s, plano, aMeio, semana }: { s: Sessao; plano: Plano; aMeio: boolean; semana: number }) {
  const modelo = plano.treinos.find((x) => x.id === s.treinoId)
  const minutos = s.fim ? Math.round((Date.parse(s.fim) - Date.parse(s.inicio)) / 60_000) : undefined
  const tr = modelo && treinoEfetivo(modelo, plano, semana)
  const feitos = tr ? tr.prescricoes.filter((p) => ['feito', 'saltado'].includes(estadoExercicio(registoDe(s, p.id), p))).map((p) => p.id) : []
  return (
    <>
      <p>
        <strong>{aMeio ? t('Treino a meio: {treino}', { treino: modelo?.nome ?? s.treinoId }) : `✓ ${modelo?.nome ?? s.treinoId}`}</strong>
        {minutos !== undefined && <span className="secundario"> · {t('{min} min', { min: minutos })}</span>}
        {s.alongamento === 'feito' && <span className="secundario"> · {t('alongamento feito')}</span>}
      </p>
      <ul>
        {s.exercicios.filter((e) => e.series.length > 0).map((e) => {
          const ex = catalogo.get(e.exercicioId)
          const semCarga = semCargaDe(ex, e.tipoCarga)
          const series = e.series.map((x) => `${semCarga ? '' : `${peso(x.carga)} × `}${x.reps}${x.reservaSeg !== undefined ? ` (${textoReserva(x.reservaSeg)})` : x.rir !== undefined ? ` (RIR ${x.rir})` : ''}`).join(', ')
          return <li key={e.prescricaoId}>{ex?.nome ?? e.exercicioId}: {series}{e.dor ? ` · ${t('dor')} ${e.dor}/10` : ''}</li>
        })}
      </ul>
      {aMeio && tr && (
        <>
          <p className="secundario">{t('Falta:')}</p>
          <ListaPrevista tr={tr} ignorar={feitos} />
          <button className="primario largo" onClick={() => ir('/hoje')}>{t('Continuar treino')}</button>
        </>
      )}
    </>
  )
}
