import { estadoBloco, proximaMudanca, trocasDoBloco } from '../domain/blocos'
import type { Plano } from '../domain/types'
import { catalogo, dataCurta } from './dados'

/** F14: fase atual do bloco e próxima mudança, numa linha. */
export function textoFase(plano: Plano, semana: number): string {
  const e = estadoBloco(plano, semana)
  const m = proximaMudanca(plano, semana)
  const quando = dataCurta(m.data)
  if (e.fase === 'readaptacao') return `Readaptação, semana ${semana} de 2 (2 séries leves) · Séries completas a partir de ${quando}`
  if (e.fase === 'progressao') return `Bloco ${e.bloco}, semana ${e.semanaNoBloco} de ${e.semanasBloco - 1} · Descarga a partir de ${quando}`
  return `Bloco ${e.bloco}, semana de descarga (metade das séries, RIR 3–4) · Bloco ${m.bloco} a partir de ${quando}`
}

/** Exercícios que mudam no próximo bloco. */
export function TrocasProximoBloco({ plano, semana }: { plano: Plano; semana: number }) {
  const m = proximaMudanca(plano, semana)
  const bloco = m.tipo === 'novo-bloco' ? m.bloco : estadoBloco(plano, semana).bloco + 1
  const trocas = trocasDoBloco(plano, bloco)
  if (trocas.length === 0) return <p className="secundario">No bloco {bloco} os exercícios mantêm-se.</p>
  const nome = (id: string) => catalogo.get(id)?.nome ?? id
  return (
    <details>
      <summary className="secundario">No bloco {bloco} mudam {trocas.length} exercícios isolados</summary>
      <ul className="secundario">
        {trocas.map((t) => <li key={`${t.treino}-${t.de}`}>{t.treino}: {nome(t.de)} → {nome(t.para)}</li>)}
      </ul>
    </details>
  )
}
