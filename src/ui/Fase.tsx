import { estadoBloco, proximaMudanca, trocasDoBloco } from '../domain/blocos'
import type { Plano } from '../domain/types'
import { catalogo, dataCurta } from './dados'
import { t } from '../i18n'

/** F14: fase atual do bloco e próxima mudança, numa linha. */
export function textoFase(plano: Plano, semana: number): string {
  const e = estadoBloco(plano, semana)
  const m = proximaMudanca(plano, semana)
  const quando = dataCurta(m.data)
  if (e.fase === 'readaptacao') return t('Readaptação, semana {semana} de 2 (2 séries leves) · Séries completas a partir de {quando}', { semana, quando })
  if (e.fase === 'progressao') return t('Bloco {bloco}, semana {semana} de {total} · Descarga a partir de {quando}', { bloco: e.bloco, semana: e.semanaNoBloco, total: e.semanasBloco - 1, quando })
  return t('Bloco {bloco}, semana de descarga (metade das séries, RIR 3–4) · Bloco {seguinte} a partir de {quando}', { bloco: e.bloco, seguinte: m.bloco, quando })
}

/** Exercícios que mudam no próximo bloco. */
export function TrocasProximoBloco({ plano, semana }: { plano: Plano; semana: number }) {
  const m = proximaMudanca(plano, semana)
  const bloco = m.tipo === 'novo-bloco' ? m.bloco : estadoBloco(plano, semana).bloco + 1
  const trocas = trocasDoBloco(plano, bloco)
  if (trocas.length === 0) return <p className="secundario">{t('No bloco {bloco} os exercícios mantêm-se.', { bloco })}</p>
  const nome = (id: string) => catalogo.get(id)?.nome ?? id
  return (
    <details>
      <summary className="secundario">{t('No bloco {bloco} mudam {n} exercícios isolados', { bloco, n: trocas.length })}</summary>
      <ul className="secundario">
        {trocas.map((x) => <li key={`${x.treino}-${x.de}`}>{x.treino}: {nome(x.de)} → {nome(x.para)}</li>)}
      </ul>
    </details>
  )
}
