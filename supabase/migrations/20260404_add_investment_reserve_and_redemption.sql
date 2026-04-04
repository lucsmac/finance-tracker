ALTER TABLE investments
ADD COLUMN IF NOT EXISTS counts_as_reserve BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE investments
SET counts_as_reserve = TRUE
WHERE counts_as_reserve = FALSE
  AND (
    category ILIKE '%reserva%'
    OR category ILIKE '%emerg%'
    OR category ILIKE '%caixinha%'
    OR category ILIKE '%selic%'
    OR category ILIKE '%cdi%'
  );

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS investment_id UUID REFERENCES investments(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_type_check'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
  END IF;
END $$;

ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check
CHECK (
  type IN (
    'income',
    'expense_variable',
    'expense_fixed',
    'investment',
    'investment_redemption',
    'installment'
  )
);

CREATE INDEX IF NOT EXISTS idx_transactions_investment_id
  ON transactions(user_id, investment_id);
