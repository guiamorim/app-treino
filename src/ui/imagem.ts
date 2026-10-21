// F15/F16: redimensiona e recodifica em JPEG no próprio dispositivo. Desenhar num canvas e exportar
// descarta os metadados do ficheiro original (EXIF, incluindo a localização GPS).
export async function reduzirImagem(ficheiro: File, maxLado: number, qualidade = 0.82): Promise<string> {
  if (!ficheiro.type.startsWith('image/')) throw new Error('O ficheiro não é uma imagem.')
  const url = URL.createObjectURL(ficheiro)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}
