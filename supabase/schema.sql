-- Supabase Schema Initialization for Batsir Productivity Planner
-- This version supports editing existing tables safely via drops and re-creations

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- 1. Tables Setup
----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  preferred_time TIME,
  location TEXT,
  two_minute_version TEXT,
  anchor_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  weekend_flexibility BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_blocks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  status TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT,
  operation TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'todo',
  estimated_sessions INTEGER DEFAULT 1,
  completed_sessions INTEGER DEFAULT 0,
  tag TEXT,
  todos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  total_pages INTEGER DEFAULT 0,
  current_page INTEGER DEFAULT 0,
  file_uri TEXT,
  cover_uri TEXT,
  status TEXT DEFAULT 'want_to_read',
  synthesis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS synthesis TEXT;

CREATE TABLE IF NOT EXISTS public.reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  pages_read INTEGER DEFAULT 0,
  duration_minutes DOUBLE PRECISION DEFAULT 0,
  duration_seconds DOUBLE PRECISION DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reading_logs ADD COLUMN IF NOT EXISTS duration_seconds DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.reading_logs ALTER COLUMN duration_minutes TYPE DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_history (
  old_id TEXT PRIMARY KEY NOT NULL,
  new_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- 2. Ensure Columns Exist (Migrations for existing tables)
----------------------------------------------------

-- Habits
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS preferred_time TIME;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS two_minute_version TEXT;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS anchor_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS weekend_flexibility BOOLEAN DEFAULT FALSE;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;

-- Schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS time_blocks JSONB DEFAULT '[]'::jsonb;

-- Logs
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Shortcuts
ALTER TABLE public.shortcuts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '[]'::jsonb;

-- Sync History
ALTER TABLE public.sync_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

----------------------------------------------------
-- 3. RLS Enablement
----------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 4. Policy Cleanup & Recreation
----------------------------------------------------

-- Function to drop all policies for a table to ensure clean state
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Profiles (Link is 'id' to auth.uid())
CREATE POLICY "Profiles: Users view own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: Users update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles: Users insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits
CREATE POLICY "Habits: Users view own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Habits: Users insert own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Habits: Users update own" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Habits: Users delete own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- Schedules
CREATE POLICY "Schedules: Users view own" ON public.schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Schedules: Users insert own" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Schedules: Users update own" ON public.schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Schedules: Users delete own" ON public.schedules FOR DELETE USING (auth.uid() = user_id);

-- Logs
CREATE POLICY "Logs: Users view own" ON public.logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Logs: Users insert own" ON public.logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Logs: Users update own" ON public.logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Logs: Users delete own" ON public.logs FOR DELETE USING (auth.uid() = user_id);

-- Sync Queue
CREATE POLICY "SyncQueue: Users view own" ON public.sync_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SyncQueue: Users insert own" ON public.sync_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SyncQueue: Users delete own" ON public.sync_queue FOR DELETE USING (auth.uid() = user_id);

-- Shortcuts
CREATE POLICY "Shortcuts: Users view own" ON public.shortcuts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shortcuts: Users insert own" ON public.shortcuts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shortcuts: Users update own" ON public.shortcuts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Shortcuts: Users delete own" ON public.shortcuts FOR DELETE USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Tasks: Users view own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tasks: Users insert own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tasks: Users update own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Tasks: Users delete own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Books
CREATE POLICY "Books: Users view own" ON public.books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Books: Users insert own" ON public.books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Books: Users update own" ON public.books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Books: Users delete own" ON public.books FOR DELETE USING (auth.uid() = user_id);

-- Reading Logs
CREATE POLICY "ReadingLogs: Users view own" ON public.reading_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ReadingLogs: Users insert own" ON public.reading_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Bookmarks: Users view own" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Bookmarks: Users insert own" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Bookmarks: Users update own" ON public.bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Bookmarks: Users delete own" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Sync History
CREATE POLICY "SyncHistory: Users view own" ON public.sync_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SyncHistory: Users insert own" ON public.sync_history FOR INSERT WITH CHECK (auth.uid() = user_id);

----------------------------------------------------
-- 5. Triggers & Functions Cleanup
----------------------------------------------------

-- Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Profile Handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.schedules;
DROP TRIGGER IF EXISTS update_logs_updated_at ON public.logs;
DROP TRIGGER IF EXISTS update_shortcuts_updated_at ON public.shortcuts;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_books_updated_at ON public.books;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_logs_updated_at BEFORE UPDATE ON public.logs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_shortcuts_updated_at BEFORE UPDATE ON public.shortcuts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

----------------------------------------------------
-- 6. Storage Setup (Books Bucket)
----------------------------------------------------

-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for Books Bucket
CREATE POLICY "Books Bucket: Users upload own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.uid() = owner);

CREATE POLICY "Books Bucket: Users view own" ON storage.objects
  FOR SELECT USING (bucket_id = 'books' AND auth.uid() = owner);

CREATE POLICY "Books Bucket: Users delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'books' AND auth.uid() = owner);
