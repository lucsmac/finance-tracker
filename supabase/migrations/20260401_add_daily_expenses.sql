-- Create daily_expenses table (itemized daily spending entries)
CREATE TABLE IF NOT EXISTS daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_id ON daily_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON daily_expenses(user_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily expenses" ON daily_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily expenses" ON daily_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily expenses" ON daily_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily expenses" ON daily_expenses FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_daily_expenses_updated_at BEFORE UPDATE ON daily_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
