import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { INFO_MEDIDAS, MEDIDAS_CM, type MedidaCm } from '../domain/types'
import { decimal, deUnidade, peso as textoPeso } from '../domain/unidades'
import { dataCurta, diasDesde, hojeIso, novoId, type Dados } from './dados'
import { t } from '../i18n'

const EXTRAS = MEDIDAS_CM.filter((k) => k !== 'cinturaCm')
const vazias = (): Record<MedidaCm, string> => ({ cinturaCm: '', peitoCm: '', bracoCm: '', ancaCm: '', coxaCm: '' })
const numero = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined)

export function Medicoes({ dados }: { dados: Dados }) {
  const [data, setData] = useState(hojeIso())
  const [peso, setPeso] = useState('')
  const [medidas, setMedidas] = useState(vazias)
  const [erro, setErro] = useState('')
  const ultima = dados.medicoes.at(-1)
  const dias = diasDesde(ultima?.data)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    // F22.9: escreve-se na unidade escolhida, guarda-se em quilos.
    const escrito = numero(peso)
    const p = escrito === undefined ? undefined : deUnidade(escrito)
    const valores = MEDIDAS_CM.map((k) => [k, numero(medidas[k])] as const).filter((x): x is readonly [MedidaCm, number] => x[1] !== undefined)
    if (p === undefined && valores.length === 0) return setErro(t('Indica o peso ou pelo menos uma medida.'))
    if (p !== undefined && !(p >= 20 && p <= 400)) return setErro(t('Peso inválido.'))
    const errada = valores.find(([k, v]) => !(v >= INFO_MEDIDAS[k].min && v <= INFO_MEDIDAS[k].max))
    if (errada) return setErro(t('{medida}: valor inválido.', { medida: INFO_MEDIDAS[errada[0]].nome }))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro(t('Data inválida.'))
    setErro('')
    await db.medicoes.put({ id: novoId(), data, ...(p !== undefined ? { pesoKg: p } : {}), ...Object.fromEntries(valores) })
    setPeso('')
    setMedidas(vazias())
  }

  const campo = (k: MedidaCm) => (
    <div key={k}>
      <label htmlFor={k}>{INFO_MEDIDAS[k].nome} (cm)</label>
      <input id={k} inputMode="decimal" value={medidas[k]} onChange={(e) => setMedidas({ ...medidas, [k]: e.target.value })} />
    </div>
  )

  return (
    <>
      <h1>{t('Medições')}</h1>
      <AbasCorpo ativa="medicoes" />
      {dias > 7 && (
        <p className="cartao aviso">{ultima ? t('Última medição há {n} dias.', { n: Math.floor(dias) }) : t('Ainda sem medições.')} {t('Pesa-te de manhã, em jejum, e mede a cintura à altura do umbigo.')}</p>
      )}
      <form className="cartao" onSubmit={guardar} noValidate>
        <label htmlFor="data">{t('Data')}</label>
        <input id="data" type="date" value={data} max={hojeIso()} onChange={(e) => setData(e.target.value)} />
        <div className="linha">
          <div><label htmlFor="peso">{t('Peso ({u})', { u: dados.unidade })}</label><input id="peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
          {campo('cinturaCm')}
        </div>
        <details style={{ marginTop: 8 }}>
          <summary>{t('Mais medidas (opcional)')}</summary>
          <div className="grelha-medidas">{EXTRAS.map(campo)}</div>
          <p className="secundario">{t('Fita métrica justa sem apertar a pele, de manhã, sempre do mesmo lado do corpo.')}</p>
          <ul className="secundario">
            {MEDIDAS_CM.map((k) => <li key={k}><strong>{INFO_MEDIDAS[k].nome}:</strong> {INFO_MEDIDAS[k].onde}</li>)}
          </ul>
        </details>
        {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <button type="submit" className="primario largo" style={{ marginTop: 12 }}>{t('Guardar medição')}</button>
      </form>
      {dados.medicoes.length > 0 && (
        <div className="cartao">
          <ul className="lista">
            {[...dados.medicoes].reverse().map((m) => {
              const extras = EXTRAS.filter((k) => m[k] !== undefined).map((k) => `${INFO_MEDIDAS[k].nome} ${decimal(m[k]!)}`)
              return (
                <li key={m.id} style={{ padding: '6px 0' }}>
                  <div className="linha">
                    <span>{dataCurta(m.data)}</span>
                    <span>{m.pesoKg !== undefined ? textoPeso(m.pesoKg) : '–'}</span>
                    <span>{m.cinturaCm !== undefined ? `${decimal(m.cinturaCm)} cm` : '–'}</span>
                    <button style={{ flex: 'none', minHeight: 36 }} aria-label={t('Apagar medição de {data}', { data: dataCurta(m.data) })} onClick={() => confirm(t('Apagar esta medição?')) && db.medicoes.delete(m.id)}>✕</button>
                  </div>
                  {extras.length > 0 && <div className="secundario">{extras.join(' · ')} cm</div>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}

/** F33.2: «Medições» e «Fotos» partilham o mesmo separador da barra de baixo. */
export function AbasCorpo({ ativa }: { ativa: 'medicoes' | 'fotos' }) {
  return (
    <nav className="abas" aria-label={t('Medições e fotos')}>
      <a className="botao" href="#/medicoes" aria-current={ativa === 'medicoes' ? 'page' : undefined}>{t('Medidas')}</a>
      <a className="botao" href="#/fotos" aria-current={ativa === 'fotos' ? 'page' : undefined}>{t('Fotos')}</a>
    </nav>
  )
}
