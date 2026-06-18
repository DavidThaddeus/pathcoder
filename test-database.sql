-- Test script to verify database setup and RLS policies

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'completed_challenges'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'completed_challenges' 
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'completed_challenges';

-- 4. List all policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'completed_challenges';

-- 5. Test insert with a valid UUID (replace with actual UUID)
-- INSERT INTO completed_challenges (user_id, challenge_id) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test_challenge_1');

-- 6. Test select
-- SELECT * FROM completed_challenges LIMIT 5; 