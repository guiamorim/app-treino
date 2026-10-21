import { useRef, useState } from 'react'
import { db } from '../data/db'
import { compararFotos, fotosPorMes } from '../domain/fotos'
import { POSES, type FotoAvaliacao, type Pose } from '../domain/types'
import { dataCurta, diasDesde, hojeIso, kg, novoId, type Dados } from './dados'
import { reduzirImagem } from './imagem'

const NOMES_POSES: Record<Pose, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }
const MAX_LADO = 1280

const nomeMes = (mes: string) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
const sinal = (n: number, unidade: string) => `${n > 0 ? '+' : ''}${kg(n)} ${unidade}`

export function Fotos({ dados }: { dados: Dados }) {
  const ficheiro = useRef<HTMLInputElement>(null)
  const [data, setData] = useState(hojeIso())
  const [pose, setPose] = useState<Pose>('frente')
  const [nota, setNota] = useState('')
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)
  const [aberta, setAberta] = useState<FotoAvaliacao | null>(null)

  const meses = fotosPorMes(dados.fotos)
  const ultima = dados.fotos.map((f) => f.data).sort().at(-1)
  const dias = diasDesde(ultima)

  const [mesAntes, setMesAntes] = useState(meses.at(-1)?.mes ?? '')
  const [mesDepois, setMesDepois] = useState(meses[0]?.mes ?? '')
  const [poseComparar, setPoseComparar] = useState<Pose>('frente')
  const antes = mesAntes || meses.at(-1)?.mes || ''
  const depois = mesDepois || meses[0]?.mes || ''
  const comp = meses.length >= 2 ? compararFotos(dados.fotos, dados.medicoes, antes, depois, poseComparar) : {}

  async function adicionar(f: File) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Data inválida.')
    setErro('')
    setAGravar(true)
    try {
      const imagem = await reduzirImagem(f, MAX_LADO)
      await db.fotos.put({ id: novoId(), data, pose, imagem, ...(nota.trim() ? { nota: nota.trim().slice(0, 200) } : {}) })
      setNota('')
    } catch {
      setErro('Não foi possível ler esta imagem. Experimenta outra foto.')
    } finally {
      setAGravar(false)
    }
  }

  return (
    <>
      <h1>Fotos</h1>
      <p className="secundario">Fotos de avaliação para comparares mês a mês. Ficam só neste dispositivo.</p>
      {dias > 30 && (
        <p className="cartao aviso">
          {ultima ? `Última foto há ${Math.floor(dias)} dias.` : 'Ainda sem fotos.'} Tira-as com a mesma luz, à mesma hora e à mesma distância, para a comparação ser justa.
        </p>
      )}

      <div className="cartao">
        <div className="linha">
          <div><label htmlFor="foto-data">Data</label><input id="foto-data" type="date" value={data} max={hojeIso()} onChange={(e) => setData(e.target.value)} /></div>
          <div><label htmlFor="foto-pose">Pose</label>
            <select id="foto-pose" value={pose} onChange={(e) => setPose(e.target.value as Pose)}>
              {POSES.map((p) => <option key={p} value={p}>{NOMES_POSES[p]}</option>)}
            </select>
          </div>
        </div>
        <label htmlFor="foto-nota">Nota (opcional)</label>
        <input id="foto-nota" maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="ex.: manhã, em jejum" />
        <button className="primario largo" style={{ marginTop: 12 }} disabled={aGravar} onClick={() => ficheiro.current?.click()}>
          {aGravar ? 'A guardar…' : 'Adicionar foto'}
        </button>
        <input ref={ficheiro} type="file" accept="image/*" hidden aria-label="Escolher foto" onChange={(e) => { const f = e.target.files?.[0]; if (f) void adicionar(f); e.target.value = '' }} />
        {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      </div>

      {meses.length >= 2 && (
        <>
          <h2>Comparar</h2>
          <div className="cartao">
            <div className="linha">
              <div><label htmlFor="cmp-antes">Antes</label>
                <select id="cmp-antes" value={antes} onChange={(e) => setMesAntes(e.target.value)}>
                  {meses.map((m) => <option key={m.mes} value={m.mes}>{nomeMes(m.mes)}</option>)}
                </select>
              </div>
              <div><label htmlFor="cmp-depois">Depois</label>
                <select id="cmp-depois" value={depois} onChange={(e) => setMesDepois(e.target.value)}>
                  {meses.map((m) => <option key={m.mes} value={m.mes}>{nomeMes(m.mes)}</option>)}
                </select>
              </div>
            </div>
            <div className="linha" role="radiogroup" aria-label="Pose a comparar" style={{ marginTop: 8 }}>
              {POSES.map((p) => (
                <button key={p} role="radio" aria-checked={poseComparar === p} className={poseComparar === p ? 'primario' : undefined} onClick={() => setPoseComparar(p)}>{NOMES_POSES[p]}</button>
              ))}
            </div>
            <div className="comparacao">
              {[comp.antes, comp.depois].map((lado, i) => (
                <figure key={i}>
                  {lado ? <img src={lado.foto.imagem} alt={`${NOMES_POSES[poseComparar]}, ${dataCurta(lado.foto.data)}`} /> : <div className="sem-foto">Sem foto de {NOMES_POSES[poseComparar].toLowerCase()} neste mês</div>}
                  {lado && (
                    <figcaption className="secundario">
                      {dataCurta(lado.foto.data)}
                      {lado.medicao?.pesoKg !== undefined && ` · ${kg(lado.medicao.pesoKg)} kg`}
                      {lado.medicao?.cinturaCm !== undefined && ` · ${kg(lado.medicao.cinturaCm)} cm`}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
            {(comp.difPesoKg !== undefined || comp.difCinturaCm !== undefined) && (
              <p role="status">
                Diferença: {[comp.difPesoKg !== undefined && sinal(comp.difPesoKg, 'kg'), comp.difCinturaCm !== undefined && sinal(comp.difCinturaCm, 'cm de cintura')].filter(Boolean).join(' · ')}
              </p>
            )}
            {comp.antes && comp.depois && !comp.antes.medicao && <p className="secundario">Regista peso e cintura em Medições perto da data das fotos para veres a diferença.</p>}
          </div>
        </>
      )}

      {meses.map((m) => (
        <section key={m.mes}>
          <h2>{nomeMes(m.mes)}</h2>
          <ul className="galeria">
            {m.fotos.map((f) => (
              <li key={f.id}>
                <button onClick={() => setAberta(f)} aria-label={`Ver foto de ${NOMES_POSES[f.pose].toLowerCase()}, ${dataCurta(f.data)}`}>
                  <img src={f.imagem} alt="" />
                  <span className="secundario">{NOMES_POSES[f.pose]} · {dataCurta(f.data)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {aberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Foto" onClick={() => setAberta(null)}>
          <img className="foto-grande" src={aberta.imagem} alt={`${NOMES_POSES[aberta.pose]}, ${dataCurta(aberta.data)}`} />
          <p style={{ color: '#cbd5e1', textAlign: 'center' }}>{NOMES_POSES[aberta.pose]} · {dataCurta(aberta.data)}{aberta.nota ? ` · ${aberta.nota}` : ''}</p>
          <div className="acoes" onClick={(e) => e.stopPropagation()}>
            <button className="perigo" onClick={async () => { if (confirm('Apagar esta foto?')) { await db.fotos.delete(aberta.id); setAberta(null) } }}>Apagar</button>
            <button className="primario" onClick={() => setAberta(null)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  )
}
