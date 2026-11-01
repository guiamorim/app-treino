// F37 (v1.26): programas de cardio, o personalizado e o plano só de cardio.
import { useState } from 'react'
import { db } from '../data/db'
import { MODALIDADES, NOMES_MODALIDADES, type Modalidade } from '../domain/cardio'
import { avisosPersonalizado, bloqueio, LIMITES_PERSONALIZADO, NOMES_PROGRAMAS, PROGRAMAS, progresso, semanasPersonalizado, textoSessao, validarPersonalizado, type ErroPersonalizado, type IdPrograma, type Personalizado, type ProgramaAtivo, type SessaoPersonalizada } from '../domain/programasCardio'
import { decimal } from '../domain/unidades'
import { t } from '../i18n'
import { NOMES_DIAS } from './AnamneseEcra'
import { hojeIso, type Dados } from './dados'
import { ir } from './rota'

const ERROS: Record<ErroPersonalizado, () => string> = {
  'sem-sessoes': () => t('Escolhe pelo menos um dia.'),
  'dia-repetido': () => t('Cada dia só pode ter uma sessão.'),
  minutos: () => t('Os minutos de cada sessão têm de estar entre {min} e {max}.', { min: LIMITES_PERSONALIZADO.minutos[0], max: LIMITES_PERSONALIZADO.minutos[1] }),
  esforco: () => t('Escolhe o esforço, de 0 a 10.'),
  semanas: () => t('O programa tem de ter entre {min} e {max} semanas.', { min: LIMITES_PERSONALIZADO.semanas[0], max: LIMITES_PERSONALIZADO.semanas[1] }),
  progressao: () => t('A subida por semana vai de 0 a 10 %.'),
}

/** F37.5: recomendação de força num plano só de cardio (Donnelly et al., 2009). */
export const textoForca = () => t('Recomendamos 2 sessões curtas de força por semana: ajudam a manter o músculo enquanto emagreces. O teu treino de força continua no Treino de hoje.')

/** F37.4: o programa ativo, com a semana, as sessões feitas e a próxima sessão. */
export function CartaoProgramaCardio({ dados }: { dados: Dados }) {
  const ativo = dados.programaCardio
  if (!ativo) return null
  const p = progresso(ativo, dados.cardio, hojeIso())
  const nome = NOMES_PROGRAMAS[ativo.id].nome
  return (
    <section className="cartao" aria-labelledby="titulo-programa-cardio">
      <h3 id="titulo-programa-cardio">♥ {nome}</h3>
      {p.terminado ? (
        <>
          <p>🎉 {t('Terminaste o programa. Podes escolher outro ou repeti-lo.')}</p>
          <button className="largo" onClick={() => ir('/programas-cardio')}>{t('Programas de cardio')}</button>
        </>
      ) : (
        <>
          <p className="secundario">{t('Semana {s} de {total} · {feitas} de {n} sessões feitas', { s: p.semana, total: p.total, feitas: p.feitas, n: p.sessoes.length })}</p>
          {p.proxima ? (
            <>
              <p><strong>{t('Próxima sessão:')}</strong> {NOMES_MODALIDADES[p.proxima.modalidade]} · {textoSessao(p.proxima, decimal)}</p>
              <button className="primario largo" onClick={() => ir('/cardio/programa')}>{t('Registar esta sessão')}</button>
            </>
          ) : (
            <p>✓ {(p.faltamDias === 1 ? t('Semana cumprida. A próxima começa amanhã.') : t('Semana cumprida. A próxima começa daqui a {n} dias.', { n: p.faltamDias }))}</p>
          )}
        </>
      )}
      {ativo.soCardio && <p className="secundario">💪 {textoForca()}</p>}
    </section>
  )
}

function EditorPersonalizado({ inicial, comecar }: { inicial?: Personalizado; comecar: (p: Personalizado) => void }) {
  const [sessoes, setSessoes] = useState<SessaoPersonalizada[]>(inicial?.sessoes ?? [])
  const [semanas, setSemanas] = useState(String(inicial?.semanas ?? 8))
  const [progressaoPct, setProgressao] = useState(inicial?.progressaoPct ?? 5)
  const [erro, setErro] = useState('')
  const p: Personalizado = { sessoes, semanas: Number(semanas), progressaoPct }
  const alternar = (dia: number) =>
    setSessoes(sessoes.some((s) => s.dia === dia) ? sessoes.filter((s) => s.dia !== dia) : [...sessoes, { dia, modalidade: 'caminhada' as const, minutos: 30, esforco: 5 }].sort((a, b) => a.dia - b.dia))
  const mudar = (dia: number, x: Partial<SessaoPersonalizada>) => setSessoes(sessoes.map((s) => (s.dia === dia ? { ...s, ...x } : s)))
  const nomes = NOMES_DIAS()
  const valido = validarPersonalizado(p) === null
  const ultima = valido ? semanasPersonalizado(p).at(-1)! : []

  function guardar() {
    const problema = validarPersonalizado(p)
    if (problema) return setErro(ERROS[problema]())
    setErro('')
    comecar(p)
  }

  return (
    <div>
      <p id="dias-cardio" style={{ fontWeight: 600, marginBottom: 4 }}>{t('Dias')}</p>
      <div className="linha dias-treino" role="group" aria-labelledby="dias-cardio">
        {nomes.map((nome, d) => (
          <button key={d} type="button" aria-pressed={sessoes.some((s) => s.dia === d)} className={sessoes.some((s) => s.dia === d) ? 'primario' : ''} onClick={() => alternar(d)}>{nome}</button>
        ))}
      </div>
      {sessoes.map((s) => (
        <fieldset key={s.dia} className="sessao-cardio">
          <legend>{nomes[s.dia]}</legend>
          <label htmlFor={`pc-mod-${s.dia}`}>{t('Modalidade')}</label>
          <select id={`pc-mod-${s.dia}`} value={s.modalidade} onChange={(e) => mudar(s.dia, { modalidade: e.target.value as Modalidade })}>
            {MODALIDADES.map((x) => <option key={x} value={x}>{NOMES_MODALIDADES[x]}</option>)}
          </select>
          <div className="linha">
            <div>
              <label htmlFor={`pc-min-${s.dia}`}>{t('Minutos')}</label>
              <input id={`pc-min-${s.dia}`} inputMode="numeric" value={Number.isNaN(s.minutos) ? '' : s.minutos} onChange={(e) => mudar(s.dia, { minutos: e.target.value.trim() ? Number(e.target.value) : NaN })} />
            </div>
            <div>
              <label htmlFor={`pc-esf-${s.dia}`}>{t('Esforço (0–10)')}</label>
              <select id={`pc-esf-${s.dia}`} value={s.esforco} onChange={(e) => mudar(s.dia, { esforco: Number(e.target.value) })}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
      ))}
      <div className="linha">
        <div>
          <label htmlFor="pc-semanas">{t('Semanas')}</label>
          <input id="pc-semanas" inputMode="numeric" value={semanas} onChange={(e) => setSemanas(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pc-progressao">{t('Subida por semana')}</label>
          <select id="pc-progressao" value={progressaoPct} onChange={(e) => setProgressao(Number(e.target.value))}>
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i} %</option>)}
          </select>
        </div>
      </div>
      <p className="secundario">{t('Subir no máximo 10 % por semana dá tempo ao corpo para se adaptar.')}</p>
      {valido && <p className="secundario">{t('Última semana: {min} min no total.', { min: ultima.reduce((n, s) => n + s.minutos, 0) })}</p>}
      {valido && avisosPersonalizado(p).map((a) => <p key={a} className="cartao aviso">{a}</p>)}
      {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      <button className="primario largo" style={{ marginTop: 8 }} onClick={guardar}>{t('Começar programa personalizado')}</button>
    </div>
  )
}

export function ProgramasCardioEcra({ dados }: { dados: Dados }) {
  const ativo = dados.programaCardio
  const [personalizar, setPersonalizar] = useState(false)

  async function comecar(id: IdPrograma | 'personalizado', personalizado?: Personalizado) {
    if (ativo && !confirm(t('Trocar de programa? O programa atual termina; os registos de cardio ficam.'))) return
    const novo: ProgramaAtivo = { id, inicio: hojeIso(), ...(personalizado ? { personalizado } : {}), ...(ativo?.soCardio ? { soCardio: true } : {}) }
    await db.gravar('programaCardio', novo)
    setPersonalizar(false)
    window.scrollTo(0, 0)
  }

  async function terminar() {
    if (!confirm(t('Terminar o programa de cardio? Os registos de cardio ficam.'))) return
    await db.gravar('programaCardio', null)
  }

  return (
    <>
      <button onClick={() => (history.length > 1 ? history.back() : ir('/mais'))} style={{ marginTop: 12 }}>‹ {t('Voltar')}</button>
      <h1>{t('Programas de cardio')}</h1>
      <p className="secundario">{t('Cada programa sobe aos poucos, semana a semana. Cada cardio que registas conta como uma sessão, e as semanas contam a partir do dia em que começas.')}</p>

      {ativo && (
        <>
          <CartaoProgramaCardio dados={dados} />
          <div className="cartao">
            {/* F37.5: plano só de cardio, com a recomendação de força sempre à vista. */}
            <label className="opcao">
              <input type="checkbox" checked={!!ativo.soCardio} onChange={(e) => db.gravar('programaCardio', { ...ativo, soCardio: e.target.checked })} /> {t('Só cardio: pôr o programa em primeiro lugar no Início e no Treino de hoje')}
            </label>
            <p className="secundario">{textoForca()}</p>
            <button className="largo" onClick={terminar}>{t('Terminar programa')}</button>
          </div>
        </>
      )}

      <h2>{t('Escolher um programa')}</h2>
      {PROGRAMAS.map((id) => {
        const motivo = dados.anamnese ? bloqueio(id, dados.anamnese, dados.fasePosParto?.fase === 'regresso') : null
        const atual = ativo?.id === id
        return (
          <section key={id} className="cartao" aria-labelledby={`programa-${id}`}>
            <h3 id={`programa-${id}`}>{NOMES_PROGRAMAS[id].nome}</h3>
            <p>{NOMES_PROGRAMAS[id].descricao}</p>
            {id === 'emagrecer' && <p className="secundario">{t('Sem mudar a alimentação, o cardio sozinho emagrece pouco: a diferença grande vem de comer um pouco menos. Este programa ajuda, mas não faz milagres.')}</p>}
            {motivo ? <p className="secundario">🔒 {motivo}</p> : <button className={atual ? 'largo' : 'primario largo'} disabled={atual} onClick={() => comecar(id)}>{atual ? t('Programa atual') : t('Começar')}</button>}
          </section>
        )
      })}
      <section className="cartao" aria-labelledby="programa-personalizado">
        <h3 id="programa-personalizado">{NOMES_PROGRAMAS.personalizado.nome}</h3>
        <p>{NOMES_PROGRAMAS.personalizado.descricao}</p>
        {personalizar
          ? <EditorPersonalizado inicial={ativo?.personalizado} comecar={(p) => comecar('personalizado', p)} />
          : <button className="largo" onClick={() => setPersonalizar(true)}>{ativo?.id === 'personalizado' ? t('Mudar o programa personalizado') : t('Criar programa personalizado')}</button>}
      </section>
    </>
  )
}
