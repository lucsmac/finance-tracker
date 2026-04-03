export type ReportPeriodMode = 'month' | 'year'

export interface ReportShareCategory {
  name: string
  value: number
  percentage: number
}

export interface ReportSharePayload {
  periodMode: ReportPeriodMode
  periodLabel: string
  generatedAtLabel: string
  openingBalance: number
  closingBalance: number
  totalIncome: number
  totalExpenses: number
  variableExpenses: number
  fixedExpenses: number
  balanceChange: number
  savingsRate: number
  dailyStandard: number
  activeEstimates: number
  transactionCount: number
  topCategories: ReportShareCategory[]
}

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 1600
const PAGE_PADDING = 72
const CONTENT_WIDTH = CANVAS_WIDTH - PAGE_PADDING * 2

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const numberFormatter = new Intl.NumberFormat('pt-BR')

const createCanvas = () => {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  return canvas
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2))

  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}

const fillRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
) => {
  ctx.save()
  roundRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = fillStyle
  ctx.fill()
  ctx.restore()
}

const strokeRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth = 1,
) => {
  ctx.save()
  roundRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.restore()
}

const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text

  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }

  return `${truncated}...`
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine
      return
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    currentLine = word
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

const drawMetricCard = (
  ctx: CanvasRenderingContext2D,
  options: {
    x: number
    y: number
    width: number
    height: number
    label: string
    value: string
    helper: string
    accentColor: string
    surfaceColor: string
  },
) => {
  fillRoundRect(ctx, options.x, options.y, options.width, options.height, 28, options.surfaceColor)
  strokeRoundRect(ctx, options.x, options.y, options.width, options.height, 28, 'rgba(82, 59, 126, 0.08)')

  ctx.fillStyle = options.accentColor
  ctx.fillRect(options.x + 28, options.y + 28, 64, 8)

  ctx.fillStyle = '#6b6178'
  ctx.font = '500 24px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(options.label, options.x + 28, options.y + 74)

  ctx.fillStyle = '#1d1728'
  ctx.font = '700 42px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(options.value, options.x + 28, options.y + 136)

  ctx.fillStyle = '#93889f'
  ctx.font = '500 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(options.helper, options.x + 28, options.y + options.height - 28)
}

const drawHorizontalProgress = (
  ctx: CanvasRenderingContext2D,
  options: {
    x: number
    y: number
    width: number
    value: number
    color: string
    trackColor: string
  },
) => {
  fillRoundRect(ctx, options.x, options.y, options.width, 14, 999, options.trackColor)
  const normalizedValue = Math.max(0, Math.min(1, options.value))
  if (normalizedValue <= 0) return

  fillRoundRect(ctx, options.x, options.y, Math.max(10, options.width * normalizedValue), 14, 999, options.color)
}

const drawSectionTitle = (ctx: CanvasRenderingContext2D, label: string, x: number, y: number) => {
  ctx.fillStyle = '#1d1728'
  ctx.font = '700 30px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(label, x, y)
}

const canvasToBlob = async (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Nao foi possivel gerar a imagem do relatorio.'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })

export const buildReportFilename = (periodMode: ReportPeriodMode, referenceDate: Date) => {
  const year = referenceDate.getFullYear()
  if (periodMode === 'year') {
    return `automoney-relatorio-anual-${year}.png`
  }

  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  return `automoney-relatorio-mensal-${year}-${month}.png`
}

export const renderReportShareImage = async (payload: ReportSharePayload) => {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Nao foi possivel preparar o canvas para exportacao.')
  }

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#fdfbf8')
  gradient.addColorStop(0.45, '#fbf8f4')
  gradient.addColorStop(1, '#f4f1eb')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#6e3dfa'
  ctx.beginPath()
  ctx.arc(1050, 210, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c43ad1'
  ctx.beginPath()
  ctx.arc(140, 1320, 220, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#affd37'
  ctx.beginPath()
  ctx.arc(960, 1320, 140, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  fillRoundRect(ctx, PAGE_PADDING, 56, CONTENT_WIDTH, CANVAS_HEIGHT - 112, 40, 'rgba(255,255,255,0.76)')
  strokeRoundRect(ctx, PAGE_PADDING, 56, CONTENT_WIDTH, CANVAS_HEIGHT - 112, 40, 'rgba(52, 35, 89, 0.08)')

  fillRoundRect(ctx, PAGE_PADDING + 28, 86, 170, 48, 999, 'rgba(110, 61, 250, 0.12)')
  ctx.fillStyle = '#6e3dfa'
  ctx.font = '700 20px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('AUTOMONEY', PAGE_PADDING + 58, 118)

  ctx.fillStyle = '#93889f'
  ctx.font = '600 18px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('Relatorio gerado localmente', PAGE_PADDING + 28, 170)

  ctx.fillStyle = '#1d1728'
  ctx.font = '700 62px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(payload.periodMode === 'month' ? 'Relatorio mensal' : 'Relatorio anual', PAGE_PADDING + 28, 244)

  ctx.fillStyle = '#645a73'
  ctx.font = '500 34px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(payload.periodLabel, PAGE_PADDING + 28, 298)

  ctx.fillStyle = '#645a73'
  ctx.font = '500 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`Gerado em ${payload.generatedAtLabel}`, PAGE_PADDING + CONTENT_WIDTH - 28, 118)
  ctx.fillText('Nada foi salvo em servidor', PAGE_PADDING + CONTENT_WIDTH - 28, 148)
  ctx.textAlign = 'left'

  const cardGap = 24
  const cardWidth = (CONTENT_WIDTH - 28 * 2 - cardGap) / 2
  const cardHeight = 180
  const cardStartY = 348
  const cardX = PAGE_PADDING + 28

  drawMetricCard(ctx, {
    x: cardX,
    y: cardStartY,
    width: cardWidth,
    height: cardHeight,
    label: 'Entradas',
    value: currencyFormatter.format(payload.totalIncome),
    helper: `${numberFormatter.format(payload.transactionCount)} lancamentos no periodo`,
    accentColor: '#5f8d24',
    surfaceColor: 'rgba(95, 141, 36, 0.10)',
  })

  drawMetricCard(ctx, {
    x: cardX + cardWidth + cardGap,
    y: cardStartY,
    width: cardWidth,
    height: cardHeight,
    label: 'Gastos',
    value: currencyFormatter.format(payload.totalExpenses),
    helper: 'Total de despesas do periodo',
    accentColor: '#b23fc1',
    surfaceColor: 'rgba(196, 58, 209, 0.08)',
  })

  drawMetricCard(ctx, {
    x: cardX,
    y: cardStartY + cardHeight + cardGap,
    width: cardWidth,
    height: cardHeight,
    label: 'Saldo final',
    value: currencyFormatter.format(payload.closingBalance),
    helper: `Abertura ${currencyFormatter.format(payload.openingBalance)}`,
    accentColor: payload.closingBalance >= 0 ? '#6e3dfa' : '#b23fc1',
    surfaceColor: 'rgba(110, 61, 250, 0.08)',
  })

  drawMetricCard(ctx, {
    x: cardX + cardWidth + cardGap,
    y: cardStartY + cardHeight + cardGap,
    width: cardWidth,
    height: cardHeight,
    label: 'Taxa de poupanca',
    value: `${payload.savingsRate.toFixed(0)}%`,
    helper: payload.balanceChange >= 0 ? 'Periodo com saldo positivo' : 'Periodo pressionou o caixa',
    accentColor: payload.savingsRate >= 15 ? '#5f8d24' : payload.savingsRate >= 0 ? '#a98315' : '#b23fc1',
    surfaceColor: 'rgba(169, 131, 21, 0.08)',
  })

  const sectionTop = cardStartY + cardHeight * 2 + cardGap * 2 + 44
  const sectionWidth = (CONTENT_WIDTH - 28 * 2 - cardGap) / 2
  const sectionHeight = 280

  fillRoundRect(ctx, cardX, sectionTop, sectionWidth, sectionHeight, 28, 'rgba(255,255,255,0.66)')
  strokeRoundRect(ctx, cardX, sectionTop, sectionWidth, sectionHeight, 28, 'rgba(52, 35, 89, 0.08)')
  drawSectionTitle(ctx, 'Saldo no periodo', cardX + 24, sectionTop + 42)

  ctx.fillStyle = '#645a73'
  ctx.font = '500 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('Saldo de abertura', cardX + 24, sectionTop + 92)
  ctx.fillStyle = '#1d1728'
  ctx.font = '700 34px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(currencyFormatter.format(payload.openingBalance), cardX + 24, sectionTop + 132)

  ctx.fillStyle = '#645a73'
  ctx.font = '500 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('Saldo de fechamento', cardX + 24, sectionTop + 188)
  ctx.fillStyle = payload.closingBalance >= 0 ? '#1d1728' : '#8a2a95'
  ctx.font = '700 34px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(currencyFormatter.format(payload.closingBalance), cardX + 24, sectionTop + 228)

  ctx.fillStyle = payload.balanceChange >= 0 ? '#5f8d24' : '#8a2a95'
  ctx.font = '600 22px "Avenir Next", "Segoe UI", sans-serif'
  const changePrefix = payload.balanceChange >= 0 ? '+' : '-'
  ctx.fillText(`${changePrefix}${currencyFormatter.format(Math.abs(payload.balanceChange))}`, cardX + 24, sectionTop + 258)

  fillRoundRect(ctx, cardX + sectionWidth + cardGap, sectionTop, sectionWidth, sectionHeight, 28, 'rgba(255,255,255,0.66)')
  strokeRoundRect(ctx, cardX + sectionWidth + cardGap, sectionTop, sectionWidth, sectionHeight, 28, 'rgba(52, 35, 89, 0.08)')
  drawSectionTitle(ctx, 'Composicao dos gastos', cardX + sectionWidth + cardGap + 24, sectionTop + 42)

  const variableShare = payload.totalExpenses > 0 ? payload.variableExpenses / payload.totalExpenses : 0
  const fixedShare = payload.totalExpenses > 0 ? payload.fixedExpenses / payload.totalExpenses : 0
  const progressX = cardX + sectionWidth + cardGap + 24
  const progressWidth = sectionWidth - 48

  ctx.fillStyle = '#645a73'
  ctx.font = '600 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('Gastos variaveis', progressX, sectionTop + 96)
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(variableShare * 100)}%`, progressX + progressWidth, sectionTop + 96)
  ctx.textAlign = 'left'
  drawHorizontalProgress(ctx, {
    x: progressX,
    y: sectionTop + 114,
    width: progressWidth,
    value: variableShare,
    color: '#6e3dfa',
    trackColor: 'rgba(110, 61, 250, 0.12)',
  })
  ctx.fillStyle = '#1d1728'
  ctx.font = '700 28px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(currencyFormatter.format(payload.variableExpenses), progressX, sectionTop + 164)

  ctx.fillStyle = '#645a73'
  ctx.font = '600 22px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText('Gastos fixos', progressX, sectionTop + 212)
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(fixedShare * 100)}%`, progressX + progressWidth, sectionTop + 212)
  ctx.textAlign = 'left'
  drawHorizontalProgress(ctx, {
    x: progressX,
    y: sectionTop + 230,
    width: progressWidth,
    value: fixedShare,
    color: '#a98315',
    trackColor: 'rgba(169, 131, 21, 0.12)',
  })
  ctx.fillStyle = '#1d1728'
  ctx.font = '700 28px "Avenir Next", "Segoe UI", sans-serif'
  ctx.fillText(currencyFormatter.format(payload.fixedExpenses), progressX, sectionTop + 278)

  const categoriesY = sectionTop + sectionHeight + 24
  const categoriesHeight = 340
  fillRoundRect(ctx, cardX, categoriesY, CONTENT_WIDTH - 56, categoriesHeight, 28, 'rgba(255,255,255,0.66)')
  strokeRoundRect(ctx, cardX, categoriesY, CONTENT_WIDTH - 56, categoriesHeight, 28, 'rgba(52, 35, 89, 0.08)')
  drawSectionTitle(ctx, 'Top categorias do periodo', cardX + 24, categoriesY + 42)

  if (payload.topCategories.length === 0) {
    ctx.fillStyle = '#645a73'
    ctx.font = '500 24px "Avenir Next", "Segoe UI", sans-serif'
    const messageLines = wrapText(ctx, 'Ainda nao houve gastos suficientes neste periodo para montar a distribuicao por categoria.', CONTENT_WIDTH - 104)
    messageLines.forEach((line, index) => {
      ctx.fillText(line, cardX + 24, categoriesY + 108 + index * 34)
    })
  } else {
    const maxCategoryValue = Math.max(...payload.topCategories.map((category) => category.value), 1)

    payload.topCategories.slice(0, 5).forEach((category, index) => {
      const rowY = categoriesY + 92 + index * 48
      const palette = ['#6e3dfa', '#c43ad1', '#5f8d24', '#a98315', '#1d1728']
      const barColor = palette[index % palette.length]

      ctx.fillStyle = '#1d1728'
      ctx.font = '600 24px "Avenir Next", "Segoe UI", sans-serif'
      ctx.fillText(truncateText(ctx, category.name, 360), cardX + 24, rowY)

      ctx.textAlign = 'right'
      ctx.fillStyle = '#645a73'
      ctx.font = '500 22px "Avenir Next", "Segoe UI", sans-serif'
      ctx.fillText(`${category.percentage.toFixed(1)}%`, cardX + CONTENT_WIDTH - 88, rowY)
      ctx.fillText(currencyFormatter.format(category.value), cardX + CONTENT_WIDTH - 186, rowY)
      ctx.textAlign = 'left'

      drawHorizontalProgress(ctx, {
        x: cardX + 24,
        y: rowY + 14,
        width: CONTENT_WIDTH - 112,
        value: category.value / maxCategoryValue,
        color: barColor,
        trackColor: 'rgba(52, 35, 89, 0.08)',
      })
    })
  }

  const footerY = categoriesY + categoriesHeight + 24
  fillRoundRect(ctx, cardX, footerY, CONTENT_WIDTH - 56, 134, 28, 'rgba(110, 61, 250, 0.08)')
  strokeRoundRect(ctx, cardX, footerY, CONTENT_WIDTH - 56, 134, 28, 'rgba(110, 61, 250, 0.14)')

  const footerColumns = [
    {
      label: 'Gasto diario base',
      value: currencyFormatter.format(payload.dailyStandard),
    },
    {
      label: 'Estimativas ativas',
      value: numberFormatter.format(payload.activeEstimates),
    },
    {
      label: 'Lancamentos',
      value: numberFormatter.format(payload.transactionCount),
    },
  ]

  footerColumns.forEach((item, index) => {
    const columnWidth = (CONTENT_WIDTH - 56) / 3
    const columnX = cardX + index * columnWidth
    if (index > 0) {
      ctx.fillStyle = 'rgba(110, 61, 250, 0.12)'
      ctx.fillRect(columnX, footerY + 24, 1, 86)
    }

    ctx.fillStyle = '#645a73'
    ctx.font = '600 22px "Avenir Next", "Segoe UI", sans-serif'
    ctx.fillText(item.label, columnX + 28, footerY + 56)
    ctx.fillStyle = '#1d1728'
    ctx.font = '700 34px "Avenir Next", "Segoe UI", sans-serif'
    ctx.fillText(item.value, columnX + 28, footerY + 98)
  })

  return canvasToBlob(canvas)
}

export const downloadBlobAsFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const copyBlobAsImage = async (blob: Blob) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Seu navegador nao suporta copiar imagens diretamente.')
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ])
}

export const shareBlobAsImage = async (blob: Blob, filename: string, title: string, text: string) => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    throw new Error('Compartilhamento nativo indisponivel neste navegador.')
  }

  const file = new File([blob], filename, { type: 'image/png' })
  const shareData = { title, text, files: [file] }

  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    throw new Error('Seu navegador nao consegue compartilhar essa imagem diretamente.')
  }

  await navigator.share(shareData)
}
