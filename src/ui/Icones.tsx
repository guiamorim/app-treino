// F22.13: ícones da barra de baixo desenhados em linha (24×24), na cor do texto do separador.
import type { ReactNode } from 'react'

const DESENHOS = {
  inicio: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  hoje: <><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" /></>,
  relatorios: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
  medicoes: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 10a3.5 3.5 0 0 1 7 0" /><path d="m12 10 1.5-2" /></>,
  fotos: <><path d="M4 8h3.5L9.5 5h5l2 3H20v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mais: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
} satisfies Record<string, ReactNode>

export type NomeIcone = keyof typeof DESENHOS

export function Icone({ nome }: { nome: NomeIcone }) {
  return (
    <svg className="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {DESENHOS[nome]}
    </svg>
  )
}
