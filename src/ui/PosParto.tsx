// F38 (v1.27): plano pós-parto por fases, a pergunta dos sintomas, o autoteste da diástase e o teste de impacto.
import { useState } from 'react'
import { db } from '../data/db'
import { DIASTASE_LIMIAR_DEDOS, FASES, NOMES_FASES, SINAIS_ALARME, TESTES_IMPACTO, faseDoCalendario, posPartoAtivo, type EstadoFase } from '../domain/posParto'
import type { Sessao } from '../domain/types'
import { decimal } from '../domain/unidades'
import { t } from '../i18n'
import { dataCurta, hojeIso, type Dados } from './dados'
import { ir } from './rota'

const textoSemanas = (n: number) => (n === 1 ? t('1 semana desde o parto') : t('{n} semanas desde o parto', { n }))

function textoTravada(e: EstadoFase) {
  if (e.travada === 'autorizacao') return t('Sem autorização médica, o plano fica na fase 2. Quando a tiveres, muda a resposta na anamnese.')
  if (e.travada === 'sintomas') return t('A tua última resposta foi que tiveste sintomas: a fase não avança até responderes «não» depois de um treino.')
  return null
}

/** F38.2: a fase atual, no Início e no Treino de hoje. */
export function CartaoPosParto({ dados, noEcra = false }: { dados: Dados; noEcra?: boolean }) {
  const a = dados.anamnese
  if (!a || a.sexo !== 'feminino' || a.gravidez !== 'pos-parto') return null
  // Anamneses anteriores à v1.27 não têm os dados do parto.
  if (!posPartoAtivo(a) || !dados.fasePosParto) {
    return (
      <section className="cartao" aria-labelledby="titulo-pos-parto">
        <h3 id="titulo-pos-parto">{t('Plano pós-parto')}</h3>
        <p>{t('Indica a data e o tipo de parto na anamnese para o plano seguir fases pelas semanas desde o parto.')}</p>
        <button className="largo" onClick={() => ir('/anamnese')}>{t('Completar a anamnese')}</button>
      </section>
    )
  }
  const e = dados.fasePosParto
  const travada = textoTravada(e)
  return (
    <section className="cartao" aria-labelledby="titulo-pos-parto">
      <h3 id="titulo-pos-parto">{NOMES_FASES[e.fase].nome}</h3>
      <p className="secundario">{textoSemanas(e.semanas)}</p>
      <p>{NOMES_FASES[e.fase].resumo}</p>
      {travada && <p className="secundario">⏸ {travada}</p>}
      {e.podeTestar && <p className="secundario">{t('Já podes fazer o teste de impacto, para saber se estás pronta para correr e saltar.')}</p>}
      {!noEcra && <button className="largo" onClick={() => ir('/pos-parto')}>{t('Pós-parto: fases e testes')}</button>}
    </section>
  )
}

/** F38.4: em cada treino do pós-parto, a pergunta dos sintomas; a resposta decide se a fase pode avançar. */
export function PerguntaSintomas({ dados, sessao }: { dados: Dados; sessao: Sessao }) {
  if (!dados.fasePosParto) return null
  const resposta = sessao.sintomasPosParto
  const responder = (v: boolean) => db.sessoes.update(sessao.id, { sintomasPosParto: v })
  return (
    <fieldset className={`cartao ${resposta ? 'aviso' : ''}`}>
      <legend className="visualmente-oculto">{t('Sintomas no pós-parto')}</legend>
      <p id="pergunta-sintomas">{t('Durante ou depois deste treino tiveste perdas de urina, sensação de peso na vagina ou dor?')}</p>
      <div className="linha" role="radiogroup" aria-labelledby="pergunta-sintomas">
        {[true, false].map((v) => (
          <label key={String(v)} className="opcao"><input type="radio" name={`sintomas-${sessao.id}`} checked={resposta === v} onChange={() => responder(v)} /> {v ? t('Sim') : t('Não')}</label>
        ))}
      </div>
      {resposta === true && <p>{t('Nos próximos treinos, faz menos séries ou salta o exercício que os provocou. A fase não avança enquanto a resposta mais recente for «sim». Se os sintomas continuarem, fala com um fisioterapeuta de saúde pélvica.')}</p>}
    </fieldset>
  )
}

function AutotesteDiastase({ dados }: { dados: Dados }) {
  const [dedos, setDedos] = useState('')
  const [erro, setErro] = useState('')
  const historico = dados.estadoPosParto.diastase ?? []
  const ultimo = historico.at(-1)

  async function guardar() {
    const n = Number(dedos.replace(',', '.'))
    if (!dedos.trim() || !(n >= 0 && n <= 10)) return setErro(t('Indica a diástase em dedos, de 0 a 10.'))
    setErro('')
    const diastase = [...historico.filter((d) => d.data !== hojeIso()), { data: hojeIso(), dedos: n }]
    await db.gravar('posParto', { ...dados.estadoPosParto, diastase })
    setDedos('')
  }

  return (
    <section className="cartao" aria-labelledby="titulo-diastase">
      <h3 id="titulo-diastase">{t('Autoteste da diástase')}</h3>
      <ol>
        <li>{t('Deita-te de costas, com os joelhos fletidos e os pés apoiados.')}</li>
        <li>{t('Põe as pontas dos dedos de uma mão na horizontal sobre o umbigo, na linha do meio da barriga.')}</li>
        <li>{t('Expira e levanta só a cabeça e os ombros, devagar.')}</li>
        <li>{t('Conta quantos dedos cabem no espaço entre os dois lados do músculo. Repete um pouco acima e abaixo do umbigo e fica com o maior valor.')}</li>
      </ol>
      <p className="secundario">{t('É uma estimativa: não substitui a avaliação de um fisioterapeuta. Com {n} dedos ou mais, ou se a barriga fizer uma «cúpula» ao longo da linha do meio, pede uma avaliação.', { n: DIASTASE_LIMIAR_DEDOS })}</p>
      <label htmlFor="dedos-diastase">{t('Dedos')}</label>
      <div className="linha">
        <input id="dedos-diastase" inputMode="decimal" value={dedos} onChange={(e) => setDedos(e.target.value)} />
        <button className="primario" onClick={guardar}>{t('Guardar')}</button>
      </div>
      {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      {ultimo && (
        <p className={ultimo.dedos >= DIASTASE_LIMIAR_DEDOS ? 'cartao aviso' : 'secundario'}>
          {t('Último autoteste: {n} dedos, {data}.', { n: decimal(ultimo.dedos), data: dataCurta(ultimo.data) })}
          {ultimo.dedos >= DIASTASE_LIMIAR_DEDOS && ` ${t('Vale a pena pedir uma avaliação a um fisioterapeuta de saúde pélvica.')}`}
        </p>
      )}
      {historico.length > 1 && <p className="secundario">{t('Antes: {lista}.', { lista: historico.slice(0, -1).map((d) => `${decimal(d.dedos)} (${dataCurta(d.data)})`).join(', ') })}</p>}
    </section>
  )
}

function TesteImpacto({ dados, estado }: { dados: Dados; estado: EstadoFase }) {
  const guardado = dados.estadoPosParto.testeImpacto
  const [resultados, setResultados] = useState<boolean[]>(() => TESTES_IMPACTO.map(() => false))
  const passou = estado.fase === 'regresso'

  async function guardar() {
    await db.gravar('posParto', { ...dados.estadoPosParto, testeImpacto: { data: hojeIso(), resultados } })
    window.scrollTo(0, 0)
  }

  return (
    <section className="cartao" aria-labelledby="titulo-impacto">
      <h3 id="titulo-impacto">{t('Teste de impacto')}</h3>
      <p>{t('Antes de correr ou saltar, faz estes 7 testes. Marca cada um que consegues fazer sem perdas de urina, sem peso na vagina e sem dor.')}</p>
      {passou && guardado && <p className="cartao ok-borda">✓ {t('Passaste no teste em {data}. A corrida e os intervalos estão desbloqueados nos programas de cardio.', { data: dataCurta(guardado.data) })}</p>}
      {!passou && guardado && <p className="secundario">{t('Último teste, {data}: {n} de {total}. Continua a fase 4 e repete daqui a 2 a 4 semanas.', { data: dataCurta(guardado.data), n: guardado.resultados.filter(Boolean).length, total: TESTES_IMPACTO.length })}</p>}
      {estado.podeTestar || passou ? (
        <>
          {TESTES_IMPACTO.map((teste, i) => (
            <label key={teste} className="opcao">
              <input type="checkbox" checked={resultados[i]} onChange={(e) => setResultados(resultados.map((x, j) => (j === i ? e.target.checked : x)))} /> {t(teste)}
            </label>
          ))}
          <button className="primario largo" style={{ marginTop: 8 }} onClick={guardar}>{t('Guardar o teste')}</button>
        </>
      ) : (
        <p className="secundario">{t('O teste abre na fase 4 (12 semanas depois do parto, ou 14 depois de uma cesariana), sem sintomas na última resposta e com autorização médica.')}</p>
      )}
    </section>
  )
}

export function PosPartoEcra({ dados }: { dados: Dados }) {
  const a = dados.anamnese
  const e = dados.fasePosParto
  return (
    <>
      <button onClick={() => (history.length > 1 ? history.back() : ir('/mais'))} style={{ marginTop: 12 }}>‹ {t('Voltar')}</button>
      <h1>{t('Pós-parto')}</h1>
      {!posPartoAtivo(a) || !e ? (
        <CartaoPosParto dados={dados} />
      ) : (
        <>
          <CartaoPosParto dados={dados} noEcra />
          <section className="cartao aviso" aria-labelledby="titulo-alarme">
            <h3 id="titulo-alarme">{t('Para e procura ajuda se tiveres')}</h3>
            <ul>{SINAIS_ALARME.map((s) => <li key={s}>{t(s)}</li>)}</ul>
            <p>{t('Um fisioterapeuta de saúde pélvica avalia o pavimento pélvico e a diástase e ajusta o plano. Se puderes, marca uma avaliação a partir das 6 semanas.')}</p>
          </section>

          <h2>{t('As fases')}</h2>
          <div className="cartao">
            <ol className="fases-pos-parto">
              {FASES.map((f) => (
                <li key={f} aria-current={f === e.fase ? 'step' : undefined}>
                  <strong>{NOMES_FASES[f].nome}</strong>{f === e.fase && ` · ${t('agora')}`}
                  <br /><span className="secundario">{NOMES_FASES[f].resumo}</span>
                </li>
              ))}
            </ol>
            <p className="secundario">
              {a.posParto.tipoParto === 'cesariana'
                ? t('Depois de uma cesariana, as fases seguem as semanas desde o parto: fase 2 a partir das 2 semanas, fase 3 a partir das 8 e fase 4 a partir das 14.')
                : t('As fases seguem as semanas desde o parto: fase 2 a partir das 2 semanas, fase 3 a partir das 6 e fase 4 a partir das 12.')}
              {' '}{faseDoCalendario(a.posParto, hojeIso()) !== e.fase && e.fase !== 'regresso' && t('Pelo calendário estarias em {fase}.', { fase: NOMES_FASES[faseDoCalendario(a.posParto, hojeIso())].nome })}
            </p>
          </div>

          <AutotesteDiastase dados={dados} />
          <TesteImpacto dados={dados} estado={e} />

          <h2>{t('De onde vem este plano')}</h2>
          <div className="cartao">
            <p className="secundario">{t('As fases e o teste de impacto seguem o guia de regresso à corrida depois do parto (Goom, Donnelly e Brockwell, 2019). O treino do pavimento pélvico tem o apoio de revisões Cochrane, e as recomendações gerais são as da OMS (2020) e do ACOG (2020).')}</p>
            <p className="secundario">{t('Os vídeos dos exercícios do pós-parto foram escolhidos pelo título e pela fonte, sem revisão de um fisioterapeuta.')}</p>
            <p className="secundario">{t('Esta app não substitui avaliação médica nem de fisioterapia.')}</p>
          </div>
        </>
      )}
    </>
  )
}
