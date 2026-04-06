ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'debit',
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id),
  ADD COLUMN IF NOT EXISTS statement_reference_month DATE;

UPDATE transactions
SET payment_method = 'debit'
WHERE payment_method IS NULL;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('debit', 'credit_card'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_link_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_payment_link_check
  CHECK (
    (
      payment_method = 'debit' AND
      credit_card_id IS NULL AND
      statement_reference_month IS NULL
    )
    OR
    (
      payment_method = 'credit_card' AND
      type IN ('expense_variable', 'expense_fixed', 'installment') AND
      credit_card_id IS NOT NULL AND
      statement_reference_month IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_transactions_card_reference
  ON transactions(user_id, credit_card_id, statement_reference_month);
