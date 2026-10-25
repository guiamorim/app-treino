import { useEffect } from 'react'
import { db } from '../data/db'
import { useDados } from './dados'
import { useRota } from './rota'
import { AnamneseEcra } from './AnamneseEcra'
import { Hoje } from './Hoje'
import { Inicio } from './Inicio'
import { ExercicioEcra } from './ExercicioEcra'
import { Relatorios } from './Relatorios'
import { Medicoes } from './Medicoes'
import { Mais } from './Mais'
import { Fotos } from './Fotos'
import { AlongamentoEcra } from './Alongamento'
import { AvisoAtualizacao } from './Atualizacao'
import { VERSAO } from './versao'

const SEPARADORES = [
  { rota: 'inicio', nome: 'Início', icone: '🏠' },
  { rota: 'hoje', nome: 'Hoje', icone: '🏋️' },
  { rota: 'relatorios', nome: 'Relatórios', icone: '📈' },
  { rota: 'medicoes', nome: 'Medições', icone: '⚖️' },
  { rota: 'fotos', nome: 'Fotos', icone: '📷' },
  { rota: 'mais', nome: 'Mais', icone: '⋯' },
] as const

export function App() {
  const dados = useDados()
  const rota = useRota()
  const instalacaoNova = !!dados && !dados.plano && dados.versaoVista === undefined
  // F20: numa instalação nova não há novidades a mostrar; fica registada a versão atual.
  useEffect(() => {
    if (instalacaoNova) db.gravar('versaoVista', VERSAO)
  }, [instalacaoNova])
  if (!dados) return <p className="secundario">A carregar…</p>
  if (!dados.anamnese || !dados.plano || rota.ecra === 'anamnese') return <AnamneseEcra dados={dados} />

  const ativo = rota.ecra === 'exercicio' ? 'hoje' : rota.ecra
  return (
    <>
      <main>
        {rota.ecra !== 'exercicio' && <AvisoAtualizacao />}
        {rota.ecra === 'inicio' && <Inicio dados={dados} plano={dados.plano} anamnese={dados.anamnese} />}
        {rota.ecra === 'hoje' && <Hoje dados={dados} plano={dados.plano} anamnese={dados.anamnese} />}
        {rota.ecra === 'exercicio' && <ExercicioEcra dados={dados} plano={dados.plano} prescricaoId={rota.prescricaoId} />}
        {rota.ecra === 'relatorios' && <Relatorios dados={dados} />}
        {rota.ecra === 'medicoes' && <Medicoes dados={dados} />}
        {rota.ecra === 'fotos' && <Fotos dados={dados} />}
        {rota.ecra === 'mais' && <Mais dados={dados} />}
        {rota.ecra === 'alongamento' && <AlongamentoEcra key={rota.grupo ?? ''} dados={dados} plano={dados.plano} anamnese={dados.anamnese} grupo={rota.grupo} />}
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
