-- Supabase Schema Initialization for Batsir Productivity Planner

-- 1. Users table (Extending auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habits table (Atomic Habits framework)
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', etc.
  weekend_flexibility BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Schedules (Calendar time-blocking)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_blocks JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., [{"start": "09:00", "end": "11:00", "task": "Deep Work"}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Logs (Daily habit completion)
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL, -- 'completed', 'skipped', 'failed'
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sync Queue (For offline-to-online reconciliation)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits: Users can only see/edit their own habits
CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);

-- Schedules: Users can only see/edit their own schedules
CREATE POLICY "Users can view own schedules" ON public.schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.schedules FOR UPDATE USING (auth.uid() = user_id);

-- Logs: Users can only see/edit logs related to their habits
CREATE POLICY "Users can view own logs" ON public.logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.habits WHERE habits.id = logs.habit_id AND habits.user_id = auth.uid()));
CREATE POLICY "Users can insert own logs" ON public.logs FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE habits.id = logs.habit_id AND habits.user_id = auth.uid()));

-- Sync Queue: Users can only see/edit their own sync queue
CREATE POLICY "Users can view own sync queue" ON public.sync_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync queue" ON public.sync_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sync queue items" ON public.sync_queue FOR DELETE USING (auth.uid() = user_id);

-- Helper triggers to update 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Shortcuts table
CREATE TABLE IF NOT EXISTS public.shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shortcuts" ON public.shortcuts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shortcuts" ON public.shortcuts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shortcuts" ON public.shortcuts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shortcuts" ON public.shortcuts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_shortcuts_updated_at BEFORE UPDATE ON public.shortcuts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  estimated_sessions INTEGER DEFAULT 1,
  completed_sessions INTEGER DEFAULT 0,
  tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
