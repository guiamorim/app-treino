import { describe, expect, it } from 'vitest'
import { saudacao } from './perfil'

const as = (h: number, m = 0) => new Date(2026, 9, 20, h, m)

describe('F16 saudação pela hora do dispositivo', () => {
  it.each([
    [5, 0, 'Bom dia'],
    [11, 59, 'Bom dia'],
    [12, 0, 'Boa tarde'],
    [19, 59, 'Boa tarde'],
    [20, 0, 'Boa noite'],
    [0, 30, 'Boa noite'],
    [4, 59, 'Boa noite'],
  ])('%i:%i → %s', (h, m, esperado) => {
    expect(saudacao(as(h, m))).toBe(esperado)
  })

  it('junta o nome quando existe e ignora espaços', () => {
    expect(saudacao(as(9), 'Ana')).toBe('Bom dia, Ana')
    expect(saudacao(as(9), '  ')).toBe('Bom dia')
    expect(saudacao(as(21), ' Rui ')).toBe('Boa noite, Rui')
  })
})
