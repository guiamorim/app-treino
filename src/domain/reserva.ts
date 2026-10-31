// F23.1: nos exercícios medidos em tempo regista-se a reserva em segundos em vez do RIR.

/** Valor guardado para «+» (mais de 60 s). */
export const MAIS_DE_60 = 61
export const RESERVAS = [15, 30, 45, 60, MAIS_DE_60] as const

/** Rótulo de um botão: «+15» … «+60», e «+» para mais de 60 s. */
export const rotuloReserva = (s: number) => (s === MAIS_DE_60 ? '+' : `+${s}`)
/** Texto numa tabela ou exportação: «+30 s», «> 60 s». */
export const textoReserva = (s: number) => (s === MAIS_DE_60 ? '> 60 s' : `+${s} s`)

/** Reserva pedida pela ficha, equivalente ao RIR prescrito: +15–30 s, ou +30–45 s quando o RIR começa em 3. */
export const reservaAlvo = (rir: readonly [number, number]): [number, number] => (rir[0] >= 3 ? [30, 45] : [15, 30])
