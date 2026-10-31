import Dexie, { type EntityTable } from 'dexie'
import type { Anamnese, FotoAvaliacao, Medicao, Perfil, Plano, Sessao } from '../domain/types'
import { lerCopia, type Copia } from '../domain/copia'
import type { TipoCarga } from '../domain/carga'
import { lerProprios } from '../domain/proprios'
import type { Ferias } from '../domain/ferias'
import type { Degraus } from '../domain/escadas'

interface Valor {
  chave: 'anamnese' | 'plano' | 'videos' | 'ultimaExportacao' | 'perfil' | 'versaoVista' | 'idioma' | 'unidade' | 'tiposCarga' | 'barraKg' | 'exerciciosProprios' | 'ferias' | 'degraus'
  valor: unknown
}

export class BaseDados extends Dexie {
  valores!: EntityTable<Valor, 'chave'>
  sessoes!: EntityTable<Sessao, 'id'>
  medicoes!: EntityTable<Medicao, 'id'>
  fotos!: EntityTable<FotoAvaliacao, 'id'>

  constructor(nome = 'app-treino') {
    super(nome)
    this.version(1).stores({
      valores: 'chave',
      sessoes: 'id, inicio, planoId',
      medicoes: 'id, data',
    })
    this.version(2).stores({ fotos: 'id, data' })
  }

  async ler<T>(chave: Valor['chave']): Promise<T | undefined> {
    return (await this.valores.get(chave))?.valor as T | undefined
  }

  async gravar(chave: Valor['chave'], valor: unknown) {
    await this.valores.put({ chave, valor })
  }

  async exportar(agora: string): Promise<Copia> {
    const ferias = await this.ler<Ferias>('ferias')
    const degraus = await this.ler<Degraus>('degraus')
    const copia: Copia = {
      formato: 'app-treino',
      versao: 1,
      exportadoEm: agora,
      anamnese: (await this.ler<Anamnese>('anamnese')) ?? null,
      plano: (await this.ler<Plano>('plano')) ?? null,
      sessoes: await this.sessoes.orderBy('inicio').toArray(),
      medicoes: await this.medicoes.orderBy('data').toArray(),
      videos: (await this.ler<Record<string, string>>('videos')) ?? {},
      fotos: await this.fotos.orderBy('data').toArray(),
      perfil: (await this.ler<Perfil>('perfil')) ?? {},
      carga: { barraKg: await this.ler<number>('barraKg'), tipos: (await this.ler<Record<string, TipoCarga>>('tiposCarga')) ?? {} },
      exerciciosProprios: lerProprios(await this.ler('exerciciosProprios')),
      ...(ferias ? { ferias } : {}),
      ...(degraus && Object.keys(degraus).length > 0 ? { degraus } : {}),
    }
    await this.gravar('ultimaExportacao', agora)
    return copia
  }

  /** Substitui todos os dados pela cópia, só depois de a validar (F10.2). */
  async importar(dados: unknown) {
    const c = lerCopia(dados)
    await this.transaction('rw', [this.valores, this.sessoes, this.medicoes, this.fotos], async () => {
      await Promise.all([this.valores.clear(), this.sessoes.clear(), this.medicoes.clear(), this.fotos.clear()])
      if (c.anamnese) await this.gravar('anamnese', c.anamnese)
      if (c.plano) await this.gravar('plano', c.plano)
      await this.gravar('videos', c.videos)
      await this.sessoes.bulkPut(c.sessoes)
      await this.medicoes.bulkPut(c.medicoes)
      await this.fotos.bulkPut(c.fotos ?? [])
      if (c.perfil) await this.gravar('perfil', c.perfil)
      if (c.carga?.barraKg !== undefined) await this.gravar('barraKg', c.carga.barraKg)
      if (c.carga?.tipos) await this.gravar('tiposCarga', c.carga.tipos)
      if (c.exerciciosProprios) await this.gravar('exerciciosProprios', c.exerciciosProprios)
      if (c.ferias) await this.gravar('ferias', c.ferias)
      if (c.degraus) await this.gravar('degraus', c.degraus)
    })
  }
}

export const db = new BaseDados()
