import { createDateFromString, formatDateLocal } from '@/lib/utils/dateHelpers'

export const getCreditCardStatementReferenceMonth = (purchaseDate: string, closingDay: number) => {
  const date = createDateFromString(purchaseDate)
  const referenceDate =
    date.getDate() <= closingDay
      ? new Date(date.getFullYear(), date.getMonth(), 1)
      : new Date(date.getFullYear(), date.getMonth() + 1, 1)

  return formatDateLocal(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
}

export const formatReferenceMonthLabel = (referenceMonth: string | null | undefined, format: 'short' | 'long' = 'short') => {
  if (!referenceMonth) return 'Mês indefinido'

  return new Date(`${referenceMonth}T12:00:00`).toLocaleDateString('pt-BR', {
    month: format,
    year: 'numeric',
  })
}
