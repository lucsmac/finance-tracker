ALTER TABLE daily_expenses
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'debit',
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id),
  ADD COLUMN IF NOT EXISTS statement_reference_month DATE;

UPDATE daily_expenses
SET payment_method = 'debit'
WHERE payment_method IS NULL;

ALTER TABLE daily_expenses
  DROP CONSTRAINT IF EXISTS daily_expenses_payment_method_check;

ALTER TABLE daily_expenses
  ADD CONSTRAINT daily_expenses_payment_method_check
  CHECK (payment_method IN ('debit', 'credit_card'));

ALTER TABLE daily_expenses
  DROP CONSTRAINT IF EXISTS daily_expenses_payment_link_check;

ALTER TABLE daily_expenses
  ADD CONSTRAINT daily_expenses_payment_link_check
  CHECK (
    (payment_method = 'debit' AND credit_card_id IS NULL AND statement_reference_month IS NULL)
    OR
    (payment_method = 'credit_card' AND credit_card_id IS NOT NULL AND statement_reference_month IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_daily_expenses_card_reference
  ON daily_expenses(user_id, credit_card_id, statement_reference_month);
