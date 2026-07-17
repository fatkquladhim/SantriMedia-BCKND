-- =============================================================
-- 009. Hapus Modul Platform
-- =============================================================
ALTER TABLE public.tasks DROP COLUMN IF EXISTS platform_id;
DROP TABLE IF EXISTS public.platform CASCADE;
