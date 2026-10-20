import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { dataCurta, diasDesde, hojeIso, kg, novoId, type Dados } from './dados'

export function Medicoes({ dados }: { dados: Dados }) {
  const [data, setData] = useState(hojeIso())
  const [peso, setPeso] = useState('')
  const [cintura, setCintura] = useState('')
  const [erro, setErro] = useState('')
  const ultima = dados.medicoes.at(-1)
  const dias = diasDesde(ultima?.data)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const p = peso ? Number(peso.replace(',', '.')) : undefined
    const c = cintura ? Number(cintura.replace(',', '.')) : undefined
    if (p === undefined && c === undefined) return setErro('Indica o peso, a cintura ou ambos.')
    if (p !== undefined && !(p >= 20 && p <= 400)) return setErro('Peso inválido.')
    if (c !== undefined && !(c >= 30 && c <= 250)) return setErro('Cintura inválida.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Data inválida.')
    setErro('')
    await db.medicoes.put({ id: novoId(), data, ...(p !== undefined ? { pesoKg: p } : {}), ...(c !== undefined ? { cinturaCm: c } : {}) })
    setPeso('')
    setCintura('')
  }

  return (
    <>
      <h1>Medições</h1>
      {dias > 7 && (
        <p className="cartao aviso">{ultima ? `Última medição há ${Math.floor(dias)} dias.` : 'Ainda sem medições.'} Pesa-te de manhã, em jejum, e mede a cintura à altura do umbigo.</p>
      )}
      <form className="cartao" onSubmit={guardar} noValidate>
        <label htmlFor="data">Data</label>
        <input id="data" type="date" value={data} max={hojeIso()} onChange={(e) => setData(e.target.value)} />
        <div className="linha">
          <div><label htmlFor="peso">Peso (kg)</label><input id="peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
          <div><label htmlFor="cintura">Cintura (cm)</label><input id="cintura" inputMode="decimal" value={cintura} onChange={(e) => setCintura(e.target.value)} /></div>
        </div>
        {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <button type="submit" className="primario largo" style={{ marginTop: 12 }}>Guardar medição</button>
      </form>
      {dados.medicoes.length > 0 && (
        <div className="cartao">
          <ul className="lista">
            {[...dados.medicoes].reverse().map((m) => (
              <li key={m.id} className="linha" style={{ padding: '6px 0' }}>
                <span>{dataCurta(m.data)}</span>
                <span>{m.pesoKg !== undefined ? `${kg(m.pesoKg)} kg` : '–'}</span>
                <span>{m.cinturaCm !== undefined ? `${kg(m.cinturaCm)} cm` : '–'}</span>
                <button style={{ flex: 'none', minHeight: 36 }} aria-label={`Apagar medição de ${dataCurta(m.data)}`} onClick={() => confirm('Apagar esta medição?') && db.medicoes.delete(m.id)}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
