-- Supabase Schema Initialization for Batsir Productivity Planner
-- This version supports editing existing tables safely

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- 1. Profiles Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (for updates later)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

----------------------------------------------------
-- 2. Habits Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  preferred_time TIME,
  weekend_flexibility BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS preferred_time TIME,
ADD COLUMN IF NOT EXISTS weekend_flexibility BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;

----------------------------------------------------
-- 3. Schedules Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_blocks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS time_blocks JSONB DEFAULT '[]'::jsonb;

----------------------------------------------------
-- 4. Logs Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  status TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- 5. Sync Queue
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT,
  operation TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- 6. Shortcuts Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- 7. Tasks Table
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'todo',
  estimated_sessions INTEGER DEFAULT 1,
  completed_sessions INTEGER DEFAULT 0,
  tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- Enable Row Level Security
----------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- Drop Policies If Exist (So They Can Be Edited)
----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;

DROP POLICY IF EXISTS "Users can view own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON public.schedules;

DROP POLICY IF EXISTS "Users can view own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.logs;

DROP POLICY IF EXISTS "Users can view own sync queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Users can insert own sync queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Users can delete own sync queue items" ON public.sync_queue;

DROP POLICY IF EXISTS "Users can view own shortcuts" ON public.shortcuts;
DROP POLICY IF EXISTS "Users can insert own shortcuts" ON public.shortcuts;
DROP POLICY IF EXISTS "Users can update own shortcuts" ON public.shortcuts;
DROP POLICY IF EXISTS "Users can delete own shortcuts" ON public.shortcuts;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

----------------------------------------------------
-- Recreate Policies
----------------------------------------------------

-- Profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Habits
CREATE POLICY "Users can view own habits"
ON public.habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
ON public.habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
ON public.habits FOR UPDATE
USING (auth.uid() = user_id);

-- Schedules
CREATE POLICY "Users can view own schedules"
ON public.schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
ON public.schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
ON public.schedules FOR UPDATE
USING (auth.uid() = user_id);

-- Logs
CREATE POLICY "Users can view own logs"
ON public.logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.habits 
    WHERE habits.id = logs.habit_id 
    AND habits.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own logs"
ON public.logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.habits 
    WHERE habits.id = logs.habit_id 
    AND habits.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own logs"
ON public.logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.habits 
    WHERE habits.id = logs.habit_id 
    AND habits.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own logs"
ON public.logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.habits 
    WHERE habits.id = logs.habit_id 
    AND habits.user_id = auth.uid()
  )
);

-- Shortcuts
CREATE POLICY "Users can view own shortcuts"
ON public.shortcuts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shortcuts"
ON public.shortcuts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shortcuts"
ON public.shortcuts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shortcuts"
ON public.shortcuts FOR DELETE
USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can view own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- Add delete policy for schedules
CREATE POLICY "Users can delete own schedules"
ON public.schedules FOR DELETE
USING (auth.uid() = user_id);

----------------------------------------------------
-- Updated_at Trigger Function
----------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';

----------------------------------------------------
-- Drop triggers if exist (for editing)
----------------------------------------------------

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.schedules;
DROP TRIGGER IF EXISTS update_shortcuts_updated_at ON public.shortcuts;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;

----------------------------------------------------
-- Recreate Triggers
----------------------------------------------------

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shortcuts_updated_at
BEFORE UPDATE ON public.shortcuts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

----------------------------------------------------
-- Auto Create Profile
----------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.profiles (id, email)
VALUES (new.id, new.email);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();