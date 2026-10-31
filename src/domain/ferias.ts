// F29 (v1.18): modo férias. O plano guardado não muda; enquanto as férias duram, cada exercício que não se
// pode fazer com o equipamento das férias é trocado por um compatível, só na forma como o plano é mostrado.
import { t } from '../i18n'
import { estadoBloco, exercicioNoBloco } from './blocos'
import type { Catalogo } from './catalogo'
import { FAIXA_CORPORAL, motivoIncompatibilidade, resumoEquipamento, soPesoCorporal } from './plano'
import type { Anamnese, Equipamento, Exercicio, Plano, Prescricao } from './types'

export interface Ferias {
  /** AAAA-MM-DD, inclusive. */
  inicio: string
  /** AAAA-MM-DD, inclusive. */
  fim: string
  /** Equipamento disponível nas férias, sem o peso do corpo (que conta sempre). */
  equipamentos: Equipamento[]
}

/** F29.1: até 8 semanas; depois disso convém gerar um plano novo a partir da anamnese. */
export const DIAS_MAX_FERIAS = 56

export const feriasAtivas = (f: Ferias | null | undefined, hoje: string): boolean => !!f && hoje >= f.inicio && hoje <= f.fim

/** A anamnese com o equipamento das férias (restrições, gravidez e objetivo mantêm-se). */
export function anamneseEmFerias(a: Anamnese, f: Ferias): Anamnese {
  return { ...a, equipamento: resumoEquipamento(f.equipamentos), equipamentos: f.equipamentos }
}

/** F29.1: datas válidas, fim depois do início e no máximo DIAS_MAX_FERIAS dias. */
export function validarFerias(f: Pick<Ferias, 'inicio' | 'fim'>): string | null {
  const inicio = Date.parse(`${f.inicio}T12:00:00Z`), fim = Date.parse(`${f.fim}T12:00:00Z`)
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return t('Escolhe a data de início e a de fim.')
  if (fim < inicio) return t('A data de fim tem de ser igual ou posterior à de início.')
  if ((fim - inicio) / 86_400_000 + 1 > DIAS_MAX_FERIAS) return t('O modo férias dura no máximo {n} semanas. Para mais tempo, gera um plano novo com o equipamento que tens.', { n: DIAS_MAX_FERIAS / 7 })
  return null
}

/** F29.2: o exercício das férias para uma posição; primeiro os substitutos do catálogo, depois o mesmo grupo. */
function trocar(ex: Exercicio, aF: Anamnese, catalogo: Catalogo, usados: Set<string>): Exercicio | null {
  if (!motivoIncompatibilidade(ex, aF) && !usados.has(ex.id)) return ex
  const candidatos = [
    ...ex.substitutos.map((id) => catalogo.get(id)).filter((x): x is Exercicio => !!x),
    ...[...catalogo.values()].filter((x) => x.grupoPrincipal === ex.grupoPrincipal && x.tipo === ex.tipo && !x.id.startsWith('proprio-')),
    ...[...catalogo.values()].filter((x) => x.grupoPrincipal === ex.grupoPrincipal && !x.id.startsWith('proprio-')),
  ]
  return candidatos.find((x) => !usados.has(x.id) && !motivoIncompatibilidade(x, aF)) ?? null
}

/**
 * F29.2: o plano com os exercícios das férias. As prescrições mantêm o id (o registo fica no mesmo sítio do treino)
 * e a rotação de blocos fica resolvida para a semana dada. Uma posição sem exercício compatível sai do treino.
 */
export function planoEmFerias(plano: Plano, a: Anamnese, f: Ferias, catalogo: Catalogo, semana: number): Plano {
  const aF = anamneseEmFerias(a, f)
  const { bloco } = estadoBloco(plano, semana)
  let retirados = 0
  const treinos = plano.treinos.map((tr) => {
    const usados = new Set<string>()
    const prescricoes = tr.prescricoes.flatMap((p): Prescricao[] => {
      const id = exercicioNoBloco(p.alternativas, p.exercicioId, bloco)
      const base = catalogo.get(id)
      if (!base) return [p]
      const novo = trocar(base, aF, catalogo, usados)
      if (!novo) {
        retirados++
        return []
      }
      usados.add(novo.id)
      const { alternativas: _a, nota: _n, ...resto } = p
      const mudou = novo.id !== base.id
      const semCargaAgora = soPesoCorporal(novo, aF) && !soPesoCorporal(base, a)
      const faixa = mudou || semCargaAgora ? (novo.faixaFixa ?? (soPesoCorporal(novo, aF) ? FAIXA_CORPORAL[novo.tipo] : p.faixa)) : p.faixa
      return [{ ...resto, exercicioId: novo.id, faixa, ...(mudou ? { nota: t('Férias: substitui «{nome}».', { nome: base.nome }) } : p.nota ? { nota: p.nota } : {}) }]
    })
    return { ...tr, prescricoes }
  })
  const aviso = t('Modo férias até {fim}: os exercícios foram adaptados ao equipamento que tens. O plano volta ao normal no fim.', { fim: f.fim })
  const avisoRetirados = retirados > 0 ? [t('Férias: {n} exercício(s) sem alternativa com este equipamento ficaram de fora.', { n: retirados })] : []
  return { ...plano, treinos, avisos: [aviso, ...avisoRetirados, ...plano.avisos] }
}
