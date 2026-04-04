export const CUSTOM_CATEGORY_VALUE = '__custom__'

export const COMMITMENT_CATEGORY_PRESETS = [
  'Moradia',
  'Contas',
  'Mercado',
  'Transporte',
  'Saúde',
  'Educação',
  'Cartão',
  'Assinaturas',
  'Lazer',
  'Parcelamento',
  'Eletrônicos',
  'Investimentos',
  'Geral',
]

export const INCOME_CATEGORY_PRESETS = [
  'Salário',
  'Freelance',
  'Comissão',
  'Bônus',
  'Reembolso',
  'Venda',
  'Rendimento',
  'Outros',
]

export const INVESTMENT_CATEGORY_PRESETS = [
  'Reserva de emergência',
  'Caixinha',
  'Tesouro Selic',
  'CDB liquidez diária',
  'Renda fixa',
  'Fundos',
  'Ações',
  'Cripto',
]

const normalizeCategory = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export const buildCategoryOptions = (currentCategories: Array<string | null | undefined>, presets: string[]) => {
  const seen = new Set<string>()
  const options: string[] = []

  const append = (value: string | null | undefined) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    const normalized = normalizeCategory(trimmed)
    if (seen.has(normalized)) return

    seen.add(normalized)
    options.push(trimmed)
  }

  currentCategories.forEach(append)
  presets.forEach(append)

  return options.sort((left, right) => left.localeCompare(right, 'pt-BR'))
}

export const isPresetCategory = (value: string, options: string[]) =>
  options.some((option) => option === value)
