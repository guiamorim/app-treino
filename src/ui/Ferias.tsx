import { useState } from 'react'
import { db } from '../data/db'
import { feriasAtivas, validarFerias, type Ferias } from '../domain/ferias'
import type { Equipamento } from '../domain/types'
import { locale, t } from '../i18n'
import { hojeIso, type Dados } from './dados'
import { ListaEquipamento, NOMES_EQUIPAMENTO } from './Equipamento'

const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })

/** F29 (v1.18): modo férias em «Mais». */
export function CartaoFerias({ dados }: { dados: Dados }) {
  const hoje = hojeIso()
  const marcadas = dados.ferias && dados.ferias.fim >= hoje ? dados.ferias : undefined
  const [aEditar, setAEditar] = useState(false)
  const [inicio, setInicio] = useState(hoje)
  const [fim, setFim] = useState(somarDias(hoje, 6))
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [erro, setErro] = useState('')

  async function guardar() {
    const problema = validarFerias({ inicio, fim })
    if (problema) return setErro(problema)
    const f: Ferias = { inicio, fim, equipamentos }
    await db.gravar('ferias', f)
    setAEditar(false)
    setErro('')
  }

  async function terminar() {
    if (!confirm(t('Terminar o modo férias? O plano volta ao normal já no próximo treino.'))) return
    await db.gravar('ferias', null)
  }

  const lista = (f: Ferias) => (f.equipamentos.length ? f.equipamentos.map((q) => NOMES_EQUIPAMENTO[q as keyof typeof NOMES_EQUIPAMENTO]).join(', ') : t('só o peso do corpo'))

  return (
    <div className="cartao">
      <h3>{t('Modo férias')}</h3>
      {marcadas && !aEditar ? (
        <>
          <p role="status">
            {feriasAtivas(marcadas, hoje)
              ? t('Ativo até {fim}. Os exercícios estão adaptados a: {lista}.', { fim: dataLonga(marcadas.fim), lista: lista(marcadas) })
              : t('Marcado de {inicio} a {fim}, com: {lista}.', { inicio: dataLonga(marcadas.inicio), fim: dataLonga(marcadas.fim), lista: lista(marcadas) })}
          </p>
          <p className="secundario">{t('O teu plano não muda: no fim, volta tudo ao normal e a progressão continua de onde ficou.')}</p>
          <button className="largo" onClick={() => void terminar()}>{feriasAtivas(marcadas, hoje) ? t('Terminar férias') : t('Cancelar férias')}</button>
        </>
      ) : aEditar ? (
        <>
          <div className="linha">
            <div><label htmlFor="ferias-inicio">{t('Data de início')}</label><input id="ferias-inicio" type="date" value={inicio} min={hoje} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><label htmlFor="ferias-fim">{t('Data de fim')}</label><input id="ferias-fim" type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
          <ListaEquipamento valor={equipamentos} mudar={setEquipamentos} titulo={t('Que equipamento vais ter')} nome="equipamento-ferias" />
          {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
          <div className="linha" style={{ marginTop: 8 }}>
            <button type="button" onClick={() => setAEditar(false)}>{t('Cancelar')}</button>
            <button type="button" className="primario" onClick={() => void guardar()}>{t('Ativar modo férias')}</button>
          </div>
        </>
      ) : (
        <>
          <p className="secundario">{t('Vais estar fora do ginásio? Durante as datas que escolheres, cada exercício que não dá para fazer passa a um parecido com o equipamento que tiveres (ou só com o peso do corpo).')}</p>
          <button className="largo" onClick={() => setAEditar(true)} disabled={!dados.plano}>{t('Marcar férias')}</button>
        </>
      )}
    </div>
  )
}
