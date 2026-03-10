-- Migration: Add balance_start_date to user_configs
-- This allows users to set a custom start date for balance tracking
-- instead of always starting from today

ALTER TABLE user_configs
ADD COLUMN balance_start_date DATE;

-- Set default to current date for existing records
UPDATE user_configs
SET balance_start_date = CURRENT_DATE
WHERE balance_start_date IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE user_configs
ALTER COLUMN balance_start_date SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_configs.balance_start_date IS 'The date from which balance tracking starts. Expenses are calculated from this date forward.';
