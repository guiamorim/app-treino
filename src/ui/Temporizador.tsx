import { useEffect, useState } from 'react'
import { t } from '../i18n'

/** Contagem baseada na hora de fim, para continuar certa se a app for para segundo plano. */
export function Temporizador({ fimEm, fechar, rotulos = [t('Descanso'), t('Descanso terminado')] }: { fimEm: number; fechar: () => void; rotulos?: [string, string] }) {
  const [agora, setAgora] = useState(Date.now())
  const restante = Math.max(0, Math.ceil((fimEm - agora) / 1000))
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (restante === 0) navigator.vibrate?.([300, 150, 300])
  }, [restante === 0])
  const mm = Math.floor(restante / 60)
  const ss = String(restante % 60).padStart(2, '0')
  return (
    <div className={`cartao temporizador ${restante === 0 ? 'fim' : ''}`} role="timer" aria-live={restante === 0 ? 'assertive' : 'off'}>
      <div className="linha">
        <span>{restante === 0 ? rotulos[1] : rotulos[0]}</span>
        <span className="numero">{mm}:{ss}</span>
        <button onClick={fechar} style={{ flex: 'none' }}>{restante === 0 ? 'OK' : t('Saltar')}</button>
      </div>
    </div>
  )
}
