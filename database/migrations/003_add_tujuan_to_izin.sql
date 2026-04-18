-- =============================================================
-- 15. ADD TUJUAN TO IZIN_MALAM
-- =============================================================
ALTER TABLE public.izin_malam 
ADD COLUMN tujuan TEXT;
