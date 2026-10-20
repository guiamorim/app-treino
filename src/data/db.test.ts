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
    const copia = await a.exportar('2026-10-20T12:00:00.000Z')

    const b = new BaseDados('b')
    await b.medicoes.put({ id: 'velha', data: '2020-01-01', pesoKg: 80 })
    await b.importar(JSON.parse(JSON.stringify(copia)))
    expect(await b.exportar('2026-10-20T12:00:00.000Z')).toEqual(copia)
  })

  it('F10.2 ficheiro inválido não altera os dados existentes', async () => {
    const c = new BaseDados('c')
    await c.medicoes.put({ id: 'm1', data: '2026-10-20', pesoKg: 85 })
    await expect(c.importar({ formato: 'app-treino', versao: 1 })).rejects.toThrow()
    expect(await c.medicoes.count()).toBe(1)
  })
})
