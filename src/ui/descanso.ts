import { useSyncExternalStore } from 'react'

/**
 * F22.3 e F22.4: o descanso entre séries vive fora do ecrã do exercício, para continuar visível em qualquer
 * separador, e toca um som curto no fim. O som fica agendado no relógio de áudio no momento em que começa
 * o descanso, por isso toca mesmo que o JavaScript esteja abrandado; não toca com a app em segundo plano.
 */
let fimEm: number | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

let audio: AudioContext | undefined
let bips: OscillatorNode[] = []

/** Tem de ser chamado durante o toque (antes de qualquer await): o iPhone só deixa ligar o áudio assim. */
export function prepararSom() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = undefined
  }
}

function agendarBips(segundos: number) {
  if (!audio) return
  const inicio = audio.currentTime + segundos
  bips = [0, 0.25, 0.5].map((atraso) => {
    const osc = audio!.createOscillator()
    const volume = audio!.createGain()
    osc.frequency.value = 880
    volume.gain.setValueAtTime(0.0001, inicio + atraso)
    volume.gain.exponentialRampToValueAtTime(0.3, inicio + atraso + 0.02)
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.18)
    osc.connect(volume).connect(audio!.destination)
    osc.start(inicio + atraso)
    osc.stop(inicio + atraso + 0.2)
    return osc
  })
}

function cancelarBips() {
  for (const b of bips) {
    try {
      b.stop()
    } catch {
      // Já tinha parado.
    }
  }
  bips = []
}

export function iniciarDescanso(segundos: number) {
  cancelarBips()
  fimEm = Date.now() + segundos * 1000
  agendarBips(segundos)
  avisar()
}

export function terminarDescanso() {
  cancelarBips()
  fimEm = null
  avisar()
}

export function useDescanso(): number | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => fimEm,
  )
}
