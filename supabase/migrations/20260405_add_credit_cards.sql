CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  brand TEXT,
  total_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
  blocked_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
  used_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL,
  due_day INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_card_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  commitment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, reference_month)
);

CREATE TABLE credit_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES credit_card_statements(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_at DATE NOT NULL,
  notes TEXT,
  payment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_card_statements_user_id ON credit_card_statements(user_id);
CREATE INDEX idx_credit_card_statements_card_month ON credit_card_statements(card_id, reference_month DESC);
CREATE INDEX idx_credit_card_payments_user_id ON credit_card_payments(user_id);
CREATE INDEX idx_credit_card_payments_statement_id ON credit_card_payments(statement_id, paid_at DESC);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit cards" ON credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit cards" ON credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit cards" ON credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit cards" ON credit_cards FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit card statements" ON credit_card_statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit card statements" ON credit_card_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit card statements" ON credit_card_statements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit card statements" ON credit_card_statements FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit card payments" ON credit_card_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit card payments" ON credit_card_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit card payments" ON credit_card_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit card payments" ON credit_card_payments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_card_statements_updated_at BEFORE UPDATE ON credit_card_statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_card_payments_updated_at BEFORE UPDATE ON credit_card_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
