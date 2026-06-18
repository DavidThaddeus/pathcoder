# Database Setup Guide for PathCoder

## 🗄️ **Supabase Database Configuration**

### Step 1: Create the Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Create the completed_challenges table
CREATE TABLE IF NOT EXISTS completed_challenges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);
```

### Step 2: Enable Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE completed_challenges ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create RLS Policies
```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can insert their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can update their own completed challenges" ON completed_challenges;
DROP POLICY IF EXISTS "Users can delete their own completed challenges" ON completed_challenges;

-- Create policies for user access
CREATE POLICY "Users can view their own completed challenges" ON completed_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed challenges" ON completed_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed challenges" ON completed_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed challenges" ON completed_challenges
  FOR DELETE USING (auth.uid() = user_id);

-- For development/testing, allow all operations (remove this in production)
CREATE POLICY "Allow all operations for development" ON completed_challenges
  FOR ALL USING (true);
```

### Step 4: Verify Setup
Run this test script to verify everything is working:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'completed_challenges'
) as table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'completed_challenges' 
ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'completed_challenges';

-- List all policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'completed_challenges';
```

## 🔧 **Environment Variables**

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

## 🧪 **Testing the Setup**

### Test 1: API with Valid UUID
```bash
curl http://localhost:3001/api/complete-challenge -X POST -H "Content-Type: application/json" -d '{"user_id":"550e8400-e29b-41d4-a716-446655440000","challenge_id":"test_challenge"}'
```

### Test 2: Check Database Connection
The API should return either:
- `{"message": "Challenge marked as completed"}` (success)
- `{"error": "Already completed"}` (if already exists)
- `{"error": "Database error..."}` (if there's an issue)

## 🚨 **Common Issues & Solutions**

### Issue 1: "invalid input syntax for type uuid"
**Cause**: Frontend sending string instead of UUID
**Solution**: Ensure user authentication provides proper UUID

### Issue 2: "permission denied"
**Cause**: RLS policies blocking access
**Solution**: Check if user is authenticated and policies are correct

### Issue 3: "relation does not exist"
**Cause**: Table not created
**Solution**: Run the CREATE TABLE script

### Issue 4: "RLS enabled but no policies"
**Cause**: RLS enabled but no policies created
**Solution**: Create the RLS policies

## 📝 **Production Notes**

1. **Remove Development Policy**: Remove the "Allow all operations for development" policy in production
2. **User Authentication**: Ensure proper user authentication with UUID generation
3. **Error Logging**: Monitor database errors in production logs
4. **Backup**: Set up regular database backups

## 🎯 **Next Steps**

1. Run the SQL scripts in Supabase
2. Test the API with valid UUIDs
3. Verify challenge completion works
4. Monitor for any remaining errors 