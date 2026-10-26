import { useEffect } from 'react'
import type { Sessao } from '../domain/types'

const JANELA_MS = 3 * 3_600_000

/** F22.3: há um treino a decorrer se foi aberto nas últimas 3 horas e ainda não terminou. */
export const treinoADecorrer = (sessoes: Sessao[], agora = Date.now()) =>
  sessoes.some((s) => !s.fim && agora - Date.parse(s.inicio) < JANELA_MS)

/** Mantém o ecrã ligado enquanto `ativo`, onde o navegador o permite (iOS 16.4+); sem suporte, não faz nada. */
export function useEcraLigado(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let bloqueio: WakeLockSentinel | undefined
    let fim = false
    const pedir = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then((b) => {
        if (fim) void b.release()
        else bloqueio = b
      }).catch(() => {})
    }
    pedir()
    // O navegador larga o bloqueio quando a app vai para segundo plano; volta a pedir ao regressar.
    document.addEventListener('visibilitychange', pedir)
    return () => {
      fim = true
      document.removeEventListener('visibilitychange', pedir)
      void bloqueio?.release()
    }
  }, [ativo])
}
