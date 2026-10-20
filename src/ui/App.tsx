import { useDados } from './dados'
import { useRota } from './rota'
import { AnamneseEcra } from './AnamneseEcra'
import { Hoje } from './Hoje'
import { ExercicioEcra } from './ExercicioEcra'
import { Relatorios } from './Relatorios'
import { Medicoes } from './Medicoes'
import { Mais } from './Mais'

const SEPARADORES = [
  { rota: 'hoje', nome: 'Hoje', icone: '🏋️' },
  { rota: 'relatorios', nome: 'Relatórios', icone: '📈' },
  { rota: 'medicoes', nome: 'Medições', icone: '⚖️' },
  { rota: 'mais', nome: 'Mais', icone: '⋯' },
] as const

export function App() {
  const dados = useDados()
  const rota = useRota()
  if (!dados) return <p className="secundario">A carregar…</p>
  if (!dados.anamnese || !dados.plano || rota.ecra === 'anamnese') return <AnamneseEcra dados={dados} />

  const ativo = rota.ecra === 'exercicio' ? 'hoje' : rota.ecra
  return (
    <>
      <main>
        {rota.ecra === 'hoje' && <Hoje dados={dados} plano={dados.plano} />}
        {rota.ecra === 'exercicio' && <ExercicioEcra dados={dados} plano={dados.plano} prescricaoId={rota.prescricaoId} />}
        {rota.ecra === 'relatorios' && <Relatorios dados={dados} />}
        {rota.ecra === 'medicoes' && <Medicoes dados={dados} />}
        {rota.ecra === 'mais' && <Mais dados={dados} />}
      </main>
      <nav className="navegacao" aria-label="Principal">
        {SEPARADORES.map((s) => (
          <a key={s.rota} href={`#/${s.rota}`} aria-current={ativo === s.rota ? 'page' : undefined}>
            <span className="icone" aria-hidden="true">{s.icone}</span>
            {s.nome}
          </a>
        ))}
      </nav>
    </>
  )
}
