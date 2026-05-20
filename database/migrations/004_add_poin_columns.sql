-- Add poin column to tasks (default 10 so existing tasks are not broken)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS poin INTEGER DEFAULT 10;

-- Add total_poin column to profiles (default 0)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_poin INTEGER DEFAULT 0;
