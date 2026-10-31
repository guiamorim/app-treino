// F32.5–F32.7 (v1.21): fase por padrão de movimento e linha temporal de degraus, em «Relatórios».
import { contextoDe, fasePorPadrao, linhaDegraus, NOMES_PADROES, PADROES, prioridade, repetirTeste, type FasePadrao } from '../domain/nivelamento'
import { NOMES_NIVEIS, type Anamnese, type Plano } from '../domain/types'
import { t } from '../i18n'
import { catalogo, dataCurta, hojeIso, type Dados } from './dados'
import { GraficoLinha } from './Grafico'
import { ir } from './rota'

export function DegrausRelatorio({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  const fases = fasePorPadrao(plano, dados.degraus, dados.sessoes, contextoDe(anamnese, catalogo), hojeIso())
  const fraco = prioridade(fases)
  const linhas = PADROES.map((p) => ({ padrao: p, ...linhaDegraus(p, dados.sessoes) })).filter((l) => l.pontos.length > 0)
  return (
    <>
      <div className="cartao">
        <h3>{t('Fase por padrão')}</h3>
        {fraco?.nivel && <p>{t('Nível geral: {nivel}. Prioridade: {padrao}.', { nivel: NOMES_NIVEIS[fraco.nivel], padrao: NOMES_PADROES[fraco.padrao] })}</p>}
        <ul className="lista">
          {fases.map((f) => <LinhaFase key={f.padrao} fase={f} prioridade={f.padrao === fraco?.padrao} />)}
        </ul>
        <p className="secundario">{t('O nível geral é o do padrão mais fraco. O nível é uma orientação, não um diagnóstico.')}</p>
        <p className="secundario">
          {repetirTeste(dados.nivelamento, plano, hojeIso())
            ? t('Passou um bloco desde o último teste: repete-o para confirmar os degraus.')
            : dados.nivelamento
              ? t('Último teste: {data}.', { data: dataCurta(dados.nivelamento.data) })
              : t('Ainda não fizeste o teste de nivelamento (opcional).')}
        </p>
        <button onClick={() => ir('/nivelamento')}>{t('Teste de nivelamento')}</button>
      </div>
      {linhas.length === 0 && <p className="secundario">{t('Regista treinos para ver a linha temporal dos degraus.')}</p>}
      {linhas.map(({ padrao, pontos, mudancas }) => (
        <div key={padrao} className="cartao">
          <h3>{NOMES_PADROES[padrao]}</h3>
          <GraficoLinha
            titulo={NOMES_PADROES[padrao]}
            unidade={t('degrau')}
            pontos={pontos.map((p) => ({ x: Date.parse(p.data), y: p.degrau, rotulo: `${dataCurta(p.data)}: ${catalogo.get(p.exercicioId)?.nome ?? p.exercicioId}` }))}
          />
          <ul className="secundario">
            {mudancas.map((p) => <li key={p.data}>{dataCurta(p.data)}: {catalogo.get(p.exercicioId)?.nome ?? p.exercicioId}</li>)}
          </ul>
        </div>
      ))}
    </>
  )
}

function LinhaFase({ fase: f, prioridade }: { fase: FasePadrao; prioridade: boolean }) {
  const unidade = f.atual?.medida === 'segundos' ? 's' : 'reps'
  return (
    <li style={{ padding: '8px 0' }}>
      <strong>{NOMES_PADROES[f.padrao]}</strong>
      {prioridade && <span className="chip" style={{ marginLeft: 8 }}>{t('Prioridade')}</span>}
      <br />
      {!f.atual ? (
        <span className="secundario">{t('Não está no teu plano.')}</span>
      ) : (
        <>
          <span>{[f.atual.nome, f.nivel ? NOMES_NIVEIS[f.nivel] : '', t('degrau {n} de {total}', { n: f.degrau, total: f.total })].filter(Boolean).join(' · ')}</span>
          <br />
          <span className="secundario">
            {f.seguinte && f.diasEmFalta
              ? t('Para «{nome}»: {max} {unidade} em todas as séries em 2 sessões seguidas, e mais {n} dia(s) neste degrau.', { nome: f.seguinte.nome, max: f.topo ?? 0, unidade, n: f.diasEmFalta })
              : f.seguinte
                ? t('Para «{nome}»: {max} {unidade} em todas as séries em 2 sessões seguidas.', { nome: f.seguinte.nome, max: f.topo ?? 0, unidade })
                : t('Último degrau possível: a progressão passa a ser com peso extra ou mais tempo em tensão.')}
          </span>
        </>
      )}
    </li>
  )
}
