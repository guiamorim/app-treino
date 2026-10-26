import { useState } from 'react'
import { aderencia, alvoVolume, inicioSemana, mediaMovel, progressaoExercicio, volumeSemanal } from '../domain/relatorios'
import { GRUPOS_MUSCULARES, NOMES_GRUPOS } from '../domain/types'
import { decimal, paraUnidade, peso, unidadePeso } from '../domain/unidades'
import { catalogo, dataCurta, type Dados } from './dados'
import { GraficoLinha } from './Grafico'
import { t } from '../i18n'

export function Relatorios({ dados }: { dados: Dados }) {
  const [aba, setAba] = useState<'progressao' | 'semana'>('progressao')
  return (
    <>
      <h1>{t('Relatórios')}</h1>
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'progressao'} onClick={() => setAba('progressao')}>{t('Progressão')}</button>
        <button role="tab" aria-selected={aba === 'semana'} onClick={() => setAba('semana')}>{t('Semana')}</button>
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
  if (!ex) return <p className="secundario">{t('Regista o primeiro treino para ver a tua progressão.')}</p>
  const pontos = progressaoExercicio(dados.sessoes, ex.id)
  const comCarga = pontos.some((p) => p.e1rm !== null)
  const recordes = pontos.filter((p) => p.recorde).length
  return (
    <>
      <label htmlFor="ex">{t('Exercício')}</label>
      <select id="ex" value={ex.id} onChange={(e) => setId(e.target.value)}>
        {feitos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
      <div className="cartao">
        <h3>{comCarga ? t('1RM estimado ({u})', { u: unidadePeso() }) : ex.medida === 'segundos' ? t('Melhor tempo (s)') : t('Melhores repetições')}</h3>
        <GraficoLinha
          titulo={ex.nome}
          unidade={comCarga ? unidadePeso() : ex.medida === 'segundos' ? 's' : 'reps'}
          pontos={pontos.map((p) => ({
            x: Date.parse(p.data),
            y: comCarga ? Math.round(paraUnidade(p.e1rm ?? 0) * 10) / 10 : p.melhor.reps,
            destaque: p.recorde,
            rotulo: `${dataCurta(p.data)}: ${peso(p.melhor.carga)} × ${p.melhor.reps}${p.recorde ? ` (${t('recorde')})` : ''}`,
          }))}
        />
        <p className="secundario">{t('Pontos verdes = recorde pessoal ({n}).', { n: recordes })} {comCarga && t('1RM estimado pela fórmula de Epley, só com séries até 12 reps.')}</p>
      </div>
      {pontos.some((p) => p.dor > 0) && (
        <div className="cartao">
          <h3>{t('Dor registada (0–10)')}</h3>
          <GraficoLinha titulo={t('Dor')} unidade="/10" cor="var(--perigo)" pontos={pontos.map((p) => ({ x: Date.parse(p.data), y: p.dor }))} />
        </div>
      )}
      <div className="cartao">
        <h3>{t('Histórico')}</h3>
        <ul className="lista">
          {[...pontos].reverse().slice(0, 10).map((p) => (
            <li key={p.data} className="linha" style={{ padding: '8px 0' }}>
              <span>{dataCurta(p.data)}</span>
              <span>{p.melhor.carga ? `${peso(p.melhor.carga)} × ` : ''}{p.melhor.reps}</span>
              <span>{p.recorde ? '🏆' : ''}{p.dor ? ` ${t('dor')} ${p.dor}` : ''}</span>
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
        <h3>{t('Aderência (últimas 4 semanas)')}</h3>
        <p><span className="numero">{ad.feitas}</span> {t('de {n} treinos ({pct}%)', { n: ad.planeadas, pct: ad.planeadas ? Math.round((ad.feitas / ad.planeadas) * 100) : 0 })}</p>
      </div>

      <div className="cartao">
        <div className="linha">
          <button onClick={() => setDesvio(desvio - 1)} aria-label={t('Semana anterior')} style={{ flex: 'none' }}>‹</button>
          <h3 style={{ textAlign: 'center' }}>{t('Séries por grupo')}<br /><span className="secundario">{dataCurta(inicio.toISOString())} – {dataCurta(new Date(fim.getTime() - 1).toISOString())}</span></h3>
          <button onClick={() => setDesvio(desvio + 1)} disabled={desvio >= 0} aria-label={t('Semana seguinte')} style={{ flex: 'none' }}>›</button>
        </div>
        {GRUPOS_MUSCULARES.map((g) => {
          const [amin, amax] = alvoVolume(g)
          const escala = 20
          const v = volume[g]
          return (
            <div key={g} style={{ margin: '10px 0' }}>
              <div className="linha"><span>{NOMES_GRUPOS[g]}</span><span style={{ textAlign: 'right' }} className="secundario">{decimal(v)} / {amin}–{amax}</span></div>
              <div className="barra" aria-hidden="true">
                <span className="alvo" style={{ left: `${(amin / escala) * 100}%`, width: `${((amax - amin) / escala) * 100}%` }} />
                <span style={{ width: `${Math.min(100, (v / escala) * 100)}%`, background: v >= amin ? 'var(--ok)' : 'var(--acento)' }} />
              </div>
            </div>
          )
        })}
        <p className="secundario">{t('Exercício principal conta 1 série; grupos secundários contam 0,5. Faixa verde = alvo semanal.')}</p>
      </div>

      <div className="cartao">
        <h3>{t('Peso ({u})', { u: unidadePeso() })}</h3>
        <GraficoLinha
          titulo={t('Peso')}
          unidade={unidadePeso()}
          pontos={pesos.map((p) => ({ x: Date.parse(p.data), y: Math.round(paraUnidade(p.media) * 10) / 10, rotulo: `${dataCurta(p.data)}: ${t('média')} ${peso(p.media)}` }))}
          extra={pesos.map((p) => ({ x: Date.parse(p.data), y: paraUnidade(p.valor) }))}
        />
        <p className="secundario">{t('Linha cheia = média de 7 dias; tracejado = pesagens.')}</p>
      </div>
      <div className="cartao">
        <h3>{t('Cintura (cm)')}</h3>
        <GraficoLinha titulo={t('Cintura')} unidade="cm" pontos={cinturas.map((m) => ({ x: Date.parse(m.data), y: m.cinturaCm! }))} />
        {ultimaCintura !== undefined && primeiraCintura !== undefined && cinturas.length > 1 && (
          <p>{ultimaCintura <= primeiraCintura ? '↓' : '↑'} {t('{cm} cm desde {data}', { cm: decimal(Math.abs(ultimaCintura - primeiraCintura)), data: dataCurta(cinturas[0]!.data) })}</p>
        )}
        <p className="secundario">{t('Para recomposição, a cintura diz mais do que o peso.')}</p>
      </div>
    </>
  )
}
