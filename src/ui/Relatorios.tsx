import { useState } from 'react'
import { aderencia, alvoVolume, inicioSemana, mediaMovel, progressaoExercicio, volumeSemanal } from '../domain/relatorios'
import { GRUPOS_MUSCULARES, NOMES_GRUPOS } from '../domain/types'
import { catalogo, dataCurta, kg, type Dados } from './dados'
import { GraficoLinha } from './Grafico'

export function Relatorios({ dados }: { dados: Dados }) {
  const [aba, setAba] = useState<'progressao' | 'semana'>('progressao')
  return (
    <>
      <h1>Relatórios</h1>
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'progressao'} onClick={() => setAba('progressao')}>Progressão</button>
        <button role="tab" aria-selected={aba === 'semana'} onClick={() => setAba('semana')}>Semana</button>
      </div>
      {aba === 'progressao' ? <Progressao dados={dados} /> : <Semana dados={dados} />}
    </>
  )
}

function Progressao({ dados }: { dados: Dados }) {
  const feitos = [...new Set(dados.sessoes.flatMap((s) => s.exercicios.filter((e) => e.series.length > 0).map((e) => e.exercicioId)))]
    .map((id) => catalogo.get(id))
    .filter((e) => e !== undefined)
  const [id, setId] = useState(feitos[0]?.id ?? '')
  const ex = catalogo.get(id) ?? feitos[0]
  if (!ex) return <p className="secundario">Regista o primeiro treino para ver a tua progressão.</p>
  const pontos = progressaoExercicio(dados.sessoes, ex.id)
  const comCarga = pontos.some((p) => p.e1rm !== null)
  const recordes = pontos.filter((p) => p.recorde).length
  return (
    <>
      <label htmlFor="ex">Exercício</label>
      <select id="ex" value={ex.id} onChange={(e) => setId(e.target.value)}>
        {feitos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
      <div className="cartao">
        <h3>{comCarga ? '1RM estimado (kg)' : ex.medida === 'segundos' ? 'Melhor tempo (s)' : 'Melhores repetições'}</h3>
        <GraficoLinha
          titulo={ex.nome}
          unidade={comCarga ? 'kg' : ex.medida === 'segundos' ? 's' : 'reps'}
          pontos={pontos.map((p) => ({
            x: Date.parse(p.data),
            y: comCarga ? Math.round((p.e1rm ?? 0) * 10) / 10 : p.melhor.reps,
            destaque: p.recorde,
            rotulo: `${dataCurta(p.data)}: ${kg(p.melhor.carga)} kg × ${p.melhor.reps}${p.recorde ? ' (recorde)' : ''}`,
          }))}
        />
        <p className="secundario">Pontos verdes = recorde pessoal ({recordes}). {comCarga && '1RM estimado pela fórmula de Epley, só com séries até 12 reps.'}</p>
      </div>
      {pontos.some((p) => p.dor > 0) && (
        <div className="cartao">
          <h3>Dor registada (0–10)</h3>
          <GraficoLinha titulo="Dor" unidade="/10" cor="var(--perigo)" pontos={pontos.map((p) => ({ x: Date.parse(p.data), y: p.dor }))} />
        </div>
      )}
      <div className="cartao">
        <h3>Histórico</h3>
        <ul className="lista">
          {[...pontos].reverse().slice(0, 10).map((p) => (
            <li key={p.data} className="linha" style={{ padding: '8px 0' }}>
              <span>{dataCurta(p.data)}</span>
              <span>{p.melhor.carga ? `${kg(p.melhor.carga)} kg × ` : ''}{p.melhor.reps}</span>
              <span>{p.recorde ? '🏆' : ''}{p.dor ? ` dor ${p.dor}` : ''}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Semana({ dados }: { dados: Dados }) {
  const [desvio, setDesvio] = useState(0)
  const inicio = inicioSemana(new Date())
  inicio.setDate(inicio.getDate() + desvio * 7)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 7)
  const volume = volumeSemanal(dados.sessoes, catalogo, inicio, fim)
  const ad = aderencia(dados.sessoes, dados.anamnese?.diasPorSemana ?? 4, new Date())
  const pesos = mediaMovel(dados.medicoes)
  const cinturas = dados.medicoes.filter((m) => m.cinturaCm !== undefined)
  const ultimaCintura = cinturas.at(-1)?.cinturaCm
  const primeiraCintura = cinturas[0]?.cinturaCm
  return (
    <>
      <div className="cartao">
        <h3>Aderência (últimas 4 semanas)</h3>
        <p><span className="numero">{ad.feitas}</span> de {ad.planeadas} treinos ({ad.planeadas ? Math.round((ad.feitas / ad.planeadas) * 100) : 0}%)</p>
      </div>

      <div className="cartao">
        <div className="linha">
          <button onClick={() => setDesvio(desvio - 1)} aria-label="Semana anterior" style={{ flex: 'none' }}>‹</button>
          <h3 style={{ textAlign: 'center' }}>Séries por grupo<br /><span className="secundario">{dataCurta(inicio.toISOString())} – {dataCurta(new Date(fim.getTime() - 1).toISOString())}</span></h3>
          <button onClick={() => setDesvio(desvio + 1)} disabled={desvio >= 0} aria-label="Semana seguinte" style={{ flex: 'none' }}>›</button>
        </div>
        {GRUPOS_MUSCULARES.map((g) => {
          const [amin, amax] = alvoVolume(g)
          const escala = 20
          const v = volume[g]
          return (
            <div key={g} style={{ margin: '10px 0' }}>
              <div className="linha"><span>{NOMES_GRUPOS[g]}</span><span style={{ textAlign: 'right' }} className="secundario">{kg(v)} / {amin}–{amax}</span></div>
              <div className="barra" aria-hidden="true">
                <span className="alvo" style={{ left: `${(amin / escala) * 100}%`, width: `${((amax - amin) / escala) * 100}%` }} />
                <span style={{ width: `${Math.min(100, (v / escala) * 100)}%`, background: v >= amin ? 'var(--ok)' : 'var(--acento)' }} />
              </div>
            </div>
          )
        })}
        <p className="secundario">Exercício principal conta 1 série; grupos secundários contam 0,5. Faixa verde = alvo semanal.</p>
      </div>

      <div className="cartao">
        <h3>Peso (kg)</h3>
        <GraficoLinha
          titulo="Peso"
          unidade="kg"
          pontos={pesos.map((p) => ({ x: Date.parse(p.data), y: p.media, rotulo: `${dataCurta(p.data)}: média ${kg(p.media)} kg` }))}
          extra={pesos.map((p) => ({ x: Date.parse(p.data), y: p.valor }))}
        />
        <p className="secundario">Linha cheia = média de 7 dias; tracejado = pesagens.</p>
      </div>
      <div className="cartao">
        <h3>Cintura (cm)</h3>
        <GraficoLinha titulo="Cintura" unidade="cm" pontos={cinturas.map((m) => ({ x: Date.parse(m.data), y: m.cinturaCm! }))} />
        {ultimaCintura !== undefined && primeiraCintura !== undefined && cinturas.length > 1 && (
          <p>{ultimaCintura <= primeiraCintura ? '↓' : '↑'} {kg(Math.abs(ultimaCintura - primeiraCintura))} cm desde {dataCurta(cinturas[0]!.data)}</p>
        )}
        <p className="secundario">Para recomposição, a cintura diz mais do que o peso.</p>
      </div>
    </>
  )
}
