// F38 (v1.27): plano pós-parto por fases, pelas semanas desde o parto (Goom, Donnelly e Brockwell, 2019).
import { m, t, traduzido } from '../i18n'
import type { Catalogo } from './catalogo'
import { duracaoEstimadaMin, motivoIncompatibilidade } from './plano'
import type { Anamnese, Plano, Prescricao, Sessao, TreinoModelo } from './types'

export const TIPOS_PARTO = ['vaginal', 'cesariana'] as const
export type TipoParto = (typeof TIPOS_PARTO)[number]
export const OBJETIVOS_POS_PARTO = ['core', 'forca', 'recuperacao', 'readaptacao'] as const
export type ObjetivoPosParto = (typeof OBJETIVOS_POS_PARTO)[number]

/** F38.1: dados do pós-parto, guardados na anamnese. */
export interface PosParto {
  /** AAAA-MM-DD */
  dataParto: string
  tipoParto: TipoParto
  autorizacaoMedica: boolean
  objetivo: ObjetivoPosParto
  /** Sintomas na anamnese: perdas de urina ou fezes, peso ou arrastamento na vagina, ou dor. */
  sintomas: boolean
  /** Distância entre os retos, em dedos, se foi medida (opcional). */
  diastaseDedos?: number
  /** Quando estes dados foram guardados (ISO), para comparar a resposta dos sintomas com as das sessões. */
  atualizadoEm: string
}

export const NOMES_OBJETIVOS_POS_PARTO: Record<ObjetivoPosParto, string> = traduzido({
  core: m('Diástase e core'),
  forca: m('Fortalecimento geral'),
  recuperacao: m('Recuperação'),
  readaptacao: m('Voltar ao treino que fazias antes'),
})

export const FASES = ['f0', 'f1', 'f2', 'f3', 'regresso'] as const
export type Fase = (typeof FASES)[number]

const NOMES_FASES_PT: Record<Fase, { nome: string; resumo: string }> = {
  f0: { nome: m('Fase 1: primeiras semanas'), resumo: m('Pavimento pélvico, respiração, core muito leve e caminhadas curtas.') },
  f1: { nome: m('Fase 2: reconstruir a base'), resumo: m('Core profundo, ponte, agachamento e afundo com o peso do corpo, e caminhadas mais longas.') },
  f2: { nome: m('Fase 3: força leve'), resumo: m('Mais séries, core em progressão e caminhada rápida.') },
  f3: { nome: m('Fase 4: treino de força'), resumo: m('O teu plano de força, com o pavimento pélvico no início de cada treino. Corrida e saltos só depois do teste de impacto.') },
  regresso: { nome: m('Regresso ao treino'), resumo: m('Passaste no teste de impacto: a corrida e os intervalos estão desbloqueados. Quando te sentires pronta, muda «Gravidez ou pós-parto» para «Não» na anamnese para gerar um plano sem modo conservador.') },
}
export const NOMES_FASES = Object.fromEntries(FASES.map((f) => [f, traduzido(NOMES_FASES_PT[f])])) as typeof NOMES_FASES_PT

/** O teste de impacto (F38.6) e os autotestes da diástase (F38.5), guardados no dispositivo e na cópia. */
export interface EstadoPosParto {
  testeImpacto?: { data: string; resultados: boolean[] }
  diastase?: { data: string; dedos: number }[]
}

/** F38.6: os 7 testes de carga e impacto (Goom et al., 2019). */
export const TESTES_IMPACTO = [
  m('Andar 30 minutos'),
  m('Equilíbrio numa perna, 10 segundos de cada lado'),
  m('Agachamento numa perna, 10 vezes de cada lado'),
  m('Correr no sítio, 1 minuto'),
  m('Saltos para a frente, 10 vezes'),
  m('Saltos numa perna, 10 vezes de cada lado'),
  m('«Running man» numa perna (joelho à frente e braço oposto), 10 vezes de cada lado'),
] as const

export const passouTeste = (e: EstadoPosParto | undefined) => !!e?.testeImpacto && e.testeImpacto.resultados.length === TESTES_IMPACTO.length && e.testeImpacto.resultados.every(Boolean)

/** A anamnese tem pós-parto ativo (só com sexo feminino) e os dados do parto. */
export const posPartoAtivo = (a: Anamnese | undefined): a is Anamnese & { posParto: PosParto } => !!a && a.sexo === 'feminino' && a.gravidez === 'pos-parto' && !!a.posParto

const dias = (de: string, ate: string) => Math.floor((Date.parse(`${ate.slice(0, 10)}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000)
export const semanasDesde = (dataParto: string, dia: string) => Math.max(0, Math.floor(dias(dataParto, dia) / 7))

/** F38.2: a fase pelo calendário. Na cesariana, a fase 3 e a 4 começam 2 semanas mais tarde. */
export function faseDoCalendario(p: PosParto, dia: string): Fase {
  const s = semanasDesde(p.dataParto, dia)
  const atraso = p.tipoParto === 'cesariana' ? 2 : 0
  return s < 2 ? 'f0' : s < 6 + atraso ? 'f1' : s < 12 + atraso ? 'f2' : 'f3'
}

const ordem = (f: Fase) => FASES.indexOf(f)
const minFase = (a: Fase, b: Fase) => (ordem(a) <= ordem(b) ? a : b)

/** F38.4: a resposta mais recente sobre sintomas: a da anamnese ou a de uma sessão, a que for mais tarde. */
export function ultimosSintomas(p: PosParto, sessoes: readonly Sessao[]): { data: string; sim: boolean } {
  const respostas = [
    { quando: p.atualizadoEm, sim: p.sintomas },
    ...sessoes.filter((s) => s.sintomasPosParto !== undefined).map((s) => ({ quando: s.inicio, sim: s.sintomasPosParto! })),
  ]
  const ultima = respostas.reduce((a, b) => (b.quando >= a.quando ? b : a))
  return { data: ultima.quando.slice(0, 10), sim: ultima.sim }
}

export interface EstadoFase {
  fase: Fase
  semanas: number
  /** Motivo por que a fase está travada abaixo da do calendário. */
  travada?: 'autorizacao' | 'sintomas'
  /** F38.6: o teste de impacto já se pode fazer (fase 4 pelo calendário, sem sintomas). */
  podeTestar: boolean
}

/**
 * F38.2–F38.4: a fase atual. Sem autorização médica fica no máximo na fase 2; com sintomas na última resposta,
 * não passa da fase em que estava nesse dia; o regresso só depois de passar o teste de impacto.
 */
export function estadoFase(p: PosParto, hoje: string, sessoes: readonly Sessao[], estado: EstadoPosParto | undefined): EstadoFase {
  const calendario = faseDoCalendario(p, hoje)
  let fase: Fase = calendario
  let travada: EstadoFase['travada']
  const sintomas = ultimosSintomas(p, sessoes)
  if (sintomas.sim) {
    const naquele = faseDoCalendario(p, sintomas.data)
    if (ordem(naquele) < ordem(fase)) { fase = naquele; travada = 'sintomas' }
  }
  if (!p.autorizacaoMedica && ordem(fase) > ordem('f1')) { fase = 'f1'; travada = 'autorizacao' }
  const podeTestar = calendario === 'f3' && fase === 'f3' && !sintomas.sim
  if (fase === 'f3' && passouTeste(estado) && !sintomas.sim) fase = 'regresso'
  return { fase: minFase(fase, 'regresso'), semanas: semanasDesde(p.dataParto, hoje), ...(travada ? { travada } : {}), podeTestar }
}

type Linha = [exercicioId: string, series: number, faixa: [number, number] | null, descansoSeg: number]
const RIR: [number, number] = [3, 4]

/** F38.3: os treinos das fases 1 a 3 (por ordem; cada um com caminhada no fim, em minutos). */
const MODELOS_FASE: Record<'f0' | 'f1' | 'f2', { sufixo: string; nome: string; sintese: string; caminhada: number; linhas: Linha[] }[]> = {
  f0: [{ sufixo: '', nome: m('Recuperação pós-parto'), sintese: m('Pavimento pélvico, respiração e core muito leve, e 10 min de caminhada.'), caminhada: 10, linhas: [
    ['pavimento-pelvico-longas', 3, null, 30], ['pavimento-pelvico-rapidas', 2, null, 30], ['respiracao-transverso', 2, null, 30],
    ['inclinacao-pelvica', 2, null, 30], ['abertura-joelho-deitada', 2, null, 30], ['abducao-caneleira', 2, [8, 12], 45],
  ] }],
  f1: [
    { sufixo: '-a', nome: m('Base pós-parto A'), sintese: m('Core profundo, ponte e agachamento, e 15 min de caminhada.'), caminhada: 15, linhas: [
      ['pavimento-pelvico-longas', 3, null, 30], ['respiracao-transverso', 2, null, 30], ['deslizar-calcanhar', 2, null, 30],
      ['ponte-gluteos', 2, [10, 12], 60], ['agachamento-peso-corporal', 2, [8, 12], 60], ['conchas', 2, null, 45],
    ] },
    { sufixo: '-b', nome: m('Base pós-parto B'), sintese: m('Core profundo, afundo e glúteos, e 15 min de caminhada.'), caminhada: 15, linhas: [
      ['pavimento-pelvico-rapidas', 2, null, 30], ['inclinacao-pelvica', 2, null, 30], ['abertura-joelho-deitada', 2, null, 30],
      ['afundo-recuado', 2, [6, 10], 60], ['abducao-caneleira', 2, [10, 15], 45], ['bird-dog', 2, [6, 10], 45],
    ] },
  ],
  f2: [
    { sufixo: '-a', nome: m('Força leve pós-parto A'), sintese: m('Core, agachamento, ponte e prancha lateral, e 20 min de caminhada.'), caminhada: 20, linhas: [
      ['pavimento-pelvico-longas', 3, null, 30], ['dead-bug', 3, [8, 10], 45], ['agachamento-peso-corporal', 3, [10, 15], 60],
      ['ponte-gluteos', 3, [12, 15], 60], ['prancha-lateral-joelhos', 2, null, 45], ['conchas', 2, null, 45],
    ] },
    { sufixo: '-b', nome: m('Força leve pós-parto B'), sintese: m('Core, afundo, peso morto numa perna e glúteos, e 20 min de caminhada.'), caminhada: 20, linhas: [
      ['pavimento-pelvico-rapidas', 2, null, 30], ['bird-dog', 3, [8, 10], 45], ['afundo-recuado', 3, [8, 12], 60],
      ['peso-morto-unilateral', 2, [8, 10], 60], ['abducao-caneleira', 2, [12, 15], 45], ['deslizar-calcanhar', 2, null, 30],
    ] },
  ],
}

/** O exercício previsto, ou o primeiro substituto compatível com as restrições e o equipamento. */
function compativel(id: string, a: Anamnese, catalogo: Catalogo): string | null {
  const ex = catalogo.get(id)
  if (!ex) return null
  if (!motivoIncompatibilidade(ex, a)) return id
  return ex.substitutos.find((s) => catalogo.get(s) && !motivoIncompatibilidade(catalogo.get(s)!, a)) ?? null
}

/** F38.3: os treinos de uma fase inicial, com ids estáveis por fase. */
export function treinosDaFase(fase: 'f0' | 'f1' | 'f2', a: Anamnese, catalogo: Catalogo): TreinoModelo[] {
  return MODELOS_FASE[fase].map((mod) => {
    const id = `pos-parto-${fase}${mod.sufixo}`
    const usados = new Set<string>()
    const prescricoes = mod.linhas.flatMap(([exId, series, faixa, descansoSeg], i): Prescricao[] => {
      const escolhido = compativel(exId, a, catalogo)
      if (!escolhido || usados.has(escolhido)) return []
      usados.add(escolhido)
      const ex = catalogo.get(escolhido)!
      return [{ id: `${id}-${i + 1}`, exercicioId: escolhido, series, faixa: ex.faixaFixa ?? faixa ?? [8, 12], rir: RIR, descansoSeg }]
    })
    return { id, nome: t(mod.nome), sintese: t(mod.sintese), prescricoes, cardioMin: mod.caminhada, duracaoEstimadaMin: duracaoEstimadaMin(prescricoes, mod.caminhada) }
  })
}

/** Na fase 4 (e no regresso com objetivo de core ou recuperação), o pavimento pélvico abre cada treino. */
function comPavimento(plano: Plano, catalogo: Catalogo): Plano {
  const ex = catalogo.get('pavimento-pelvico-longas')
  if (!ex) return plano
  return {
    ...plano,
    treinos: plano.treinos.map((tr) => {
      if (tr.prescricoes.some((p) => p.exercicioId === ex.id)) return tr
      const prescricoes = [{ id: `${tr.id}-pp`, exercicioId: ex.id, series: 2, faixa: ex.faixaFixa!, rir: RIR, descansoSeg: 30 }, ...tr.prescricoes]
      return { ...tr, prescricoes, duracaoEstimadaMin: duracaoEstimadaMin(prescricoes, tr.cardioMin ?? 0) }
    }),
  }
}

/**
 * F38.3: o plano como é mostrado no pós-parto. O plano guardado não muda: nas fases 1–3 os treinos são os da fase;
 * na fase 4 é o plano de força com o pavimento pélvico no início; no regresso, o plano normal.
 */
export function planoPosParto(plano: Plano, a: Anamnese & { posParto: PosParto }, e: EstadoFase, catalogo: Catalogo): Plano {
  if (e.fase === 'f0' || e.fase === 'f1' || e.fase === 'f2') return { ...plano, treinos: treinosDaFase(e.fase, a, catalogo) }
  if (e.fase === 'f3' || a.posParto.objetivo === 'core' || a.posParto.objetivo === 'recuperacao') return comPavimento(plano, catalogo)
  return plano
}

/** F38.7: sinais para parar e procurar um fisioterapeuta de saúde pélvica. */
export const SINAIS_ALARME = [
  m('Peso, arrastamento ou sensação de bola na vagina'),
  m('Perdas de urina ou de fezes, ou dificuldade em controlar os gases'),
  m('Dor moderada ou forte, dor pélvica ou lombar'),
  m('Perdas de sangue novas, ou depois das 8 semanas'),
  m('Barriga pendente ou um afastamento visível na linha do meio'),
] as const

/** F38.5: a diástase em dedos; 2 ou mais dedos é o limiar habitual para pedir avaliação. */
export const DIASTASE_LIMIAR_DEDOS = 2
