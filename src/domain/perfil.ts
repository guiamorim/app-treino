import { t } from '../i18n'

// F16: saudação conforme a hora do dispositivo.
export function saudacao(agora: Date, nome?: string): string {
  const h = agora.getHours()
  const base = h >= 5 && h < 12 ? t('Bom dia') : h >= 12 && h < 20 ? t('Boa tarde') : t('Boa noite')
  const n = nome?.trim()
  return n ? `${base}, ${n}` : base
}
