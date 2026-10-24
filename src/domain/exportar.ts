// F17: ficha de treino e histórico em PDF e Excel; F15 (v1.5): relatório de fotos para o PT.
import type { Catalogo } from './catalogo'
import { compararFotos } from './fotos'
import { gerarPdf, type SecaoPdf } from './pdf'
import { semanaDoPlano, treinoEfetivo } from './plano'
import {
  INFO_MEDIDAS,
  MEDIDAS_CM,
  NOMES_GRUPOS,
  type Anamnese,
  type FotoAvaliacao,
  type Medicao,
  type Perfil,
  type Plano,
  type Pose,
  type Sessao,
} from './types'
import { gerarXlsx, type Folha } from './xlsx'

export interface DadosExportacao {
  anamnese: Anamnese | null
  plano: Plano | null
  sessoes: Sessao[]
  medicoes: Medicao[]
  fotos: FotoAvaliacao[]
  perfil: Perfil
}

const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
/** «2026-10-20» ou ISO completo → «20/10/2026». */
export const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const porData = <T extends { data: string }>(a: T, b: T) => a.data.localeCompare(b.data)
const sessoesPorData = (s: Sessao[]) => [...s].sort((a, b) => a.inicio.localeCompare(b.inicio))
const nomeTreino = (plano: Plano | null, id: string) => plano?.treinos.find((t) => t.id === id)?.nome ?? id

/** Ficha com as prescrições efetivas da semana atual (rotação, readaptação e descarga incluídas). */
function treinosAtuais(plano: Plano, agora: string) {
  const semana = semanaDoPlano(plano, agora)
  return plano.treinos.map((t) => treinoEfetivo(t, plano, semana))
}

export function folhaFicha(plano: Plano, catalogo: Catalogo, agora: string): Folha {
  const linhas = treinosAtuais(plano, agora).flatMap((t) =>
    t.prescricoes.map((p, i) => {
      const ex = catalogo.get(p.exercicioId)
      return [t.nome, i + 1, ex?.nome ?? p.exercicioId, ex ? NOMES_GRUPOS[ex.grupoPrincipal] : undefined, p.series, `${p.faixa[0]}–${p.faixa[1]}`, ex?.medida === 'segundos' ? 'segundos' : 'reps', `${p.rir[0]}–${p.rir[1]}`, p.descansoSeg, p.nota]
    }),
  )
  return { nome: 'Ficha', cabecalho: ['Treino', 'Ordem', 'Exercício', 'Grupo principal', 'Séries', 'Repetições', 'Unidade', 'RIR', 'Descanso (s)', 'Nota'], linhas }
}

export function folhaHistorico(sessoes: Sessao[], plano: Plano | null, catalogo: Catalogo): Folha {
  const linhas = sessoesPorData(sessoes).flatMap((s) =>
    s.exercicios.flatMap((e) =>
      e.series.map((x, i) => [s.inicio.slice(0, 10), nomeTreino(plano, s.treinoId), catalogo.get(e.exercicioId)?.nome ?? e.exercicioId, i + 1, x.carga, x.reps, x.rir, e.dor]),
    ),
  )
  return { nome: 'Histórico', cabecalho: ['Data', 'Treino', 'Exercício', 'Série', 'Carga (kg)', 'Reps', 'RIR', 'Dor (0–10)'], linhas }
}

export function folhaMedicoes(medicoes: Medicao[]): Folha {
  return {
    nome: 'Medições',
    cabecalho: ['Data', 'Peso (kg)', ...MEDIDAS_CM.map((k) => `${INFO_MEDIDAS[k].nome} (cm)`)],
    linhas: [...medicoes].sort(porData).map((m) => [m.data, m.pesoKg, ...MEDIDAS_CM.map((k) => m[k])]),
  }
}

export function excelFichaHistorico(d: DadosExportacao, catalogo: Catalogo, agora: string): Uint8Array<ArrayBuffer> {
  return gerarXlsx([...(d.plano ? [folhaFicha(d.plano, catalogo, agora)] : []), folhaHistorico(d.sessoes, d.plano, catalogo), folhaMedicoes(d.medicoes)])
}

const subtitulo = (d: DadosExportacao, agora: string) => `${d.perfil.nome ? `${d.perfil.nome} · ` : ''}Exportado em ${dataPt(agora)}`

export function pdfFicha(d: DadosExportacao, catalogo: Catalogo, agora: string): Uint8Array<ArrayBuffer> {
  const secoes: SecaoPdf[] = d.plano
    ? treinosAtuais(d.plano, agora).map((t) => ({
        titulo: `${t.nome} (cerca de ${t.duracaoEstimadaMin} min)`,
        linhas: [
          ...t.prescricoes.map((p, i) => {
            const ex = catalogo.get(p.exercicioId)
            const unidade = ex?.medida === 'segundos' ? 's' : 'reps'
            return `${i + 1}. ${ex?.nome ?? p.exercicioId} (${ex ? NOMES_GRUPOS[ex.grupoPrincipal] : ''}): ${p.series} × ${p.faixa[0]}–${p.faixa[1]} ${unidade} · RIR ${p.rir[0]}–${p.rir[1]} · descanso ${p.descansoSeg} s${p.nota ? ` · ${p.nota}` : ''}`
          }),
          ...(t.cardioMin ? [`Cardio: ${t.cardioMin} min`] : []),
        ],
      }))
    : [{ titulo: 'Sem plano', linhas: ['Preenche a anamnese para gerar o plano.'] }]
  if (d.plano?.avisos.length) secoes.push({ titulo: 'Avisos', linhas: d.plano.avisos.map((a) => `• ${a}`) })
  return gerarPdf('Ficha de treino', subtitulo(d, agora), secoes)
}

const textoMedicao = (m: Medicao) =>
  [m.pesoKg !== undefined && `peso ${num(m.pesoKg)} kg`, ...MEDIDAS_CM.map((k) => m[k] !== undefined && `${INFO_MEDIDAS[k].nome.toLowerCase()} ${num(m[k])} cm`)].filter(Boolean).join(' · ')

export function pdfHistorico(d: DadosExportacao, catalogo: Catalogo, agora: string): Uint8Array<ArrayBuffer> {
  const sessoes = sessoesPorData(d.sessoes).filter((s) => s.exercicios.some((e) => e.series.length > 0))
  const secoes: SecaoPdf[] = sessoes.map((s) => ({
    titulo: `${dataPt(s.inicio)} · ${nomeTreino(d.plano, s.treinoId)}`,
    linhas: s.exercicios
      .filter((e) => e.series.length > 0)
      .map((e) => {
        const ex = catalogo.get(e.exercicioId)
        const semCarga = ex?.incrementoKg === 0
        const series = e.series.map((x) => `${semCarga ? '' : `${num(x.carga)} kg × `}${x.reps}${x.rir !== undefined ? ` (RIR ${x.rir})` : ''}`).join(', ')
        return `${ex?.nome ?? e.exercicioId}: ${series}${e.dor ? ` · dor ${e.dor}/10` : ''}`
      }),
  }))
  if (secoes.length === 0) secoes.push({ titulo: 'Sem treinos registados', linhas: [] })
  if (d.medicoes.length) secoes.push({ titulo: 'Medições', linhas: [...d.medicoes].sort(porData).map((m) => `${dataPt(m.data)}: ${textoMedicao(m)}`) })
  return gerarPdf('Histórico de treino', subtitulo(d, agora), secoes)
}

const NOMES_POSES: Record<Pose, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }
const OBJETIVOS: Record<Anamnese['objetivo'], string> = { recomposicao: 'recomposição corporal', hipertrofia: 'hipertrofia', forca: 'força', saude: 'saúde geral' }

export function base64ParaBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const b = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const r = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) r[i] = b.charCodeAt(i)
  return r
}

/**
 * F15 (v1.5): relatório para o personal trainer. A app junta as fotos e os números;
 * a análise é feita pelo profissional.
 */
export function pdfRelatorioPt(d: DadosExportacao, catalogo: Catalogo, mesAntes: string, mesDepois: string, agora: string): Uint8Array<ArrayBuffer> {
  const a = d.anamnese
  const secoes: SecaoPdf[] = []
  if (a) {
    secoes.push({
      titulo: 'Contexto',
      linhas: [
        `${a.idade} anos · ${a.alturaCm} cm · objetivo: ${OBJETIVOS[a.objetivo]} · ${a.diasPorSemana} dias por semana, ${a.duracaoMin} min`,
        ...(a.restricoes.length ? [`Dores ou limitações: ${a.restricoes.map((r) => `${r.area} ${r.intensidade}/10`).join(', ')}`] : []),
      ],
    })
  }
  const [ano, mes] = mesDepois.split('-').map(Number) as [number, number]
  const fim = `${mesDepois}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`
  const inicio = `${mesAntes}-01`
  for (const pose of ['frente', 'lado', 'costas'] as const) {
    const c = compararFotos(d.fotos, d.medicoes, mesAntes, mesDepois, pose)
    if (!c.antes && !c.depois) continue
    const lados = [c.antes, c.depois].filter((x) => x !== undefined)
    secoes.push({
      titulo: NOMES_POSES[pose],
      imagens: lados.map((l) => ({ jpeg: base64ParaBytes(l.foto.imagem), legenda: dataPt(l.foto.data) })),
      linhas: lados.map((l) => `${dataPt(l.foto.data)}: ${l.medicao ? textoMedicao(l.medicao) : 'sem medição até 7 dias da foto'}${l.foto.nota ? ` · ${l.foto.nota}` : ''}`),
    })
  }
  const dif = compararFotos(d.fotos, d.medicoes, mesAntes, mesDepois, 'frente').diferencas
  const difs = [dif.pesoKg !== undefined && `peso ${dif.pesoKg > 0 ? '+' : ''}${num(dif.pesoKg)} kg`, ...MEDIDAS_CM.map((k) => dif[k] !== undefined && `${INFO_MEDIDAS[k].nome.toLowerCase()} ${dif[k]! > 0 ? '+' : ''}${num(dif[k]!)} cm`)].filter(Boolean)
  const medicoes = d.medicoes.filter((m) => m.data >= inicio && m.data <= fim).sort(porData)
  secoes.push({
    titulo: 'Números do período',
    linhas: [
      difs.length ? `Diferença (fotos de frente): ${difs.join(' · ')}` : 'Sem medições perto das duas datas para calcular a diferença.',
      ...medicoes.map((m) => `${dataPt(m.data)}: ${textoMedicao(m)}`),
    ],
  })
  const treinos = d.sessoes.filter((s) => s.inicio.slice(0, 10) >= inicio && s.inicio.slice(0, 10) <= fim && s.exercicios.some((e) => e.series.length > 0))
  const series = treinos.reduce((n, s) => n + s.exercicios.reduce((m, e) => m + e.series.length, 0), 0)
  const dores = treinos.flatMap((s) => s.exercicios.filter((e) => (e.dor ?? 0) >= 4).map((e) => `${dataPt(s.inicio)} ${catalogo.get(e.exercicioId)?.nome ?? e.exercicioId} ${e.dor}/10`))
  secoes.push({
    titulo: 'Treino no período',
    linhas: [`${treinos.length} treinos registados, ${series} séries.`, ...(dores.length ? [`Dor de 4/10 ou mais: ${dores.join('; ')}`] : [])],
  })
  secoes.push({ titulo: 'Notas do personal trainer', linhas: ['', '', '', ''] })
  const nome = d.perfil.nome ? `${d.perfil.nome} · ` : ''
  return gerarPdf('Avaliação física: relatório para o PT', `${nome}${dataPt(inicio)} a ${dataPt(fim > agora ? agora : fim)} · gerado em ${dataPt(agora)}`, secoes)
}
