import { describe, expect, it } from 'vitest'
import { excelFichaHistorico, folhaFicha, folhaHistorico, folhaMedicoes, pdfFicha, pdfHistorico, pdfRelatorioPt, type DadosExportacao } from './exportar'
import { catalogo, perfilExemplo } from './fixtures'
import { gerarPdf, lerJpeg, quebrarLinha } from './pdf'
import { gerarPlano } from './plano'
import type { Sessao } from './types'
import { crc32 } from './xlsx'
import { definirUnidade } from './unidades'

const AGORA = '2026-10-24T10:00:00.000Z'
const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora: '2026-10-01T08:00:00.000Z' })
const sessao: Sessao = {
  id: 's1', planoId: 'p1', treinoId: plano.treinos[0]!.id, inicio: '2026-10-20T10:00:00.000Z',
  exercicios: [{ prescricaoId: plano.treinos[0]!.prescricoes[0]!.id, exercicioId: plano.treinos[0]!.prescricoes[0]!.exercicioId, series: [{ carga: 20, reps: 10, rir: 2 }, { carga: 20, reps: 9 }], dor: 5 }],
}
// JPEG mínimo: SOI, APP0 e SOF0 de 4×6 px com 3 componentes (chega para o PDF o descrever).
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, 0, 6, 0, 4, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9])
const jpegDataUrl = `data:image/jpeg;base64,${btoa(String.fromCharCode(...JPEG))}`

const dados: DadosExportacao = {
  anamnese: perfilExemplo,
  plano,
  sessoes: [sessao],
  medicoes: [
    { id: 'm1', data: '2026-09-20', pesoKg: 90, cinturaCm: 98, bracoCm: 33 },
    { id: 'm2', data: '2026-10-20', pesoKg: 88.5, cinturaCm: 96, bracoCm: 33.5 },
  ],
  fotos: [
    { id: 'f1', data: '2026-09-20', pose: 'frente', imagem: jpegDataUrl },
    { id: 'f2', data: '2026-10-20', pose: 'frente', imagem: jpegDataUrl, nota: 'manhã' },
  ],
  perfil: { nome: 'Ana' },
}

const texto = (b: Uint8Array) => new TextDecoder('latin1').decode(b)

/** Verifica a tabela xref: cada posição tem de apontar para o início do objeto certo. */
function xrefValida(pdf: string) {
  const inicio = Number(/startxref\n(\d+)/.exec(pdf)![1])
  const linhas = pdf.slice(inicio).split('\n')
  const n = Number(linhas[1]!.split(' ')[1])
  for (let i = 1; i < n; i++) {
    const pos = Number(linhas[2 + i]!.slice(0, 10))
    expect(pdf.slice(pos, pos + `${i} 0 obj`.length)).toBe(`${i} 0 obj`)
  }
}

/** Lê um zip sem compressão (método 0) pelo diretório central. */
function lerZip(zip: Uint8Array): Map<string, { dados: Uint8Array; crc: number }> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  let fim = zip.length - 22
  while (v.getUint32(fim, true) !== 0x06054b50) fim--
  const total = v.getUint16(fim + 10, true)
  let p = v.getUint32(fim + 16, true)
  const r = new Map<string, { dados: Uint8Array; crc: number }>()
  for (let i = 0; i < total; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50)
    expect(v.getUint16(p + 10, true)).toBe(0)
    const crc = v.getUint32(p + 16, true)
    const tamanho = v.getUint32(p + 20, true)
    const nomeLen = v.getUint16(p + 28, true)
    const local = v.getUint32(p + 42, true)
    const nome = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nomeLen))
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    r.set(nome, { dados: zip.subarray(inicio, inicio + tamanho), crc })
    p += 46 + nomeLen
  }
  return r
}

describe('F17 exportar ficha e histórico', () => {
  it('a ficha tem uma linha por exercício do plano, com séries, repetições, RIR e descanso', () => {
    const f = folhaFicha(plano, catalogo, AGORA)
    expect(f.linhas).toHaveLength(plano.treinos.reduce((n, t) => n + t.prescricoes.length, 0))
    const p = plano.treinos[0]!.prescricoes[0]!
    expect(f.linhas[0]).toEqual([plano.treinos[0]!.nome, 1, catalogo.get(p.exercicioId)!.nome, expect.any(String), p.series, `${p.faixa[0]}–${p.faixa[1]}`, 'reps', `${p.rir[0]}–${p.rir[1]}`, p.descansoSeg, p.nota])
  })

  it('o histórico tem uma linha por série e as medições incluem as medidas novas', () => {
    expect(folhaHistorico([sessao], plano, catalogo).linhas).toEqual([
      ['2026-10-20', plano.treinos[0]!.nome, catalogo.get(sessao.exercicios[0]!.exercicioId)!.nome, 1, 20, 10, 2, 5, undefined],
      ['2026-10-20', plano.treinos[0]!.nome, catalogo.get(sessao.exercicios[0]!.exercicioId)!.nome, 2, 20, 9, undefined, 5, undefined],
    ])
    const m = folhaMedicoes([dados.medicoes[1]!, dados.medicoes[0]!])
    expect(m.cabecalho).toEqual(['Data', 'Peso (kg)', 'Cintura (cm)', 'Peito (cm)', 'Braço (cm)', 'Anca (cm)', 'Coxa (cm)'])
    expect(m.linhas[0]).toEqual(['2026-09-20', 90, 98, undefined, 33, undefined, undefined])
  })

  it('Excel: zip válido com as folhas Ficha, Histórico e Medições', () => {
    const zip = lerZip(excelFichaHistorico(dados, catalogo, AGORA))
    for (const [, f] of zip) expect(f.crc).toBe(crc32(f.dados))
    expect([...zip.keys()]).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/worksheets/sheet3.xml']))
    const dec = (n: string) => new TextDecoder().decode(zip.get(n)!.dados)
    expect(dec('xl/workbook.xml')).toContain('<sheet name="Ficha" sheetId="1" r:id="rId1"/><sheet name="Histórico" sheetId="2" r:id="rId2"/><sheet name="Medições" sheetId="3" r:id="rId3"/>')
    expect(dec('xl/worksheets/sheet2.xml')).toContain('<c r="E2"><v>20</v></c>')
    expect(dec('xl/worksheets/sheet3.xml')).toContain('<c r="B3"><v>88.5</v></c>')
  })

  it('F23.1 exercícios por tempo: a ficha pede reserva em segundos e o histórico mostra-a', () => {
    const tempo = { ...plano.treinos[0]!.prescricoes[0]!, exercicioId: 'prancha', rir: [1, 2] as [number, number] }
    const comPrancha = { ...plano, treinos: [{ ...plano.treinos[0]!, prescricoes: [tempo] }] }
    expect(folhaFicha(comPrancha, catalogo, AGORA).linhas[0]![7]).toBe('reserva +15–30 s')
    const leve = { ...comPrancha, treinos: [{ ...comPrancha.treinos[0]!, prescricoes: [{ ...tempo, rir: [3, 4] as [number, number] }] }] }
    expect(folhaFicha(leve, catalogo, AGORA).linhas[0]![7]).toBe('reserva +30–45 s')
    const s: Sessao = { ...sessao, exercicios: [{ prescricaoId: tempo.id, exercicioId: 'prancha', series: [{ carga: 0, reps: 40, reservaSeg: 15 }, { carga: 0, reps: 30, reservaSeg: 61 }], dor: 0 }] }
    expect(folhaHistorico([s], comPrancha, catalogo).linhas.map((l) => l.at(-1))).toEqual([15, '> 60'])
    const pdf = texto(pdfHistorico({ ...dados, plano: comPrancha, sessoes: [s] }, catalogo, AGORA))
    expect(pdf).toContain('\\(+15 s\\)')
    expect(pdf).toContain('\\(> 60 s\\)')
  })

  it('F22.9 em libras: cabeçalhos e valores na unidade escolhida', () => {
    definirUnidade('lb')
    try {
      const h = folhaHistorico([sessao], plano, catalogo)
      expect(h.cabecalho[4]).toBe('Carga (lb)')
      expect(h.linhas[0]![4]).toBeCloseTo(44.09, 2)
      const m = folhaMedicoes([dados.medicoes[0]!])
      expect(m.cabecalho[1]).toBe('Peso (lb)')
      expect(m.linhas[0]![1]).toBeCloseTo(198.42, 2)
    } finally {
      definirUnidade('kg')
    }
  })

  it('crc32 dá o valor de referência', () => {
    expect(crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })

  it('PDF: cabeçalho, xref certa e texto com acentos em WinAnsi', () => {
    const pdf = texto(pdfFicha(dados, catalogo, AGORA))
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    xrefValida(pdf)
    expect(pdf).toContain('(Ficha de treino)')
    expect(pdf).toContain('(Ana \\267 Exportado em 24/10/2026)')
    expect(pdf).toContain('/Encoding /WinAnsiEncoding')
  })

  it('PDF: muitas linhas passam para páginas seguintes e parênteses são escapados', () => {
    const pdf = texto(gerarPdf('T', 's', [{ titulo: 'Longa', linhas: Array.from({ length: 120 }, (_, i) => `linha (${i})`) }]))
    expect(Number(/\/Count (\d+)/.exec(pdf)![1])).toBeGreaterThan(1)
    expect(pdf).toContain('(linha \\(119\\))')
    xrefValida(pdf)
    expect(quebrarLinha('a '.repeat(100).trim(), 20).every((l) => l.length <= 20)).toBe(true)
  })

  it('PDF do histórico lista séries, dor e medições', () => {
    const pdf = texto(pdfHistorico(dados, catalogo, AGORA))
    expect(pdf).toContain('20 kg \\327 10 \\(RIR 2\\), 20 kg \\327 9 \\267 dor 5/10')
    expect(pdf).toContain('20/10/2026: peso 88,5 kg \\267 cintura 96 cm \\267 bra\\347o 33,5 cm')
  })
})

describe('F15 v1.5 relatório para o PT', () => {
  it('junta as fotos lado a lado como JPEG, as diferenças e um espaço para as notas do PT', () => {
    const pdf = texto(pdfRelatorioPt(dados, catalogo, '2026-09', '2026-10', AGORA))
    xrefValida(pdf)
    expect(pdf.match(/\/Subtype \/Image \/Width 4 \/Height 6 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode/g)).toHaveLength(2)
    expect(pdf).toContain('Diferen\\347a \\(fotos de frente\\): peso -1,5 kg \\267 cintura -2 cm \\267 bra\\347o +0,5 cm')
    expect(pdf).toContain('(1 treinos registados, 2 s\\351ries.)')
    expect(pdf).toContain('(Notas do personal trainer)')
    expect(pdf).toContain('01/09/2026 a 24/10/2026')
  })

  it('lê as dimensões do JPEG e rejeita o que não é JPEG', () => {
    expect(lerJpeg(JPEG)).toEqual({ largura: 4, altura: 6, componentes: 3 })
    expect(() => lerJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow()
  })
})
