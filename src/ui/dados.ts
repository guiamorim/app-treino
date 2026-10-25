import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import dadosAlongamentos from '../catalog/alongamentos.json'
import dadosCatalogo from '../catalog/exercicios.json'
import { carregarAlongamentos } from '../domain/alongamentos'
import { carregarCatalogo } from '../domain/catalogo'
import type { Anamnese, FotoAvaliacao, Medicao, Perfil, Plano, Sessao } from '../domain/types'

export const catalogo = carregarCatalogo(dadosCatalogo)
export const alongamentos = carregarAlongamentos(dadosAlongamentos)

export interface Dados {
  anamnese?: Anamnese
  plano?: Plano
  sessoes: Sessao[]
  medicoes: Medicao[]
  videos: Record<string, string>
  ultimaExportacao?: string
  fotos: FotoAvaliacao[]
  perfil: Perfil
}

export function useDados(): Dados | undefined {
  return useLiveQuery(async () => ({
    anamnese: await db.ler<Anamnese>('anamnese'),
    plano: await db.ler<Plano>('plano'),
    sessoes: await db.sessoes.orderBy('inicio').toArray(),
    medicoes: await db.medicoes.orderBy('data').toArray(),
    videos: (await db.ler<Record<string, string>>('videos')) ?? {},
    ultimaExportacao: await db.ler<string>('ultimaExportacao'),
    fotos: await db.fotos.orderBy('data').toArray(),
    perfil: (await db.ler<Perfil>('perfil')) ?? {},
  }))
}

export const novoId = () => crypto.randomUUID()
export const agoraIso = () => new Date().toISOString()
export const hojeIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const diasDesde = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : Infinity)
export const kg = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
