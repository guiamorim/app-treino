// F36 (v1.25): registar cardio (complemento do treino do dia ou avulso) e os minutos da semana.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { cardioEntre, intensidade, LIMITES, META_OMS, MODALIDADES, NOMES_MODALIDADES, testeDaFala, validarCardio, zonasFc, type ErroCardio, type Modalidade, type RegistoCardio } from '../domain/cardio'
import { diaLocal, meioDia } from '../domain/calendario'
import { inicioSemana } from '../domain/relatorios'
import { decimal } from '../domain/unidades'
import { t } from '../i18n'
import { agoraIso, dataCurta, hojeIso, novoId, type Dados } from './dados'
import { ir } from './rota'
import { NOMES_PROGRAMAS, progresso } from '../domain/programasCardio'

const ERROS: Record<ErroCardio, () => string> = {
  modalidade: () => t('Escolhe a modalidade.'),
  minutos: () => t('Indica os minutos, entre {min} e {max}.', { min: LIMITES.minutos[0], max: LIMITES.minutos[1] }),
  esforco: () => t('Escolhe o esforço, de 0 a 10.'),
  distancia: () => t('A distância tem de estar entre {min} e {max} km.', { min: decimal(LIMITES.distanciaKm[0]), max: LIMITES.distanciaKm[1] }),
  fc: () => t('A frequência cardíaca média tem de estar entre {min} e {max} bpm.', { min: LIMITES.fcMedia[0], max: LIMITES.fcMedia[1] }),
  data: () => t('Escolhe um dia até hoje.'),
}

const numero = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined)
const voltar = () => (history.length > 1 ? history.back() : ir('/inicio'))

/** Uma linha com o registo: «Bicicleta · 30 min · esforço 6/10 · 12 km · 132 bpm». */
export const textoCardio = (r: RegistoCardio) =>
  [NOMES_MODALIDADES[r.modalidade], t('{min} min', { min: r.minutos }), t('esforço {n}/10', { n: r.esforco }), r.distanciaKm !== undefined ? `${decimal(r.distanciaKm)} km` : '', r.fcMedia !== undefined ? `${r.fcMedia} bpm` : '']
    .filter(Boolean)
    .join(' · ')

/** F36.1: botão para registar cardio; dentro de um treino aberto, fica ligado a essa sessão. */
export function BotaoCardio({ sessaoId, texto, largo = true }: { sessaoId?: string; texto?: string; largo?: boolean }) {
  return (
    <button className={largo ? 'largo' : undefined} onClick={() => ir(sessaoId ? `/cardio/${encodeURIComponent(sessaoId)}` : '/cardio')}>
      ♥ {texto ?? t('Registar cardio')}
    </button>
  )
}

export function CardioEcra({ dados, sessaoId }: { dados: Dados; sessaoId?: string }) {
  const hoje = hojeIso()
  // F37.4: «programa» abre o registo com a próxima sessão do programa de cardio.
  const doPrograma = sessaoId === 'programa' && dados.programaCardio ? progresso(dados.programaCardio, dados.cardio, hoje).proxima : undefined
  const sessao = sessaoId && !doPrograma ? dados.sessoes.find((s) => s.id === sessaoId && !s.fim) : undefined
  const treino = sessao && dados.plano?.treinos.find((x) => x.id === sessao.treinoId)
  const ultimo = dados.cardio.at(-1)
  const [modalidade, setModalidade] = useState<Modalidade>(doPrograma?.modalidade ?? ultimo?.modalidade ?? 'caminhada')
  const [minutos, setMinutos] = useState(doPrograma ? String(doPrograma.minutos) : treino?.cardioMin ? String(treino.cardioMin) : '')
  const [esforco, setEsforco] = useState(doPrograma ? doPrograma.esforco[0] : 5)
  const [dia, setDia] = useState(hoje)
  const [distancia, setDistancia] = useState('')
  const [fc, setFc] = useState('')
  const [erro, setErro] = useState('')
  const [gravado, setGravado] = useState<{ registo: RegistoCardio; antes: number; depois: number } | null>(null)
  const zonas = dados.anamnese ? zonasFc(dados.anamnese.idade) : undefined
  // A sessão aberta agora mesmo no Treino de hoje pode chegar um instante depois: os minutos do plano preenchem-se uma vez.
  const preenchido = useRef(!!treino?.cardioMin)
  useEffect(() => {
    if (preenchido.current || !treino?.cardioMin) return
    preenchido.current = true
    setMinutos((atual) => atual || String(treino.cardioMin))
  }, [treino?.cardioMin])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const distanciaKm = numero(distancia)
    const fcMedia = numero(fc)
    const registo: RegistoCardio = {
      id: novoId(),
      // Registado hoje, fica a hora atual; num dia anterior, o meio-dia local desse dia.
      data: dia === hoje ? agoraIso() : meioDia(dia),
      modalidade,
      minutos: Number(minutos.trim() || NaN),
      esforco,
      ...(distanciaKm !== undefined ? { distanciaKm } : {}),
      ...(fcMedia !== undefined ? { fcMedia } : {}),
      ...(sessao && dia === hoje ? { sessaoId: sessao.id } : {}),
    }
    const problema = validarCardio(registo, dia, hoje)
    if (problema) return setErro(ERROS[problema]())
    setErro('')
    const ini = inicioSemana(new Date(registo.data))
    const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 7)
    const antes = cardioEntre(dados.cardio, ini, fim).equivalentes
    await db.cardio.put(registo)
    setGravado({ registo, antes, depois: cardioEntre([...dados.cardio, registo], ini, fim).equivalentes })
    setMinutos('')
    setDistancia('')
    setFc('')
  }

  return (
    <>
      <button onClick={voltar} style={{ marginTop: 12 }}>‹ {t('Voltar')}</button>
      <h1>{t('Registar cardio')}</h1>
      {treino && <p className="secundario">{t('Junta-se ao treino de hoje: {treino}.', { treino: treino.nome })}</p>}
      {doPrograma && dados.programaCardio && <p className="secundario">{t('Sessão do programa «{programa}».', { programa: NOMES_PROGRAMAS[dados.programaCardio.id].nome })}</p>}

      {gravado && (
        <div className="cartao ok-borda" role="status">
          <p><strong>{t('Cardio registado:')}</strong> {textoCardio(gravado.registo)}</p>
          <p className="secundario">
            {diaLocal(gravado.registo.data) === hoje ? t('Esta semana: {n} de {meta} min recomendados.', { n: gravado.depois, meta: META_OMS[0] }) : t('Nessa semana: {n} de {meta} min recomendados.', { n: gravado.depois, meta: META_OMS[0] })}
          </p>
          {/* F36.4: com as mensagens de parabéns ligadas (F35.4), assinala quando a semana chega à meta. */}
          {dados.parabens && gravado.antes < META_OMS[0] && gravado.depois >= META_OMS[0] && <p>🎉 {t('Chegaste aos {meta} minutos semanais recomendados pela OMS. Muito bem!', { meta: META_OMS[0] })}</p>}
          <button className="largo" onClick={voltar}>{t('Voltar')}</button>
        </div>
      )}

      <form className="cartao" onSubmit={guardar} noValidate>
        <label htmlFor="cardio-modalidade">{t('Modalidade')}</label>
        <select id="cardio-modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value as Modalidade)}>
          {MODALIDADES.map((x) => <option key={x} value={x}>{NOMES_MODALIDADES[x]}</option>)}
        </select>
        <div className="linha">
          <div>
            <label htmlFor="cardio-minutos">{t('Minutos')}</label>
            <input id="cardio-minutos" inputMode="numeric" value={minutos} onChange={(e) => { setMinutos(e.target.value); setGravado(null) }} />
          </div>
          <div>
            <label htmlFor="cardio-dia">{t('Dia')}</label>
            <input id="cardio-dia" type="date" value={dia} max={hoje} onChange={(e) => setDia(e.target.value)} />
          </div>
        </div>

        <label htmlFor="cardio-esforco">{t('Esforço: {n} de 10', { n: esforco })}</label>
        <input id="cardio-esforco" type="range" min={0} max={10} value={esforco} aria-valuetext={t('{n} de 10', { n: esforco })} onChange={(e) => setEsforco(Number(e.target.value))} />
        {/* F36.2: teste da fala, a forma de medir a intensidade sem relógio. */}
        <p className="secundario" aria-live="polite">{testeDaFala(esforco)} {intensidade(esforco) === 'leve' && t('Não conta para a meta da OMS.')}</p>

        <div className="linha">
          <div>
            <label htmlFor="cardio-distancia">{t('Distância em km (opcional)')}</label>
            <input id="cardio-distancia" inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cardio-fc">{t('FC média em bpm (opcional)')}</label>
            <input id="cardio-fc" inputMode="numeric" value={fc} onChange={(e) => setFc(e.target.value)} />
          </div>
        </div>
        {zonas && (
          <details style={{ marginTop: 8 }}>
            <summary>{t('Zonas de frequência cardíaca (nota)')}</summary>
            <p className="secundario">
              {t('Pela tua idade, a frequência máxima estimada é {max} bpm: moderado {m1}–{m2} bpm, vigoroso {v1}–{v2} bpm.', { max: zonas.max, m1: zonas.moderada[0], m2: zonas.moderada[1], v1: zonas.vigorosa[0], v2: zonas.vigorosa[1] })}{' '}
              {t('Estas fórmulas erram muito de pessoa para pessoa (10 bpm ou mais); o teste da fala e o esforço contam mais.')}
            </p>
          </details>
        )}
        {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <button type="submit" className="primario largo" style={{ marginTop: 12 }}>{t('Guardar cardio')}</button>
      </form>
    </>
  )
}

/** F36.3: minutos de cardio da semana, comparados com a OMS, e os registos dessa semana. */
export function CardioSemana({ dados, inicio, fim }: { dados: Dados; inicio: Date; fim: Date }) {
  const r = cardioEntre(dados.cardio, inicio, fim)
  const escala = META_OMS[1]
  return (
    <div className="cartao">
      <h3>{t('Cardio')} <span className="secundario">{dataCurta(inicio.toISOString())} – {dataCurta(new Date(fim.getTime() - 1).toISOString())}</span></h3>
      <div className="linha"><span>{t('Minutos equivalentes')}</span><span style={{ textAlign: 'right' }} className="secundario">{r.equivalentes} / {META_OMS[0]}–{META_OMS[1]}</span></div>
      <div className="barra" aria-hidden="true">
        <span className="alvo" style={{ left: `${(META_OMS[0] / escala) * 100}%`, width: `${((META_OMS[1] - META_OMS[0]) / escala) * 100}%` }} />
        <span style={{ width: `${Math.min(100, (r.equivalentes / escala) * 100)}%`, background: r.equivalentes >= META_OMS[0] ? 'var(--ok)' : 'var(--acento)' }} />
      </div>
      <p className="secundario">
        {t('{total} min no total: {mod} moderados, {vig} vigorosos.', { total: r.minutos, mod: r.moderados, vig: r.vigorosos })}{' '}
        {t('A OMS recomenda 150–300 min moderados por semana; um minuto vigoroso conta como dois e o leve não conta.')}
      </p>
      {r.registos.length > 0 && (
        <ul className="lista">
          {[...r.registos].reverse().map((x) => (
            <li key={x.id} className="linha" style={{ padding: '6px 0' }}>
              <span style={{ flex: 'none' }}>{dataCurta(x.data)}</span>
              <span>{textoCardio(x)}</span>
              <button style={{ flex: 'none', minHeight: 36 }} aria-label={t('Apagar cardio de {data}', { data: dataCurta(x.data) })} onClick={() => confirm(t('Apagar este registo de cardio?')) && db.cardio.delete(x.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <BotaoCardio />
    </div>
  )
}
