import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { BaseDados } from './db'
import { gerarPlano } from '../domain/plano'
import { catalogo, perfilExemplo } from '../domain/fixtures'

describe('F10 exportar e importar', () => {
  it('ida e volta mantém os dados', async () => {
    const a = new BaseDados('a')
    await a.gravar('anamnese', perfilExemplo)
    await a.gravar('plano', gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora: '2026-10-20T08:00:00.000Z' }))
    await a.sessoes.put({ id: 's1', planoId: 'p1', treinoId: 'superior-a', inicio: '2026-10-20T10:00:00.000Z', exercicios: [] })
    await a.medicoes.put({ id: 'm1', data: '2026-10-20', pesoKg: 85 })
    await a.fotos.put({ id: 'f1', data: '2026-10-20', pose: 'lado', imagem: 'data:image/jpeg;base64,/9j/AAAA' })
    await a.gravar('perfil', { nome: 'Rui' })
    await a.cardio.put({ id: 'c1', data: '2026-10-20T18:00:00.000Z', modalidade: 'bicicleta', minutos: 30, esforco: 6, distanciaKm: 12, sessaoId: 's1' })
    const copia = await a.exportar('2026-10-20T12:00:00.000Z')

    const b = new BaseDados('b')
    await b.medicoes.put({ id: 'velha', data: '2020-01-01', pesoKg: 80 })
    await b.importar(JSON.parse(JSON.stringify(copia)))
    expect(await b.exportar('2026-10-20T12:00:00.000Z')).toEqual(copia)
    expect(copia.fotos).toHaveLength(1)
    expect(copia.perfil).toEqual({ nome: 'Rui' })
    // F36.5: o cardio entra na cópia.
    expect(copia.cardio).toHaveLength(1)
  })

  it('F10.2 ficheiro inválido não altera os dados existentes', async () => {
    const c = new BaseDados('c')
    await c.medicoes.put({ id: 'm1', data: '2026-10-20', pesoKg: 85 })
    await expect(c.importar({ formato: 'app-treino', versao: 1 })).rejects.toThrow()
    expect(await c.medicoes.count()).toBe(1)
  })
})
