import type { DadosExportacao } from '../domain/exportar'
import type { FotoAvaliacao } from '../domain/types'
import type { Dados } from './dados'

/**
 * F22.5: no telemóvel, abre a folha de partilha (Ficheiros, iCloud Drive, email…); se o navegador não
 * partilhar ficheiros, ou recusar, descarrega como antes. Cancelar a partilha não descarrega nada.
 */
export async function descarregar(nome: string, conteudo: string | Uint8Array<ArrayBuffer>, tipo: string) {
  const ficheiro = new File([conteudo], nome, { type: tipo })
  const telemovel = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  if (telemovel && navigator.canShare?.({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(ficheiro)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const TIPO_PDF = 'application/pdf'
export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** As fotos só fazem falta no relatório para o PT; quem não as passa exporta sem elas. */
export const paraExportacao = (d: Dados, fotos: FotoAvaliacao[] = []): DadosExportacao => ({
  anamnese: d.anamnese ?? null,
  plano: d.plano ?? null,
  sessoes: d.sessoes,
  medicoes: d.medicoes,
  fotos,
  perfil: d.perfil,
  tiposCarga: d.tiposCarga,
  cardio: d.cardio,
})
