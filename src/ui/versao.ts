// F20: deteção de versão nova pelo service worker e ativação quando a pessoa pede.
import { useSyncExternalStore } from 'react'
import dadosNovidades from '../novidades.json'
import { carregarNovidades, lerNovidades, novidadesDepois, novidadesNoIdioma, versaoAtual, type NovidadesVersao } from '../domain/novidades'
import { idiomaAtual } from '../i18n'

const todas = carregarNovidades(dadosNovidades)
export const VERSAO = versaoAtual(todas)
/** F21: as novidades no idioma atual. */
export const novidades = () => novidadesNoIdioma(todas, idiomaAtual())

let registo: ServiceWorkerRegistration | undefined
let pronta = false
let pedida = false
const ouvintes = new Set<() => void>()

function marcar() {
  const agora = !!registo?.waiting && !!navigator.serviceWorker.controller
  if (agora !== pronta) {
    pronta = agora
    ouvintes.forEach((f) => f())
  }
}

function vigiar(r: ServiceWorkerRegistration) {
  registo = r
  marcar()
  r.addEventListener('updatefound', () => r.installing?.addEventListener('statechange', marcar))
}

export function registarTrabalhador() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(vigiar).catch(() => {})
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pedida) location.reload()
  })
  // No iPhone a app instalada fica em memória: volta a procurar sempre que regressa ao primeiro plano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registo?.update().catch(() => {})
  })
}

export type Procura = 'pronta' | 'atual' | 'sem-ligacao' | 'indisponivel'

export async function procurarAtualizacao(): Promise<Procura> {
  if (!registo && 'serviceWorker' in navigator) {
    const r = await navigator.serviceWorker.getRegistration()
    if (r) vigiar(r)
  }
  if (!registo) return 'indisponivel'
  try {
    await registo.update()
  } catch {
    return 'sem-ligacao'
  }
  const w = registo.installing
  if (w)
    await new Promise<void>((fim) => {
      const ver = () => w.state !== 'installing' && fim()
      w.addEventListener('statechange', ver)
      ver()
    })
  marcar()
  return pronta ? 'pronta' : 'atual'
}

/** Ativa a versão à espera; a página recarrega quando ela assume o controlo. */
export function atualizar() {
  pedida = true
  if (registo?.waiting) registo.waiting.postMessage('atualizar')
  else location.reload()
}

export function useAtualizacaoPronta(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => pronta,
  )
}

/** Resumo da versão à espera, lido da rede; null sem ligação ou com ficheiro inválido. */
export async function novidadesDaVersaoNova(): Promise<NovidadesVersao[] | null> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}novidades.json`, { cache: 'no-store' })
    const n = r.ok ? lerNovidades(await r.json()) : null
    return n ? novidadesDepois(novidadesNoIdioma(n, idiomaAtual()), VERSAO) : null
  } catch {
    return null
  }
}
