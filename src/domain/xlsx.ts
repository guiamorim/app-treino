// F17: livro Excel (.xlsx) escrito à mão: um zip sem compressão com o XML mínimo do formato.

export type Celula = string | number | undefined

export interface Folha {
  nome: string
  cabecalho: string[]
  linhas: Celula[][]
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff
  for (const b of dados) c = TABELA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Zip «stored» (método 0), suficiente para o Excel, o Numbers e o LibreOffice. */
export function zipSemCompressao(ficheiros: { nome: string; dados: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let posicao = 0
  const DATA_DOS = 0x0021 // 1980-01-01
  for (const f of ficheiros) {
    const nome = enc.encode(f.nome)
    const crc = crc32(f.dados)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nomes em UTF-8
    local.setUint16(8, 0, true)
    local.setUint16(10, 0, true)
    local.setUint16(12, DATA_DOS, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, f.dados.length, true)
    local.setUint32(22, f.dados.length, true)
    local.setUint16(26, nome.length, true)
    local.setUint16(28, 0, true)
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, 0, true)
    cd.setUint16(14, DATA_DOS, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, f.dados.length, true)
    cd.setUint32(24, f.dados.length, true)
    cd.setUint16(28, nome.length, true)
    cd.setUint32(42, posicao, true)
    partes.push(new Uint8Array(local.buffer), nome, f.dados)
    central.push(new Uint8Array(cd.buffer), nome)
    posicao += 30 + nome.length + f.dados.length
  }
  const tamanhoCentral = central.reduce((s, p) => s + p.length, 0)
  const fim = new DataView(new ArrayBuffer(22))
  fim.setUint32(0, 0x06054b50, true)
  fim.setUint16(8, ficheiros.length, true)
  fim.setUint16(10, ficheiros.length, true)
  fim.setUint32(12, tamanhoCentral, true)
  fim.setUint32(16, posicao, true)
  const todas = [...partes, ...central, new Uint8Array(fim.buffer)]
  const r = new Uint8Array(todas.reduce((s, p) => s + p.length, 0))
  let i = 0
  for (const p of todas) {
    r.set(p, i)
    i += p.length
  }
  return r
}

const xml = (s: string) =>
  // Remove caracteres de controlo que o XML não aceita.
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function coluna(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function celula(v: Celula, ref: string, estilo = 0): string {
  if (v === undefined || v === '') return ''
  const s = estilo ? ` s="${estilo}"` : ''
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`
}

function folhaXml(f: Folha): string {
  const linhas = [f.cabecalho, ...f.linhas].map((l, r) => `<row r="${r + 1}">${l.map((v, c) => celula(v, `${coluna(c)}${r + 1}`, r === 0 ? 1 : 0)).join('')}</row>`)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${linhas.join('')}</sheetData></worksheet>`
}

/** Nomes de folha: até 31 caracteres, sem []:*?/\. */
const nomeFolha = (s: string) => s.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)

export function gerarXlsx(folhas: Folha[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const NS = 'http://schemas.openxmlformats.org'
  const ficheiros: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>${folhas.map((f, i) => `<sheet name="${xml(nomeFolha(f.nome))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS}/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${folhas.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`],
    ...folhas.map((f, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, folhaXml(f)]),
  ]
  return zipSemCompressao(ficheiros.map(([nome, conteudo]) => ({ nome, dados: enc.encode(conteudo) })))
}
