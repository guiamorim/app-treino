import type { DadosExportacao } from '../domain/exportar'
import type { Dados } from './dados'

export function descarregar(nome: string, conteudo: string | Uint8Array<ArrayBuffer>, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const TIPO_PDF = 'application/pdf'
export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const paraExportacao = (d: Dados): DadosExportacao => ({
  anamnese: d.anamnese ?? null,
  plano: d.plano ?? null,
  sessoes: d.sessoes,
  medicoes: d.medicoes,
  fotos: d.fotos,
  perfil: d.perfil,
})
