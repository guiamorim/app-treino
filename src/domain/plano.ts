import { estadoBloco, exercicioNoBloco, SEMANAS_BLOCO } from './blocos'
import { obter, type Catalogo } from './catalogo'
import { DIVISOES, MODELOS, type Modelo } from './modelos'
import type { AcessoEquipamento, Anamnese, Enfase, Equipamento, Exercicio, GrupoMuscular, Objetivo, Plano, Prescricao, TipoExercicio, TreinoModelo } from './types'
import { NOMES_GRUPOS } from './types'

export const VERSAO_REGRAS = 2

const SEG_EXECUCAO = 45
const MIN_AQUECIMENTO = 8
const MIN_CARDIO = 10
const MIN_CAMINHADA = 20

interface Parametros {
  faixa: [number, number]
  rir: [number, number]
  descansoSeg: number
}

// Especificação, secção 3.2.
const PARAMETROS: Record<Objetivo, Record<TipoExercicio, Parametros>> = {
  recomposicao: {
    composto: { faixa: [6, 10], rir: [1, 3], descansoSeg: 120 },
    isolado: { faixa: [10, 15], rir: [1, 3], descansoSeg: 60 },
  },
  hipertrofia: {
    composto: { faixa: [6, 10], rir: [1, 3], descansoSeg: 120 },
    isolado: { faixa: [10, 15], rir: [1, 3], descansoSeg: 60 },
  },
  forca: {
    composto: { faixa: [3, 6], rir: [1, 2], descansoSeg: 180 },
    isolado: { faixa: [8, 12], rir: [1, 2], descansoSeg: 90 },
  },
  saude: {
    composto: { faixa: [8, 12], rir: [2, 3], descansoSeg: 90 },
    isolado: { faixa: [12, 15], rir: [2, 3], descansoSeg: 60 },
  },
}

const EQUIPAMENTO_DISPONIVEL: Record<AcessoEquipamento, Equipamento[]> = {
  ginasio: ['barra', 'halteres', 'maquina', 'cabo', 'peso-corporal'],
  halteres: ['halteres', 'peso-corporal'],
  casa: ['peso-corporal'],
}

const NOMES_AREAS: Record<string, string> = {
  ombro: 'ombro',
  joelho: 'joelho',
  lombar: 'lombar',
  punho: 'punho',
  anca: 'anca',
  cotovelo: 'cotovelo',
}

/** A resposta de gravidez só conta com sexo feminino (secção 3.4.1). */
const gravidezAtiva = (a: Anamnese) => (a.sexo === 'feminino' ? a.gravidez ?? 'nao' : 'nao')

const INFERIORES: readonly GrupoMuscular[] = ['quadriceps', 'posteriores', 'gluteos', 'gemeos']

/** Secção 3.8: +1 série nos compostos da metade escolhida, −1 nos isolados da outra. */
function aplicarEnfase(p: Prescricao, ex: Exercicio, enfase: Enfase): Prescricao {
  if (enfase === 'equilibrado') return p
  const inferior = INFERIORES.includes(ex.grupoPrincipal)
  const daEnfase = (enfase === 'inferior') === inferior
  if (ex.grupoPrincipal === 'core') return p
  if (daEnfase && ex.tipo === 'composto') return { ...p, series: Math.min(5, p.series + 1) }
  if (!daEnfase && ex.tipo === 'isolado') return { ...p, series: Math.max(2, p.series - 1) }
  return p
}

export function motivoIncompatibilidade(ex: Exercicio, a: Anamnese): string | null {
  const area = ex.contraindicacoes.find((c) => a.restricoes.some((r) => r.area === c))
  if (area) return `por causa do ${NOMES_AREAS[area]}`
  if (ex.deitado && gravidezAtiva(a) === 'gravida-2t3t') return 'por causa da gravidez'
  const disponivel = EQUIPAMENTO_DISPONIVEL[a.equipamento]
  if (!ex.equipamento.some((q) => disponivel.includes(q))) return 'por falta de equipamento'
  return null
}

function escolher(base: Exercicio, a: Anamnese, catalogo: Catalogo, usados: Set<string>): { ex: Exercicio; nota?: string } | null {
  const motivo = motivoIncompatibilidade(base, a)
  if (!motivo && !usados.has(base.id)) return { ex: base }
  for (const id of base.substitutos) {
    const s = obter(catalogo, id)
    if (!usados.has(s.id) && !motivoIncompatibilidade(s, a)) {
      return { ex: s, nota: `Substitui «${base.nome}» ${motivo ?? 'para não repetir exercício'}.` }
    }
  }
  return null
}

export function duracaoEstimadaMin(prescricoes: Prescricao[], cardioMin = 0): number {
  const seg = prescricoes.reduce((t, p) => t + p.series * (SEG_EXECUCAO + p.descansoSeg), 0)
  return Math.ceil(seg / 60) + MIN_AQUECIMENTO + cardioMin
}

/** Especificação, secção 3.5: corta isolados e depois séries até caber na duração. */
function ajustarDuracao(prescricoes: Prescricao[], tipos: Map<string, TipoExercicio>, limite: number, cardio: number): Prescricao[] {
  let lista = prescricoes.map((p) => ({ ...p }))
  const cabe = () => duracaoEstimadaMin(lista, cardio) <= limite
  const isolado = (p: Prescricao) => tipos.get(p.id) === 'isolado'
  if (cabe()) return lista
  const ultimoIsolado = lista.map(isolado).lastIndexOf(true)
  if (ultimoIsolado >= 0) lista = lista.filter((_, i) => i !== ultimoIsolado)
  for (const filtro of [isolado, (p: Prescricao) => !isolado(p)]) {
    for (let i = lista.length - 1; i >= 0 && !cabe(); i--) {
      const p = lista[i]!
      if (filtro(p) && p.series > 2) p.series--
    }
  }
  while (!cabe() && lista.length > 1) lista = lista.slice(0, -1)
  return lista
}

/** Secção 3.7: alternativas de rotação para os isolados, sem repetir exercícios no treino. */
function juntarAlternativas(prescricoes: Prescricao[], a: Anamnese, catalogo: Catalogo): Prescricao[] {
  const ocupados = new Set(prescricoes.map((p) => p.exercicioId))
  return prescricoes.map((p) => {
    const ex = obter(catalogo, p.exercicioId)
    if (ex.tipo !== 'isolado') return p
    const alternativas = [ex.id]
    for (const id of ex.substitutos) {
      if (ocupados.has(id) || motivoIncompatibilidade(obter(catalogo, id), a)) continue
      alternativas.push(id)
      ocupados.add(id)
    }
    return alternativas.length > 1 ? { ...p, alternativas } : p
  })
}

function gerarTreino(m: Modelo, a: Anamnese, catalogo: Catalogo, conservador: boolean, avisos: string[]): TreinoModelo {
  const usados = new Set<string>()
  const prescricoes: Prescricao[] = []
  const tipos = new Map<string, TipoExercicio>()
  const semSubstituto: Exercicio[] = []

  m.posicoes.forEach((pos, i) => {
    const base = obter(catalogo, pos.exercicioId)
    const escolha = escolher(base, a, catalogo, usados)
    if (!escolha) {
      semSubstituto.push(base)
      return
    }
    const { ex, nota } = escolha
    usados.add(ex.id)
    const param = PARAMETROS[a.objetivo][ex.tipo]
    const id = `${m.id}-${i + 1}`
    const leve = m.tipo === 'recuperacao'
    tipos.set(id, ex.tipo)
    prescricoes.push(aplicarEnfase({
      id,
      exercicioId: ex.id,
      series: leve ? 2 : pos.principal && ex.tipo === 'composto' ? 4 : 3,
      faixa: ex.faixaFixa ?? param.faixa,
      rir: conservador || leve ? [3, 4] : param.rir,
      descansoSeg: param.descansoSeg,
      ...(nota ? { nota } : {}),
    }, ex, a.enfase ?? 'equilibrado'))
  })

  // Secção 3.4: o volume de um exercício removido passa para outro do mesmo grupo.
  for (const base of semSubstituto) {
    const alvo = prescricoes.find((p) => obter(catalogo, p.exercicioId).grupoPrincipal === base.grupoPrincipal)
    if (alvo && alvo.series < 5) alvo.series++
    else avisos.push(`${m.nome}: sem exercício compatível para ${NOMES_GRUPOS[base.grupoPrincipal]} («${base.nome}» foi removido).`)
  }

  const cardioMin = m.tipo === 'recuperacao' ? MIN_CAMINHADA : a.aceitaCardio && m.tipo === 'inferior' ? MIN_CARDIO : undefined
  const ajustadas = juntarAlternativas(ajustarDuracao(prescricoes, tipos, a.duracaoMin, cardioMin ?? 0), a, catalogo)
  return {
    id: m.id,
    nome: m.nome,
    sintese: m.sintese,
    prescricoes: ajustadas,
    ...(cardioMin ? { cardioMin } : {}),
    duracaoEstimadaMin: duracaoEstimadaMin(ajustadas, cardioMin ?? 0),
  }
}

export function gerarPlano(a: Anamnese, catalogo: Catalogo, opts: { id: string; agora: string }): Plano {
  const avisos: string[] = []
  const gravidez = gravidezAtiva(a)
  const parq = a.parq.some(Boolean)
  const conservador = parq || gravidez !== 'nao'
  if (parq) {
    avisos.push('Respondeste «sim» a pelo menos uma pergunta do PAR-Q+. Consulta um médico antes de aumentar a intensidade. O plano foi gerado em modo conservador.')
  }
  if (gravidez === 'gravida-1t' || gravidez === 'gravida-2t3t') {
    avisos.push('Gravidez: treina com acompanhamento do teu médico ou obstetra. Plano conservador; para se sentires dor, tonturas, falta de ar invulgar, contrações ou perdas de sangue ou líquido.'
      + (gravidez === 'gravida-2t3t' ? ' A partir do 2.º trimestre, os exercícios deitado de costas ou de barriga para baixo foram trocados.' : ''))
  }
  if (gravidez === 'pos-parto') {
    avisos.push('Pós-parto: retoma com autorização do teu médico ou obstetra e, idealmente, avaliação do pavimento pélvico e da diástase por fisioterapeuta. Plano conservador.')
  }
  for (const r of a.restricoes) {
    if (!r.avaliadaPorProfissional) {
      avisos.push(`A dor no ${NOMES_AREAS[r.area]} nunca foi avaliada. Recomenda-se avaliação por médico ou fisioterapeuta.`)
    }
  }
  const treinos = DIVISOES[a.diasPorSemana].map((id) => gerarTreino(MODELOS[id]!, a, catalogo, conservador, avisos))
  return {
    id: opts.id,
    criadoEm: opts.agora,
    versaoRegras: VERSAO_REGRAS,
    conservador,
    readaptacao: a.experiencia !== 'intermedio',
    semanasBloco: SEMANAS_BLOCO[a.objetivo],
    treinos,
    avisos,
  }
}

export function semanaDoPlano(plano: Plano, data: string): number {
  const dias = (Date.parse(data) - Date.parse(plano.criadoEm)) / 86_400_000
  return Math.max(1, Math.floor(dias / 7) + 1)
}

/** A prescrição tal como deve ser feita nesta semana: readaptação (3.3), descarga e rotação (3.7). */
export function prescricaoEfetiva(p: Prescricao, plano: Plano, semana: number): Prescricao {
  const e = estadoBloco(plano, semana)
  let r = p
  const exercicioId = exercicioNoBloco(p.alternativas, p.exercicioId, e.bloco)
  if (exercicioId !== p.exercicioId) {
    const { nota: _, ...resto } = r
    r = { ...resto, exercicioId, nota: `Bloco ${e.bloco}: exercício isolado trocado para variar o estímulo.` }
  }
  if (e.fase === 'readaptacao') return { ...r, series: Math.min(r.series, 2), rir: [3, 4] }
  if (e.fase === 'descarga') return { ...r, series: Math.ceil(r.series / 2), rir: [3, 4] }
  return r
}

/** O treino tal como deve ser feito nesta semana. */
export function treinoEfetivo(t: TreinoModelo, plano: Plano, semana: number): TreinoModelo {
  const prescricoes = t.prescricoes.map((p) => prescricaoEfetiva(p, plano, semana))
  return { ...t, prescricoes, duracaoEstimadaMin: duracaoEstimadaMin(prescricoes, t.cardioMin ?? 0) }
}
