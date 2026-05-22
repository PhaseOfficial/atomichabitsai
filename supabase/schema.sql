-- Supabase Schema Initialization for Batsir Productivity Planner
-- Idempotent version - safe to run multiple times without conflicts

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- 1. Tables Setup (Idempotent - IF NOT EXISTS)
----------------------------------------------------

-- Core tables
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
  last_page_read INTEGER DEFAULT 0,
  file_uri TEXT,
  cover_uri TEXT,
  status TEXT DEFAULT 'want_to_read',
  synthesis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  pages_read INTEGER DEFAULT 0,
  duration_minutes DOUBLE PRECISION DEFAULT 0,
  duration_seconds DOUBLE PRECISION DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_history (
  old_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (old_id, table_name, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- 2. Safe Column Migrations (Check before adding)
----------------------------------------------------

DO $$ 
BEGIN
    -- Books table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'synthesis') THEN
        ALTER TABLE public.books ADD COLUMN synthesis TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'last_page_read') THEN
        ALTER TABLE public.books ADD COLUMN last_page_read INTEGER DEFAULT 0;
    END IF;
    
    -- Reading logs migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reading_logs' AND column_name = 'duration_seconds') THEN
        ALTER TABLE public.reading_logs ADD COLUMN duration_seconds DOUBLE PRECISION DEFAULT 0;
    END IF;
    
    -- Alter column type safely (only if needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reading_logs' AND column_name = 'duration_minutes' AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.reading_logs ALTER COLUMN duration_minutes TYPE DOUBLE PRECISION;
    END IF;
END $$;

----------------------------------------------------
-- 3. RLS Enablement (Idempotent)
----------------------------------------------------

DO $$ 
DECLARE
    tables text[] := ARRAY['profiles', 'habits', 'schedules', 'logs', 'sync_queue', 'shortcuts', 'tasks', 'books', 'reading_logs', 'bookmarks', 'sync_history', 'chat_messages'];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

----------------------------------------------------
-- 4. Safe Policy Recreation (Drop only existing policies)
----------------------------------------------------

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) 
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop policy % on table %: %', pol.policyname, pol.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Profiles (Link is 'id' to auth.uid())
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profiles: Users view own' AND tablename = 'profiles') THEN
        CREATE POLICY "Profiles: Users view own" ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Profiles: Users update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Profiles: Users insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Repeat for each table (only create if not exists)
DO $$ 
BEGIN
    -- Habits policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Habits: Users view own' AND tablename = 'habits') THEN
        CREATE POLICY "Habits: Users view own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Habits: Users insert own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Habits: Users update own" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Habits: Users delete own" ON public.habits FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Schedules policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Schedules: Users view own' AND tablename = 'schedules') THEN
        CREATE POLICY "Schedules: Users view own" ON public.schedules FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Schedules: Users insert own" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Schedules: Users update own" ON public.schedules FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Schedules: Users delete own" ON public.schedules FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Logs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Logs: Users view own' AND tablename = 'logs') THEN
        CREATE POLICY "Logs: Users view own" ON public.logs FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Logs: Users insert own" ON public.logs FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Logs: Users update own" ON public.logs FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Logs: Users delete own" ON public.logs FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Sync Queue policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'SyncQueue: Users view own' AND tablename = 'sync_queue') THEN
        CREATE POLICY "SyncQueue: Users view own" ON public.sync_queue FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "SyncQueue: Users insert own" ON public.sync_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "SyncQueue: Users delete own" ON public.sync_queue FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Shortcuts policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Shortcuts: Users view own' AND tablename = 'shortcuts') THEN
        CREATE POLICY "Shortcuts: Users view own" ON public.shortcuts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Shortcuts: Users insert own" ON public.shortcuts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Shortcuts: Users update own" ON public.shortcuts FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Shortcuts: Users delete own" ON public.shortcuts FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Tasks policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tasks: Users view own' AND tablename = 'tasks') THEN
        CREATE POLICY "Tasks: Users view own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Tasks: Users insert own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Tasks: Users update own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Tasks: Users delete own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Books policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Books: Users view own' AND tablename = 'books') THEN
        CREATE POLICY "Books: Users view own" ON public.books FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Books: Users insert own" ON public.books FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Books: Users update own" ON public.books FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Books: Users delete own" ON public.books FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Reading Logs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ReadingLogs: Users view own' AND tablename = 'reading_logs') THEN
        CREATE POLICY "ReadingLogs: Users view own" ON public.reading_logs FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "ReadingLogs: Users insert own" ON public.reading_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Bookmarks policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bookmarks: Users view own' AND tablename = 'bookmarks') THEN
        CREATE POLICY "Bookmarks: Users view own" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Bookmarks: Users insert own" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Bookmarks: Users update own" ON public.bookmarks FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Bookmarks: Users delete own" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Sync History policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'SyncHistory: Users view own' AND tablename = 'sync_history') THEN
        CREATE POLICY "SyncHistory: Users view own" ON public.sync_history FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "SyncHistory: Users insert own" ON public.sync_history FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Chat Messages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ChatMessages: Users view own' AND tablename = 'chat_messages') THEN
        CREATE POLICY "ChatMessages: Users view own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "ChatMessages: Users insert own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

----------------------------------------------------
-- 5. Triggers & Functions (Safe create or replace)
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
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate triggers safely
DO $$ 
DECLARE
    trigger_config record;
BEGIN
    -- Drop existing triggers
    FOR trigger_config IN (
        SELECT tgname AS trigger_name, relname AS table_name
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        WHERE tgname IN ('update_profiles_updated_at', 'update_habits_updated_at', 'update_schedules_updated_at', 
                        'update_logs_updated_at', 'update_shortcuts_updated_at', 'update_tasks_updated_at', 
                        'update_books_updated_at', 'on_auth_user_created')
    ) LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_config.trigger_name, trigger_config.table_name);
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop trigger %: %', trigger_config.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_logs_updated_at BEFORE UPDATE ON public.logs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_shortcuts_updated_at BEFORE UPDATE ON public.shortcuts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Handle auth trigger separately to avoid duplicate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

----------------------------------------------------
-- 6. Storage Setup (Idempotent)
----------------------------------------------------

-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Books Bucket: Users upload own' AND schemaname = 'storage') THEN
        CREATE POLICY "Books Bucket: Users upload own" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.uid() = owner);
        
        CREATE POLICY "Books Bucket: Users view own" ON storage.objects
          FOR SELECT USING (bucket_id = 'books' AND auth.uid() = owner);
        
        CREATE POLICY "Books Bucket: Users delete own" ON storage.objects
          FOR DELETE USING (bucket_id = 'books' AND auth.uid() = owner);
    END IF;
END $$;

----------------------------------------------------
-- 7. Additional Conflict Prevention
----------------------------------------------------

-- Create indexes for better performance and conflict prevention
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON public.schedules(user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_user_habit ON public.logs(user_id, habit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_logs_book_id ON public.reading_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON public.bookmarks(book_id);

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles with preferences';
COMMENT ON TABLE public.habits IS 'User habits with streak tracking';
COMMENT ON TABLE public.schedules IS 'Daily schedules with time blocks';
COMMENT ON TABLE public.logs IS 'Habit completion logs';
COMMENT ON TABLE public.tasks IS 'Task management';
COMMENT ON TABLE public.books IS 'Book library with reading progress';