-- Gainly schema + RLS (run in Supabase SQL editor or migrations)
-- NOTE: Do not TRUNCATE user tables here; that was causing data loss if re-applied.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  calories_per_100g NUMERIC,
  protein_per_100g NUMERIC,
  calories_per_unit NUMERIC,
  protein_per_unit NUMERIC,
  calories_per_100ml NUMERIC,
  protein_per_100ml NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (assumes table exists from Supabase / prior setup)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hidden_foods TEXT[] DEFAULT '{}'::text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_reminder_enabled BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- Uniques (per-user)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weights_user_id_date_key') THEN
        ALTER TABLE weights DROP CONSTRAINT weights_user_id_date_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_user_id_date_key') THEN
        ALTER TABLE logs DROP CONSTRAINT logs_user_id_date_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'foods_user_id_name_key') THEN
        ALTER TABLE foods DROP CONSTRAINT foods_user_id_name_key;
    END IF;
END $$;

ALTER TABLE weights ADD CONSTRAINT weights_user_id_date_key UNIQUE(user_id, date);
ALTER TABLE logs ADD CONSTRAINT logs_user_id_date_key UNIQUE(user_id, date);
ALTER TABLE foods ADD CONSTRAINT foods_user_id_name_key UNIQUE(user_id, name);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own data" ON profiles;
DROP POLICY IF EXISTS "Users can access own data" ON weights;
DROP POLICY IF EXISTS "Users can access own data" ON logs;
DROP POLICY IF EXISTS "Users can access own data" ON foods;
DROP POLICY IF EXISTS "Users can access own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can access own expenses" ON expenses;
DROP POLICY IF EXISTS "Users read own foods" ON foods;
DROP POLICY IF EXISTS "Users insert own foods" ON foods;
DROP POLICY IF EXISTS "Users update own foods" ON foods;
DROP POLICY IF EXISTS "Users delete own foods" ON foods;

CREATE POLICY "Users can access own data" ON profiles
  FOR ALL USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can access own data" ON weights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own data" ON logs
  FOR ALL USING (auth.uid() = user_id);

-- Catalog foods live in the app bundle (foods.json); table rows are user-owned only
CREATE POLICY "Users read own foods" ON foods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own foods" ON foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own foods" ON foods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own foods" ON foods
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can access own expense_categories" ON expense_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);
