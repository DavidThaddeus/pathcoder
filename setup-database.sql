-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can insert their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can update their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can delete their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Allow all operations for development" ON completed_challenges;

DROP POLICY IF EXISTS "Users can view their own ongoing challenges" ON ongoing_challenges;
DROP POLICY IF EXISTS "Users can insert their own ongoing challenges" ON ongoing_challenges;
DROP POLICY IF EXISTS "Users can update their own ongoing challenges" ON ongoing_challenges;
DROP POLICY IF EXISTS "Users can delete their own ongoing challenges" ON ongoing_challenges;
DROP POLICY IF EXISTS "Allow all operations for development" ON ongoing_challenges;

DROP POLICY IF EXISTS "Users can view their own available challenges" ON available_challenges;
DROP POLICY IF EXISTS "Users can insert their own available challenges" ON available_challenges;
DROP POLICY IF EXISTS "Users can update their own available challenges" ON available_challenges;
DROP POLICY IF EXISTS "Users can delete their own available challenges" ON available_challenges;
DROP POLICY IF EXISTS "Allow all operations for development" ON available_challenges;

DROP POLICY IF EXISTS "Users can view their own failed challenges" ON failed_challenges;
DROP POLICY IF EXISTS "Users can insert their own failed challenges" ON failed_challenges;
DROP POLICY IF EXISTS "Users can update their own failed challenges" ON failed_challenges;
DROP POLICY IF EXISTS "Users can delete their own failed challenges" ON failed_challenges;
DROP POLICY IF EXISTS "Allow all operations for development" ON failed_challenges;

-- Drop existing tables if they exist (this will recreate them with proper schema)
DROP TABLE IF EXISTS available_challenges CASCADE;
DROP TABLE IF EXISTS failed_challenges CASCADE;

-- Alter existing completed_challenges table to add missing columns
ALTER TABLE completed_challenges 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS programming_language TEXT,
ADD COLUMN IF NOT EXISTS skill_level TEXT,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Alter existing ongoing_challenges table to add missing columns
ALTER TABLE ongoing_challenges 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS programming_language TEXT,
ADD COLUMN IF NOT EXISTS skill_level TEXT,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a separate table for available challenges
CREATE TABLE IF NOT EXISTS available_challenges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  title TEXT,
  programming_language TEXT,
  skill_level TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Create a separate table for failed challenges
CREATE TABLE IF NOT EXISTS failed_challenges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  title TEXT,
  programming_language TEXT,
  skill_level TEXT,
  attempts INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'failed',
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failure_reason TEXT DEFAULT 'Solution revealed',
  UNIQUE(user_id, challenge_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE completed_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ongoing_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for completed_challenges
CREATE POLICY "Users can view their own completed challenges" ON completed_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed challenges" ON completed_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed challenges" ON completed_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed challenges" ON completed_challenges
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for ongoing_challenges
CREATE POLICY "Users can view their own ongoing challenges" ON ongoing_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ongoing challenges" ON ongoing_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ongoing challenges" ON ongoing_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ongoing challenges" ON ongoing_challenges
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for available_challenges
CREATE POLICY "Users can view their own available challenges" ON available_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own available challenges" ON available_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own available challenges" ON available_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own available challenges" ON available_challenges
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for failed_challenges
CREATE POLICY "Users can view their own failed challenges" ON failed_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own failed challenges" ON failed_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own failed challenges" ON failed_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own failed challenges" ON failed_challenges
  FOR DELETE USING (auth.uid() = user_id);

-- For development/testing, allow all operations (remove this in production)
CREATE POLICY "Allow all operations for development" ON completed_challenges
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for development" ON ongoing_challenges
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for development" ON available_challenges
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for development" ON failed_challenges
  FOR ALL USING (true); 