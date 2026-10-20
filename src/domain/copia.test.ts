import { describe, expect, it } from 'vitest'
import { lerCopia, paraCsv, type Copia } from './copia'
import { gerarPlano } from './plano'
import { catalogo, perfilExemplo } from './fixtures'

const copia: Copia = {
  formato: 'app-treino',
  versao: 1,
  exportadoEm: '2026-10-20T12:00:00.000Z',
  anamnese: perfilExemplo,
  plano: gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora: '2026-10-20T08:00:00.000Z' }),
  sessoes: [
    { id: 's1', planoId: 'p1', treinoId: 'superior-a', inicio: '2026-10-20T10:00:00.000Z', fim: '2026-10-20T11:00:00.000Z',
      exercicios: [{ prescricaoId: 'superior-a-1', exercicioId: 'supino-halteres-neutro', series: [{ carga: 20, reps: 10, rir: 2 }], dor: 1 }] },
  ],
  medicoes: [{ id: 'm1', data: '2026-10-20', pesoKg: 85, cinturaCm: 92 }],
  videos: { 'leg-press': 'https://youtu.be/waAxlYvtCcI' },
}

describe('F10 cópia de segurança', () => {
  it('uma cópia exportada é lida sem perdas', () => {
    expect(lerCopia(JSON.parse(JSON.stringify(copia)))).toEqual(copia)
  })

  it.each([
    ['formato errado', { ...copia, formato: 'outra-app' }],
    ['versão futura', { ...copia, versao: 99 }],
    ['série com reps negativas', { ...copia, sessoes: [{ ...copia.sessoes[0], exercicios: [{ ...copia.sessoes[0]!.exercicios[0], series: [{ carga: 20, reps: -1 }] }] }] }],
    ['dor fora de 0–10', { ...copia, sessoes: [{ ...copia.sessoes[0], exercicios: [{ ...copia.sessoes[0]!.exercicios[0], dor: 11 }] }] }],
    ['vídeo de domínio não permitido', { ...copia, videos: { x: 'https://evil.com/v' } }],
    ['campo inesperado', { ...copia, extra: '<script>' }],
    ['nada', null],
  ])('F10.2 rejeita ficheiro inválido: %s', (_, dados) => {
    expect(() => lerCopia(dados)).toThrow()
  })

  it('CSV do histórico: uma linha por série, com cabeçalho e aspas escapadas', () => {
    const csv = paraCsv(copia.sessoes, catalogo)
    expect(csv.split('\n')).toEqual([
      'data,treino,exercicio,serie,carga_kg,reps,rir,dor',
      '2026-10-20T10:00:00.000Z,superior-a,"Supino com halteres, pega neutra",1,20,10,2,1',
    ])
  })
})
