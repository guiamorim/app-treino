import dados from '../catalog/exercicios.json'
import { carregarCatalogo } from './catalogo'
import type { Anamnese } from './types'

export const catalogo = carregarCatalogo(dados)

/** Perfil fictício para os testes (secção 9 da especificação). */
export const perfilExemplo: Anamnese = {
  idade: 45,
  alturaCm: 175,
  pesoKg: 85,
  cinturaCm: 92,
  sexo: 'masculino',
  objetivo: 'recomposicao',
  diasPorSemana: 4,
  duracaoMin: 60,
  experiencia: 'regresso',
  equipamento: 'ginasio',
  restricoes: [{ area: 'ombro', intensidade: 4, avaliadaPorProfissional: false }],
  aceitaCardio: true,
  parq: [false, false, false, false, false, false, false],
}
