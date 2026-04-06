import {
  isCashOutflowTransactionType,
  type Transaction,
} from '@/app/data/mockData'

export type TransactionPaymentMethod = 'debit' | 'credit_card'

export const DEFAULT_TRANSACTION_PAYMENT_METHOD: TransactionPaymentMethod = 'debit'

export const resolveTransactionPaymentMethod = (transaction: Pick<Transaction, 'paymentMethod'>) =>
  transaction.paymentMethod || DEFAULT_TRANSACTION_PAYMENT_METHOD

export const canTransactionUseCreditCard = (type: Transaction['type']) =>
  type === 'expense_fixed' || type === 'expense_variable' || type === 'installment'

export const isCreditCardTransaction = (
  transaction: Pick<Transaction, 'type' | 'paymentMethod'>,
) => canTransactionUseCreditCard(transaction.type) && resolveTransactionPaymentMethod(transaction) === 'credit_card'

export const isCashImpactTransaction = (
  transaction: Pick<Transaction, 'type' | 'paymentMethod'>,
) => {
  if (!isCashOutflowTransactionType(transaction.type)) {
    return false
  }

  if (transaction.type === 'investment') {
    return true
  }

  return !isCreditCardTransaction(transaction)
}

export const getTransactionPaymentMethodLabel = (
  transaction: Pick<Transaction, 'type' | 'paymentMethod' | 'creditCardId'>,
  creditCardName?: string,
) => {
  if (isCreditCardTransaction(transaction)) {
    return creditCardName ? `Cartão • ${creditCardName}` : 'Cartão de crédito'
  }

  return 'Débito / Pix'
}

