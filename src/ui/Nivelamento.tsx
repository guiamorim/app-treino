// F32 (v1.21): teste de nivelamento opcional e o cartão que o propõe no ecrã «Hoje».
import { useState } from 'react'
import { db } from '../data/db'
import { aplicarNivelamento, avaliar, contextoDe, degrausPossiveis, NOMES_PADROES, PADROES, padraoNoPlano, repetirTeste, type Nivelamento, type Padrao, type Tentativa } from '../domain/nivelamento'
import { emCalistenia, modoConservador } from '../domain/plano'
import type { Anamnese, Exercicio, Plano } from '../domain/types'
import { lerVideo } from '../domain/video'
import { t } from '../i18n'
import { AvisoResponsabilidade } from './AvisoResponsabilidade'
import { catalogo, dataCurta, hojeIso, type Dados } from './dados'
import { ir } from './rota'
import { VideoModal } from './Video'

const unidade = (ex: Exercicio) => (ex.medida === 'segundos' ? t('segundos') : t('repetições'))
const posicao = (ex: Exercicio, padrao: Padrao, a: Anamnese) => {
  const d = degrausPossiveis(padrao, contextoDe(a, catalogo))
  return t('degrau {n} de {total}', { n: d.findIndex((x) => x.id === ex.id) + 1, total: d.length })
}

export function NivelamentoEcra({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  const ctx = contextoDe(anamnese, catalogo)
  const [tentativas, setTentativas] = useState<Partial<Record<Padrao, Tentativa[]>>>({})
  const [saltados, setSaltados] = useState<Padrao[]>([])
  const [estado, setEstado] = useState('')
  const noPlano = PADROES.filter((p) => padraoNoPlano(p, plano, dados.degraus, catalogo))
  const finais = Object.fromEntries(noPlano.flatMap((p) => {
    const passo = avaliar(p, tentativas[p] ?? [], ctx)
    return 'fim' in passo && !saltados.includes(p) ? [[p, passo.fim.id]] : []
  })) as Partial<Record<Padrao, string>>

  async function aplicar() {
    const hoje = hojeIso()
    const resultados: Nivelamento['resultados'] = {}
    for (const p of PADROES) if (finais[p]) resultados[p] = { tentativas: tentativas[p]!, exercicioId: finais[p] }
    await db.gravar('nivelamento', { data: hoje, resultados } satisfies Nivelamento)
    await db.gravar('degraus', aplicarNivelamento(plano, dados.degraus, finais, ctx, hoje))
    setEstado(t('Teste guardado. O plano já mostra os degraus do teste.'))
  }

  return (
    <>
      <button onClick={() => ir('/mais')} style={{ marginTop: 12 }}>‹ {t('Mais')}</button>
      <h1>{t('Teste de nivelamento')}</h1>
      <p>{t('Opcional, 10–15 minutos. Aquece 5 minutos. Em cada padrão, faz uma série com o máximo de repetições limpas (ou segundos) e para quando sentires que só conseguirias mais 1. Descansa 2–3 minutos entre padrões. Se sentires dor, para e salta o padrão.')}</p>
      <p className="secundario">{t('Sem o teste, o plano começa em degraus conservadores e ajusta-se nas primeiras sessões.')}</p>
      {modoConservador(anamnese) && <p className="cartao aviso">{t('Respondeste «sim» no PAR-Q+ ou indicaste gravidez: fala com o teu médico antes de fazer este teste.')}</p>}
      {dados.nivelamento && <p className="secundario">{t('Último teste: {data}.', { data: dataCurta(dados.nivelamento.data) })}</p>}
      {PADROES.map((p) => (
        <CartaoPadrao
          key={p}
          padrao={p}
          noPlano={noPlano.includes(p)}
          tentativas={tentativas[p] ?? []}
          saltado={saltados.includes(p)}
          dados={dados}
          anamnese={anamnese}
          registar={(x) => setTentativas({ ...tentativas, [p]: [...(tentativas[p] ?? []), x] })}
          saltar={(s) => setSaltados(s ? [...saltados, p] : saltados.filter((x) => x !== p))}
          refazer={() => setTentativas({ ...tentativas, [p]: [] })}
        />
      ))}
      <button className="primario largo" disabled={Object.keys(finais).length === 0} onClick={aplicar}>{t('Aplicar ao plano')}</button>
      {estado && <p role="status">{estado} <a href="#/relatorios">{t('Ver a fase por padrão')}</a></p>}
      <AvisoResponsabilidade />
    </>
  )
}

interface PropsPadrao {
  padrao: Padrao
  noPlano: boolean
  tentativas: Tentativa[]
  saltado: boolean
  dados: Dados
  anamnese: Anamnese
  registar: (x: Tentativa) => void
  saltar: (s: boolean) => void
  refazer: () => void
}

function CartaoPadrao({ padrao, noPlano, tentativas, saltado, dados, anamnese, registar, saltar, refazer }: PropsPadrao) {
  const [valor, setValor] = useState('')
  const [verVideo, setVerVideo] = useState(false)
  const ctx = contextoDe(anamnese, catalogo)
  const passo = avaliar(padrao, tentativas, ctx)
  const nome = NOMES_PADROES[padrao]
  if (!noPlano || 'indisponivel' in passo) {
    return (
      <div className="cartao">
        <h3>{nome}</h3>
        <p className="secundario">{'indisponivel' in passo ? t('Sem variações possíveis com o teu equipamento e as tuas restrições.') : t('Não está no teu plano.')}</p>
      </div>
    )
  }
  if (saltado) {
    return (
      <div className="cartao">
        <h3>{nome}</h3>
        <p className="secundario">{t('Saltado: o plano mantém este padrão como está.')}</p>
        <button onClick={() => saltar(false)}>{t('Fazer este padrão')}</button>
      </div>
    )
  }
  if ('fim' in passo) {
    return (
      <div className="cartao">
        <h3>{nome}</h3>
        <p role="status">{t('Ficas em «{nome}» ({posicao}).', { nome: passo.fim.nome, posicao: posicao(passo.fim, padrao, anamnese) })}</p>
        <button onClick={refazer}>{t('Refazer')}</button>
      </div>
    )
  }
  const ex = passo.pedir
  const [min] = ctx.faixa(tentativas[0] ? catalogo.get(tentativas[0].exercicioId)! : ex)
  const link = dados.videos[ex.id] ?? ex.video
  const video = link ? lerVideo(link) : null
  const campo = `nivelamento-${padrao}`
  const n = Number(valor)
  return (
    <div className="cartao">
      <h3>{nome}</h3>
      {tentativas[0] && <p>{t('Abaixo de {min}: descansa 2–3 minutos e faz uma série da variação mais fácil.', { min })}</p>}
      <label htmlFor={campo}>{ex.nome} ({unidade(ex)})</label>
      <div className="linha">
        <input id={campo} type="number" inputMode="numeric" min={0} max={3600} value={valor} onChange={(e) => setValor(e.target.value)} style={{ flex: 2 }} />
        <button disabled={valor === '' || !Number.isInteger(n) || n < 0 || n > 3600} onClick={() => { registar({ exercicioId: ex.id, valor: n }); setValor('') }}>{t('Registar')}</button>
      </div>
      <div className="linha" style={{ marginTop: 8 }}>
        {video && <button onClick={() => setVerVideo(true)}>▶ {t('Ver vídeo')}</button>}
        <button onClick={() => saltar(true)}>{t('Saltar')}</button>
      </div>
      {verVideo && video && <VideoModal video={video} titulo={ex.nome} fechar={() => setVerVideo(false)} />}
    </div>
  )
}

/** F32.2/F32.7: no ecrã «Hoje», com calistenia, antes do primeiro treino sem teste ou quando passou um bloco desde o último. */
export function CartaoNivelamento({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  if (!emCalistenia(anamnese)) return null
  const primeiro = !dados.nivelamento && dados.sessoes.length === 0
  const repetir = repetirTeste(dados.nivelamento, plano, hojeIso())
  if (!primeiro && !repetir) return null
  return (
    <div className="cartao">
      <h3>{t('Teste de nivelamento')}</h3>
      <p className="secundario">
        {primeiro
          ? t('Opcional, 10–15 minutos: põe cada padrão de movimento no degrau certo. Sem ele, o plano começa em degraus conservadores e ajusta-se nas primeiras sessões.')
          : t('Passou um bloco desde o último teste: repete-o para confirmar os degraus.')}
      </p>
      <button onClick={() => ir('/nivelamento')}>{t('Fazer o teste')}</button>
    </div>
  )
}
