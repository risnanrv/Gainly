-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Ensure user_id column exists on all tables (in case they were pre-existing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE weights ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;

-- Drop constraints if they exist to prevent errors, then re-add them
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

-- 2. Clear old test data
TRUNCATE TABLE weights, logs;
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- 3. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Users can access own data)
-- Drop any existing policies first to prevent conflicts
DROP POLICY IF EXISTS "Users can access own data" ON profiles;
DROP POLICY IF EXISTS "Users can access own data" ON weights;
DROP POLICY IF EXISTS "Users can access own data" ON logs;
DROP POLICY IF EXISTS "Users can access own data" ON foods;
DROP POLICY IF EXISTS "Users can access own data or global foods" ON foods;

CREATE POLICY "Users can access own data" ON profiles FOR ALL USING (auth.uid() = id OR auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON weights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON foods FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
