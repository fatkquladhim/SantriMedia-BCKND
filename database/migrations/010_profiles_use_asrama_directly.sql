-- =============================================================
-- 010. Hubungkan Profiles Langsung ke Asrama (Tanpa Kamar)
-- =============================================================

-- 1. Tambah kolom asrama_id ke profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asrama_id UUID REFERENCES public.asrama(id);

-- 2. Migrasi data lama dari kamar_id ke asrama_id
UPDATE public.profiles p
SET asrama_id = k.asrama_id
FROM public.kamar k
WHERE p.kamar_id = k.id;

-- 3. Hapus foreign key constraint lama & kolom kamar_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_kamar;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS kamar_id;
