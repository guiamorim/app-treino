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
    { id: 's1', planoId: 'p1', treinoId: 'superior-a', inicio: '2026-10-20T10:00:00.000Z', fim: '2026-10-20T11:00:00.000Z', alongamento: 'feito',
      exercicios: [{ prescricaoId: 'superior-a-1', exercicioId: 'supino-halteres-neutro', series: [{ carga: 20, reps: 10, rir: 2 }], dor: 1 }] },
  ],
  medicoes: [{ id: 'm1', data: '2026-10-20', pesoKg: 85, cinturaCm: 92, peitoCm: 101, bracoCm: 34, ancaCm: 100, coxaCm: 58 }],
  videos: { 'leg-press': 'https://youtu.be/waAxlYvtCcI' },
  fotos: [{ id: 'f1', data: '2026-10-20', pose: 'frente', imagem: 'data:image/jpeg;base64,/9j/AAAA', nota: 'manhã' }],
  perfil: { nome: 'Ana', foto: 'data:image/jpeg;base64,/9j/BBBB' },
  cardio: [{ id: 'c1', data: '2026-10-20T18:00:00.000Z', modalidade: 'corrida', minutos: 25, esforco: 7, distanciaKm: 4.2, fcMedia: 151 }],
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
    ['F15 foto que não é JPEG em base64', { ...copia, fotos: [{ ...copia.fotos![0], imagem: 'data:image/svg+xml;base64,PHN2Zz4=' }] }],
    ['F15 foto com pose desconhecida', { ...copia, fotos: [{ ...copia.fotos![0], pose: 'cima' }] }],
    ['F9 braço fora do intervalo', { ...copia, medicoes: [{ ...copia.medicoes[0], bracoCm: 200 }] }],
    ['F16 nome com mais de 40 caracteres', { ...copia, perfil: { nome: 'x'.repeat(41) } }],
    ['campo inesperado', { ...copia, extra: '<script>' }],
    ['F23.1 reserva acima de 600 s', { ...copia, sessoes: [{ ...copia.sessoes[0], exercicios: [{ ...copia.sessoes[0]!.exercicios[0], series: [{ carga: 0, reps: 40, reservaSeg: 601 }] }] }] }],
    ['F24.5 forma de contar desconhecida', { ...copia, sessoes: [{ ...copia.sessoes[0], exercicios: [{ ...copia.sessoes[0]!.exercicios[0], tipoCarga: 'por-disco' }] }] }],
    ['F24.5 barra fora do intervalo', { ...copia, carga: { barraKg: 50 } }],
    ['F36.5 cardio com modalidade desconhecida', { ...copia, cardio: [{ ...copia.cardio![0], modalidade: 'patins' }] }],
    ['F36.5 cardio com mais de 300 min', { ...copia, cardio: [{ ...copia.cardio![0], minutos: 301 }] }],
    ['F36.5 cardio com esforço fora de 0–10', { ...copia, cardio: [{ ...copia.cardio![0], esforco: 11 }] }],
    ['nada', null],
  ])('F10.2 rejeita ficheiro inválido: %s', (_, dados) => {
    expect(() => lerCopia(dados)).toThrow()
  })

  it('CSV do histórico: uma linha por série, com cabeçalho e aspas escapadas', () => {
    const csv = paraCsv(copia.sessoes, catalogo)
    expect(csv.split('\n')).toEqual([
      'data,treino,exercicio,serie,carga_kg,reps,rir,dor,reserva_s,tipo_carga',
      '2026-10-20T10:00:00.000Z,superior-a,"Supino com halteres, pega neutra",1,20,10,2,1,,',
    ])
  })

  it('F23.1 a reserva em segundos entra na cópia e no CSV; cópias antigas sem ela continuam válidas', () => {
    const prancha = { prescricaoId: 'x', exercicioId: 'prancha', series: [{ carga: 0, reps: 40, reservaSeg: 30 }, { carga: 0, reps: 35, reservaSeg: 61 }] }
    const comReserva = { ...copia, sessoes: [{ ...copia.sessoes[0]!, exercicios: [prancha] }] }
    expect(lerCopia(JSON.parse(JSON.stringify(comReserva)))).toEqual(comReserva)
    expect(paraCsv(comReserva.sessoes, catalogo).split('\n').slice(1).map((l) => l.split(',').at(-2))).toEqual(['30', '61'])
  })

  it('F24.5 a forma de contar, as escolhas e o peso da barra entram na cópia e no CSV', () => {
    const comForma: Copia = {
      ...copia,
      sessoes: [{ ...copia.sessoes[0]!, exercicios: [{ ...copia.sessoes[0]!.exercicios[0]!, tipoCarga: 'halter' }] }],
      carga: { barraKg: 15, tipos: { 'gemeos-pe': 'halter' } },
    }
    expect(lerCopia(JSON.parse(JSON.stringify(comForma)))).toEqual(comForma)
    expect(paraCsv(comForma.sessoes, catalogo).split('\n')[1]!.split(',').at(-1)).toBe('halter')
  })
})
