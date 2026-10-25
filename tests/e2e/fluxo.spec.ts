import { expect, test, type Page } from '@playwright/test'

async function preencherAnamnese(page: Page) {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible()
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Cintura (cm)').fill('92')
  await page.getByLabel('Dias por semana').selectOption('4')
  await page.getByLabel('Ombro').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
}

test('F1–F4: anamnese gera o plano e registo um exercício', async ({ page }) => {
  const erros: string[] = []
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', (e) => erros.push(e.message))

  await preencherAnamnese(page)

  // F3: treino de hoje com síntese, grupos e aviso do ombro.
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await expect(page.getByText('foco em peito e costas')).toBeVisible()
  await expect(page.getByText('Supino com halteres, pega neutra')).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toHaveCount(0)
  await page.getByText(/aviso.* sobre o teu plano/).click()
  await expect(page.getByText(/ombro nunca foi avaliada/)).toBeVisible()

  // F4: registo de séries com sugestão e temporizador.
  await page.getByText('Supino com halteres, pega neutra').click()
  await expect(page.getByRole('heading', { name: 'Supino com halteres, pega neutra' })).toBeVisible()
  await expect(page.getByText(/Hoje: 2 × 6–10 reps · RIR 3–4/)).toBeVisible()
  await expect(page.getByText('Primeira vez')).toBeVisible()
  await page.getByLabel('Carga (kg)').fill('16')
  await page.getByLabel('Repetições').fill('10')
  await page.getByRole('radio', { name: '3' }).click()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('button', { name: 'Saltar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.getByText('Exercício feito ✓')).toBeVisible()

  // F4.4: dor registada.
  const dor = page.getByLabel(/Dor ou desconforto/)
  await dor.focus()
  for (let i = 0; i < 5; i++) await dor.press('ArrowRight')
  await expect(page.getByText(/Dor moderada/)).toBeVisible()

  // F3.5: estado guardado e visível ao voltar (mesmo depois de recarregar).
  await page.reload()
  await page.getByRole('button', { name: 'Próximo exercício' }).click()
  await expect(page.getByRole('heading', { name: 'Remada sentada no cabo (triângulo)' })).toBeVisible()
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByLabel('feito')).toHaveCount(1)

  // F3.4: saltar o resto completa o treino.
  for (const nome of ['Remada sentada no cabo (triângulo)', 'Puxada à frente na polia alta', 'Elevação lateral com halteres', 'Rosca alternada com halteres', 'Extensão de tríceps na polia com corda']) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByRole('button', { name: 'Saltar', exact: true }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await expect(page.getByText('Treino completo 🎉')).toBeVisible()
  await page.getByRole('button', { name: 'Terminar treino' }).click()
  await expect(page.getByRole('heading', { name: 'Inferior A' })).toBeVisible()

  // F7: relatório de progressão.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page.getByLabel('Exercício')).toHaveValue('supino-halteres-neutro')
  await expect(page.getByText('🏆')).toBeVisible()
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page.getByText(/1 de 16 treinos/)).toBeVisible()

  expect(erros).toEqual([])
})

test('F5: vídeo abre num leitor dentro da app, com o domínio sem cookies', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ body: '<html>vídeo</html>', contentType: 'text/html' }))
  await preencherAnamnese(page)
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByRole('button', { name: '▶ Ver vídeo' }).click()
  const iframe = page.locator('.modal iframe')
  await expect(iframe).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/3m7-E2Bcotk/)
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation')
  await expect(page.getByRole('link', { name: 'Abrir no YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=3m7-E2Bcotk')
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.locator('.modal')).toHaveCount(0)
})

test('F9 e F10: medições, exportação e importação inválida', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Medições' }).click()
  await page.getByLabel('Peso (kg)').fill('92,4')
  await page.getByLabel('Cintura (cm)').fill('95')
  await page.getByRole('button', { name: 'Guardar medição' }).click()
  await expect(page.getByText('92,4 kg')).toBeVisible()

  await page.getByRole('link', { name: 'Mais' }).click()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar cópia (JSON)' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^treino-\d{4}-\d{2}-\d{2}\.json$/)

  page.on('dialog', (d) => d.accept())
  await page.getByLabel('Ficheiro de cópia').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"formato":"outra"}') })
  await expect(page.getByText('Ficheiro inválido. Nenhum dado foi alterado.')).toBeVisible()
  await page.getByRole('link', { name: 'Medições' }).click()
  await expect(page.getByText('92,4 kg')).toBeVisible()
})

test('F1 v1.2: 7 dias e «Nenhuma» geram Empurrar/Puxar/Pernas com recuperação ativa', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('7')
  await expect(page.getByText(/1 dia de recuperação ativa/)).toBeVisible()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
  await expect(page.getByText(/marca «Nenhuma» ou pelo menos uma zona/)).toBeVisible()

  await page.getByLabel('Ombro').check()
  await page.getByLabel('Nenhuma').check()
  await expect(page.getByLabel('Ombro')).not.toBeChecked()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Empurrar A' })).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toBeVisible()
  await expect(page.getByText(/sobre o teu plano/)).toHaveCount(0)
  await expect(page.getByText(/Readaptação, semana 1 de 2/)).toBeVisible()
  await expect(page.getByLabel('Fazer outro treino').locator('option')).toHaveText([
    'Empurrar A (próximo)', 'Puxar A', 'Pernas A', 'Empurrar B', 'Puxar B', 'Pernas B', 'Recuperação ativa',
  ])
})

test('F11 e F12: o Início mostra o painel e as conquistas depois de um treino', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite)$/ })).toBeVisible()
  await expect(page.locator('figure.frase blockquote')).toHaveText(/^“.+”$/)
  await expect(page.getByText('Superior A · ~')).toBeVisible()
  await expect(page.locator('.indicador').filter({ hasText: 'treinos' }).first()).toContainText('0/4')

  await page.getByRole('button', { name: /Próximo treino/ }).click()
  for (const nome of ['Supino com halteres, pega neutra', 'Remada sentada no cabo (triângulo)', 'Puxada à frente na polia alta', 'Elevação lateral com halteres', 'Rosca alternada com halteres', 'Extensão de tríceps na polia com corda']) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByRole('button', { name: 'Saltar', exact: true }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await page.getByRole('button', { name: 'Terminar treino' }).click()

  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.locator('.indicador').filter({ hasText: 'treinos' }).first()).toContainText('1/4')
  await expect(page.getByText('Inferior A · ~')).toBeVisible()
  await expect(page.locator('.conquistas li.obtida')).toHaveText([/Primeiro treino/])
})

test('F1 v1.3: gravidez no 2.º trimestre troca exercícios deitado e só aparece com sexo feminino', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByLabel('Gravidez ou pós-parto')).toHaveCount(0)
  await page.getByLabel('Idade').fill('32')
  await page.getByLabel('Sexo').selectOption('feminino')
  await page.getByLabel('Altura (cm)').fill('165')
  await page.getByLabel('Peso (kg)').fill('62')
  await page.getByLabel('Gravidez ou pós-parto').selectOption('gravida-2t3t')
  await page.getByLabel('Ênfase').selectOption('inferior')
  await page.getByLabel('Dias por semana').selectOption('4')
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toHaveCount(0)
  await expect(page.getByText('Supino com halteres, pega neutra')).toHaveCount(0)
  await page.getByText(/aviso.* sobre o teu plano/).click()
  await expect(page.getByText(/obstetra/)).toBeVisible()

  // F18: o desenho dos músculos usa o corpo feminino.
  await page.locator('.lista .item').first().click()
  await expect(page.locator('.corpo-musculos')).toHaveAttribute('data-corpo', 'feminino')
})

// PNG 2×3 válido, só para testes.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEElEQVR4nGP4z8AARAwoFABE0AX7pM/egAAAAABJRU5ErkJggg==', 'base64')

test('F15 e F16: perfil com nome e foto, saudação e fotos de avaliação comparadas', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByLabel('Nome').fill('Ana')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Nome guardado.')).toBeVisible()
  await page.getByLabel('Escolher foto de perfil').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', /^data:image\/jpeg;base64,/)

  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible()

  await page.getByRole('link', { name: 'Medições' }).click()
  for (const [data, peso, cintura] of [['2026-09-15', '90', '98'], ['2026-10-15', '88,5', '96']]) {
    await page.getByLabel('Data').fill(data)
    await page.getByLabel('Peso (kg)').fill(peso)
    await page.getByLabel('Cintura (cm)').fill(cintura)
    await page.getByRole('button', { name: 'Guardar medição' }).click()
    await expect(page.getByText(`${peso} kg`)).toBeVisible()
    await expect(page.getByLabel('Peso (kg)')).toHaveValue('')
  }

  await page.getByRole('link', { name: 'Fotos' }).click()
  await expect(page.getByText('Ainda sem fotos.')).toBeVisible()
  for (const data of ['2026-09-15', '2026-10-15']) {
    await page.getByLabel('Data').fill(data)
    await page.getByLabel('Escolher foto').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('button', { name: 'Adicionar foto' })).toBeEnabled()
  }
  await expect(page.locator('.galeria img')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Comparar' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Diferença: -1,5 kg · -2 cm de cintura')
  await page.getByRole('radio', { name: 'Lado' }).click()
  await expect(page.getByText('Sem foto de lado neste mês')).toHaveCount(2)

  // F15 v1.5: relatório para o PT com as fotos (JPEG) dentro do PDF.
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Relatório para o PT (PDF)' }).click()
  const relatorio = await descarga
  expect(relatorio.suggestedFilename()).toBe('relatorio-pt-2026-09-2026-10.pdf')
  const pdf = (await import('node:fs')).readFileSync((await relatorio.path())!, 'latin1')
  expect(pdf.startsWith('%PDF-1.4')).toBe(true)
  expect(pdf.match(/\/Filter \/DCTDecode/g)).toHaveLength(2)
})

test('v1.5: modelo por grupo muscular, músculos do exercício, medidas extra e exportação', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('2')
  // 3.1: «Por grupo muscular» só existe de 4 a 6 dias.
  await expect(page.getByLabel('Modelo de treino').locator('option')).toHaveText(['Automático (recomendado)', 'Corpo inteiro', 'A/B: superior e inferior'])
  await page.getByLabel('Dias por semana').selectOption('5')
  await page.getByLabel('Modelo de treino').selectOption({ label: 'Por grupo muscular' })
  await expect(page.getByText(/cerca de 1×\/semana/)).toBeVisible()
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  // F18: desenho do corpo com o grupo principal.
  await expect(page.getByRole('heading', { name: 'Peito e tríceps' })).toBeVisible()
  await page.getByText('Supino reto com barra').click()
  await expect(page.getByRole('img', { name: 'Músculos trabalhados: Peito; secundários: Tríceps, Ombros.' })).toBeVisible()
  await expect(page.locator('.musculo.principal[data-grupo="peito"]')).toHaveCount(1)
  await expect(page.locator('.corpo-musculos')).toHaveAttribute('data-corpo', 'masculino')

  // F9 v1.5: medidas extra com instruções.
  await page.getByRole('link', { name: 'Medições' }).click()
  await page.getByText('Mais medidas (opcional)').click()
  await expect(page.getByText(/A meio entre o ombro e o cotovelo/)).toBeVisible()
  await page.getByLabel('Braço (cm)').fill('34,5')
  await page.getByRole('button', { name: 'Guardar medição' }).click()
  await expect(page.getByText('Braço 34,5 cm')).toBeVisible()

  // F17: exportações geradas no dispositivo.
  await page.getByRole('link', { name: 'Mais' }).click()
  const fs = await import('node:fs')
  for (const [botao, ficheiro, inicio] of [['Ficha (PDF)', /^ficha-treino-.*\.pdf$/, '%PDF'], ['Histórico (PDF)', /^historico-treino-.*\.pdf$/, '%PDF'], ['Ficha, histórico e medições (Excel)', /^treino-.*\.xlsx$/, 'PK']] as const) {
    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: botao }).click()
    const d = await descarga
    expect(d.suggestedFilename()).toMatch(ficheiro)
    expect(fs.readFileSync((await d.path())!, 'latin1').startsWith(inicio)).toBe(true)
  }
})

test('F19: lembrete de alongamento no fim do treino, alongamento do treino e por grupo muscular', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await preencherAnamnese(page)
  for (const [nome, carga] of [['Supino com halteres, pega neutra', '16'], ['Remada sentada no cabo (triângulo)', '30']] as const) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByLabel('Carga (kg)').fill(carga)
    await page.getByLabel('Repetições').fill('10')
    await page.getByRole('button', { name: 'Concluir série' }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await expect(page.getByRole('region', { name: 'Lembrete de alongamento' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Terminar treino' }).click()

  // Lembrete no Hoje e no Início; o peito fica de fora por causa do ombro.
  const lembrete = page.getByRole('region', { name: 'Lembrete de alongamento' })
  await expect(lembrete).toContainText('Hora de alongar')
  await expect(lembrete).toContainText('Costas')
  await page.getByRole('link', { name: 'Início' }).click()
  await page.getByRole('button', { name: 'Alongar agora' }).click()

  await expect(page.getByRole('heading', { name: 'Alongar' })).toBeVisible()
  await expect(page.getByText('Depois de Superior A')).toBeVisible()
  await expect(page.getByText(/Sem alongamento seguro para: Peito/)).toBeVisible()
  const cartao = page.getByRole('region', { name: '1. Costas agarrado a um apoio' })
  await expect(cartao.getByRole('img', { name: /Músculos trabalhados: Costas/ })).toBeVisible()
  await expect(cartao.getByText('2 × 30 s')).toBeVisible()
  await expect(cartao.getByRole('link', { name: 'Procurar no YouTube' })).toHaveAttribute('href', /youtube\.com\/results\?search_query=alongamento/)
  await cartao.getByRole('button', { name: 'Manter 30 s' }).click()
  await expect(cartao.getByRole('timer')).toContainText('Manter')

  await page.getByRole('radio', { name: 'Por grupo muscular' }).click()
  await page.getByRole('radio', { name: 'Gémeos' }).click()
  await expect(page.getByRole('heading', { name: /Gémeos num degrau/ })).toBeVisible()
  await expect(page.locator('.musculo.principal[data-grupo="gemeos"]').first()).toBeVisible()

  await page.getByRole('radio', { name: 'Do treino' }).click()
  await page.getByRole('button', { name: 'Alongamento feito' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite)$/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lembrete de alongamento' })).toHaveCount(0)
})

test('F20: versão, procurar atualizações, novidades depois de atualizar', async ({ page }) => {
  await preencherAnamnese(page)
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()

  // Instalação nova: sem cartão de novidades.
  await page.goto('./#/inicio')
  await expect(page.getByRole('region', { name: 'Novidades' })).toHaveCount(0)

  // Mais: versão instalada, procura sem versão nova, em preparação e histórico.
  await page.goto('./#/mais')
  await expect(page.getByText('Versão instalada: 1.7.0')).toBeVisible()
  await page.getByRole('button', { name: 'Procurar atualizações' }).click()
  await expect(page.getByText('Já tens a versão mais recente.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Em preparação' })).toBeVisible()
  await page.getByText('Novidades de cada versão', { exact: true }).click()
  await expect(page.getByText(/Alongamentos do treino do dia/)).toBeVisible()

  // Quem vinha da 1.6 vê as novidades da 1.7 uma vez no Início.
  // Texto em vez de função: a configuração de TypeScript dos testes não inclui os tipos do navegador.
  await page.evaluate(`new Promise((fim, erro) => {
    const pedido = indexedDB.open('app-treino')
    pedido.onsuccess = () => {
      const t = pedido.result.transaction('valores', 'readwrite')
      t.objectStore('valores').put({ chave: 'versaoVista', valor: '1.6.0' })
      t.oncomplete = () => fim()
      t.onerror = () => erro(t.error)
    }
  })`)
  await page.goto('./#/inicio')
  await page.reload()
  const cartao = page.getByRole('region', { name: 'Novidades' })
  await expect(cartao.getByRole('heading', { name: /Novidades da versão 1\.7\.0/ })).toBeVisible()
  await expect(cartao.getByText(/Aviso de versão nova/)).toBeVisible()
  await cartao.getByRole('button', { name: 'Fechar' }).click()
  await expect(cartao).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Bom dia|Boa tarde|Boa noite|Olá/ }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Novidades' })).toHaveCount(0)
})
