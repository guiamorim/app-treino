// F17: PDF de texto escrito à mão (sem bibliotecas), A4, Helvetica com WinAnsiEncoding.

export interface ImagemPdf {
  /** JPEG tal como guardado (F15); entra no PDF sem ser recodificado. */
  jpeg: Uint8Array
  legenda: string
}

export interface SecaoPdf {
  titulo: string
  linhas: string[]
  /** Fotos lado a lado, por cima das linhas da secção. */
  imagens?: ImagemPdf[]
}

const LARGURA = 595
const ALTURA = 842
const MARGEM = 50
const CORPO = 10
const ENTRELINHA = 14
const MAX_CARACTERES = 92

// Caracteres do Windows-1252 fora do Latin-1 (0x80–0x9F) que fazem falta em português.
const WIN_ANSI: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 }

function byteWinAnsi(c: string): number {
  const n = c.codePointAt(0)!
  if ((n >= 0x20 && n < 0x7f) || (n >= 0xa0 && n <= 0xff)) return n
  return WIN_ANSI[c] ?? 0x3f // «?»
}

/** Texto PDF entre parênteses, já em bytes WinAnsi escritos como escapes octais. */
function textoPdf(s: string): string {
  let r = '('
  for (const c of s) {
    const b = byteWinAnsi(c)
    if (c === '(' || c === ')' || c === '\\') r += `\\${c}`
    else if (b < 0x80) r += String.fromCharCode(b)
    else r += `\\${b.toString(8).padStart(3, '0')}`
  }
  return `${r})`
}

/** Parte uma linha longa em palavras, sem passar a largura da página. */
export function quebrarLinha(s: string, max = MAX_CARACTERES): string[] {
  const r: string[] = []
  let atual = ''
  for (const palavra of s.split(' ')) {
    if (atual && (atual + ' ' + palavra).length > max) {
      r.push(atual)
      atual = palavra
    } else atual = atual ? `${atual} ${palavra}` : palavra
    while (atual.length > max) {
      r.push(atual.slice(0, max))
      atual = atual.slice(max)
    }
  }
  r.push(atual)
  return r
}

/** Dimensões e componentes de cor de um JPEG, lidos do marcador SOF. */
export function lerJpeg(dados: Uint8Array): { largura: number; altura: number; componentes: number } {
  if (dados[0] !== 0xff || dados[1] !== 0xd8) throw new Error('Não é um JPEG.')
  let i = 2
  while (i + 9 < dados.length) {
    if (dados[i] !== 0xff) throw new Error('JPEG inválido.')
    const m = dados[i + 1]!
    const tamanho = (dados[i + 2]! << 8) | dados[i + 3]!
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { altura: (dados[i + 5]! << 8) | dados[i + 6]!, largura: (dados[i + 7]! << 8) | dados[i + 8]!, componentes: dados[i + 9]! }
    i += 2 + tamanho
  }
  throw new Error('JPEG sem dimensões.')
}

type Linha =
  | { tipo: 'texto'; texto: string; tamanho: number; negrito: boolean; antes: number }
  | { tipo: 'imagens'; imagens: (ImagemPdf & { largura: number; altura: number; componentes: number; id: number })[]; alturaImg: number }

const alturaLinha = (l: Linha) => (l.tipo === 'texto' ? l.antes + Math.max(ENTRELINHA, l.tamanho + 4) : l.alturaImg + 8 + ENTRELINHA)
const ESPACO = 12
const MAX_ALTURA_IMG = 330

function paginar(titulo: string, subtitulo: string, secoes: SecaoPdf[], proximoId: () => number): Linha[][] {
  const texto = (t: string, tamanho = CORPO, negrito = false, antes = 0): Linha => ({ tipo: 'texto', texto: t, tamanho, negrito, antes })
  const linhas: Linha[] = [texto(titulo, 18, true), texto(subtitulo, CORPO, false, 8)]
  for (const s of secoes) {
    linhas.push(texto(s.titulo, 13, true, 14))
    if (s.imagens?.length) {
      const larguraCaixa = (LARGURA - 2 * MARGEM - ESPACO * (s.imagens.length - 1)) / s.imagens.length
      const imagens = s.imagens.map((im) => ({ ...im, ...lerJpeg(im.jpeg), id: proximoId() }))
      const alturaImg = Math.min(MAX_ALTURA_IMG, ...imagens.map((im) => (larguraCaixa * im.altura) / im.largura))
      linhas.push({ tipo: 'imagens', imagens, alturaImg })
    }
    for (const l of s.linhas) for (const parte of quebrarLinha(l)) linhas.push(texto(parte))
  }
  const paginas: Linha[][] = [[]]
  let y = ALTURA - MARGEM
  linhas.forEach((l, i) => {
    const altura = alturaLinha(l)
    // Um título de secção não fica sozinho no fim da página: vai com a linha seguinte.
    const seguinte = l.tipo === 'texto' && l.tamanho === 13 && linhas[i + 1] ? alturaLinha(linhas[i + 1]!) : 0
    if (y - altura - seguinte < MARGEM && paginas.at(-1)!.length > 0) {
      paginas.push([])
      y = ALTURA - MARGEM
    }
    paginas.at(-1)!.push(l)
    y -= altura
  })
  return paginas
}

function conteudoPagina(linhas: Linha[], n: number, total: number): string {
  const ops: string[] = []
  let y = ALTURA - MARGEM
  const escrever = (fonte: string, tamanho: number, x: number, yy: number, t: string) => ops.push(`BT /${fonte} ${tamanho} Tf 1 0 0 1 ${x} ${yy} Tm ${textoPdf(t)} Tj ET`)
  for (const l of linhas) {
    y -= alturaLinha(l)
    if (l.tipo === 'texto') escrever(l.negrito ? 'F2' : 'F1', l.tamanho, MARGEM, y, l.texto)
    else {
      const larguraCaixa = (LARGURA - 2 * MARGEM - ESPACO * (l.imagens.length - 1)) / l.imagens.length
      l.imagens.forEach((im, i) => {
        const w = Math.round((l.alturaImg * im.largura) / im.altura * 100) / 100
        const x = MARGEM + i * (larguraCaixa + ESPACO)
        const yImg = y + ENTRELINHA + 4
        ops.push(`q ${w} 0 0 ${Math.round(l.alturaImg * 100) / 100} ${Math.round(x * 100) / 100} ${yImg} cm /Im${im.id} Do Q`)
        escrever('F1', 9, Math.round(x * 100) / 100, y + 2, im.legenda)
      })
    }
  }
  escrever('F1', 8, LARGURA - MARGEM - 40, MARGEM / 2, `${n} / ${total}`)
  return ops.join('\n')
}

export function gerarPdf(titulo: string, subtitulo: string, secoes: SecaoPdf[]): Uint8Array<ArrayBuffer> {
  // 1 catálogo, 2 páginas, 3 e 4 tipos de letra; depois imagens, páginas e conteúdos.
  const objetos: (string | { dicionario: string; dados: Uint8Array })[] = []
  objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objetos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objetos[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  let seguinte = 5
  const paginas = paginar(titulo, subtitulo, secoes, () => seguinte++)
  const idsPaginas: number[] = []
  paginas.forEach((p, i) => {
    const imagens = p.flatMap((l) => (l.tipo === 'imagens' ? l.imagens : []))
    for (const im of imagens) {
      const cor = im.componentes === 1 ? '/DeviceGray' : im.componentes === 4 ? '/DeviceCMYK' : '/DeviceRGB'
      objetos[im.id] = { dicionario: `<< /Type /XObject /Subtype /Image /Width ${im.largura} /Height ${im.altura} /ColorSpace ${cor} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>`, dados: im.jpeg }
    }
    const idPagina = seguinte++
    const idConteudo = seguinte++
    idsPaginas.push(idPagina)
    const conteudo = conteudoPagina(p, i + 1, paginas.length)
    const xobjetos = imagens.length ? ` /XObject << ${imagens.map((im) => `/Im${im.id} ${im.id} 0 R`).join(' ')} >>` : ''
    objetos[idPagina] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjetos} >> /Contents ${idConteudo} 0 R >>`
    objetos[idConteudo] = `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`
  })
  objetos[2] = `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(' ')}] /Count ${paginas.length} >>`

  // O texto é ASCII (os acentos vão em escapes octais); só as imagens são binárias.
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  let tamanho = 0
  const juntar = (p: string | Uint8Array) => {
    const b = typeof p === 'string' ? enc.encode(p) : p
    partes.push(b)
    tamanho += b.length
  }
  juntar('%PDF-1.4\n')
  const posicoes: number[] = []
  for (let i = 1; i < objetos.length; i++) {
    posicoes[i] = tamanho
    const o = objetos[i]!
    if (typeof o === 'string') juntar(`${i} 0 obj\n${o}\nendobj\n`)
    else {
      juntar(`${i} 0 obj\n${o.dicionario}\nstream\n`)
      juntar(o.dados)
      juntar('\nendstream\nendobj\n')
    }
  }
  const xref = tamanho
  juntar(`xref\n0 ${objetos.length}\n0000000000 65535 f \n`)
  for (let i = 1; i < objetos.length; i++) juntar(`${String(posicoes[i]).padStart(10, '0')} 00000 n \n`)
  juntar(`trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  const r = new Uint8Array(tamanho)
  let i = 0
  for (const p of partes) {
    r.set(p, i)
    i += p.length
  }
  return r
}
