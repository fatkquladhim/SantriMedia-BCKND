-- ======================================================================
-- ERP Pesantren Multimedia — Complete Database Migration
-- Run this in Supabase SQL Editor in order
-- ======================================================================

-- =============================================================
-- 1. ENUM TYPES
-- =============================================================
CREATE TYPE public.base_role AS ENUM ('admin', 'kepala_asrama', 'user');

CREATE TYPE public.dynamic_permission AS ENUM (
  'ketua_divisi',
  'ketua_platform',
  'staf_kantor',
  'staf_alat',
  'sdm'
);

CREATE TYPE public.task_status AS ENUM (
  'todo', 'in_progress', 'review', 'done', 'cancelled'
);

CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE public.izin_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.kondisi_alat AS ENUM (
  'baik', 'rusak_ringan', 'rusak_berat', 'maintenance'
);

CREATE TYPE public.pinjam_status AS ENUM (
  'pending', 'approved', 'rejected', 'dipinjam', 'dikembalikan'
);

CREATE TYPE public.grade_level AS ENUM ('A', 'B', 'C', 'D');


-- =============================================================
-- 2. MASTER DATA: Divisi, Platform, Asrama, Kamar
-- =============================================================
CREATE TABLE public.divisi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.platform (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  divisi_id UUID REFERENCES public.divisi(id) ON DELETE CASCADE,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nama, divisi_id)
);


-- =============================================================
-- 3. PROFILES (extends auth.users)
-- =============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nomor_induk TEXT UNIQUE,
  email TEXT NOT NULL,
  avatar_url TEXT,
  base_role base_role NOT NULL DEFAULT 'user',
  divisi_id UUID REFERENCES public.divisi(id),
  kamar_id UUID, -- FK added after kamar table creation
  alamat TEXT,
  nomor_darurat TEXT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- 4. ASRAMA & KAMAR (depends on profiles)
-- =============================================================
CREATE TABLE public.asrama (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  kepala_asrama_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.kamar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT NOT NULL,
  asrama_id UUID NOT NULL REFERENCES public.asrama(id) ON DELETE CASCADE,
  kapasitas INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nomor, asrama_id)
);

-- Add FK to profiles after kamar exists
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_kamar
  FOREIGN KEY (kamar_id) REFERENCES public.kamar(id);


-- =============================================================
-- 5. USER PERMISSIONS (Dynamic Permissions)
-- =============================================================
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission dynamic_permission NOT NULL,
  target_id UUID, -- Scope (Divisi or Platform)
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to handle NULL target_id (Global) and Scoped targets
CREATE UNIQUE INDEX idx_user_permissions_unique_global ON public.user_permissions (user_id, permission) WHERE target_id IS NULL;
CREATE UNIQUE INDEX idx_user_permissions_unique_scoped ON public.user_permissions (user_id, permission, target_id) WHERE target_id IS NOT NULL;

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON public.user_permissions(permission);


-- =============================================================
-- 6. TASKS
-- =============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  divisi_id UUID REFERENCES public.divisi(id),
  platform_id UUID REFERENCES public.platform(id),
  evidence_url TEXT,
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_divisi ON public.tasks(divisi_id);


-- =============================================================
-- 7. IZIN MALAM
-- =============================================================
CREATE TABLE public.izin_malam (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  alasan TEXT NOT NULL,
  jam_keluar TIMESTAMPTZ NOT NULL,
  estimasi_kembali TIMESTAMPTZ NOT NULL,
  actual_kembali TIMESTAMPTZ,
  status izin_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  catatan_approval TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_izin_user ON public.izin_malam(user_id);
CREATE INDEX idx_izin_status ON public.izin_malam(status);


-- =============================================================
-- 8. INVENTARIS ALAT & PEMINJAMAN
-- =============================================================
CREATE TABLE public.inventaris_alat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  kondisi kondisi_alat DEFAULT 'baik',
  is_available BOOLEAN DEFAULT TRUE,
  lokasi_penyimpanan TEXT,
  last_maintenance TIMESTAMPTZ,
  next_maintenance TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.peminjaman_alat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alat_id UUID NOT NULL REFERENCES public.inventaris_alat(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tanggal_pinjam TIMESTAMPTZ DEFAULT NOW(),
  estimasi_kembali TIMESTAMPTZ NOT NULL,
  actual_kembali TIMESTAMPTZ,
  status pinjam_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pinjam_alat ON public.peminjaman_alat(alat_id);
CREATE INDEX idx_pinjam_user ON public.peminjaman_alat(user_id);
CREATE INDEX idx_pinjam_status ON public.peminjaman_alat(status);


-- =============================================================
-- 9. EVALUASI ASRAMA
-- =============================================================
CREATE TABLE public.evaluasi_asrama (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES public.profiles(id),
  kepala_asrama_id UUID NOT NULL REFERENCES public.profiles(id),
  kategori TEXT NOT NULL,
  catatan TEXT NOT NULL,
  skor INTEGER CHECK (skor >= 0 AND skor <= 100),
  bulan_evaluasi TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eval_santri ON public.evaluasi_asrama(santri_id);
CREATE INDEX idx_eval_bulan ON public.evaluasi_asrama(bulan_evaluasi);


-- =============================================================
-- 10. GRADE HISTORY
-- =============================================================
CREATE TABLE public.grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  periode TEXT NOT NULL,
  skor_teknis FLOAT,
  skor_asrama FLOAT,
  skor_final FLOAT,
  grade grade_level,
  catatan_ai TEXT,
  published_by UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(user_id, periode)
);

CREATE INDEX idx_grade_user ON public.grade_history(user_id);
CREATE INDEX idx_grade_periode ON public.grade_history(periode);


-- =============================================================
-- 11. SUPABASE AUTH HOOK: Custom Access Token
-- =============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims JSONB;
  user_base_role public.base_role;
  user_permissions JSONB;
BEGIN
  claims := event->'claims';

  SELECT p.base_role INTO user_base_role
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::UUID;

  SELECT COALESCE(jsonb_agg(up.permission), '[]'::JSONB)
  INTO user_permissions
  FROM public.user_permissions up
  WHERE up.user_id = (event->>'user_id')::UUID;

  claims := jsonb_set(claims, '{base_role}', to_jsonb(user_base_role));
  claims := jsonb_set(claims, '{dynamic_permissions}', user_permissions);
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;


-- =============================================================
-- 12. RLS POLICIES
-- =============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.izin_malam ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peminjaman_alat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluasi_asrama ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.has_permission(required_perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() ->> 'base_role') = 'admin' THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      COALESCE(auth.jwt() -> 'dynamic_permissions', '[]'::jsonb)
    ) AS perm WHERE perm = required_perm
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING ((auth.jwt() ->> 'base_role') = 'admin');
CREATE POLICY "SDM can view all profiles" ON public.profiles FOR SELECT USING (public.has_permission('sdm'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE USING ((auth.jwt() ->> 'base_role') = 'admin');

-- Tasks policies
CREATE POLICY "Users see own tasks" ON public.tasks FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admin sees all tasks" ON public.tasks FOR SELECT USING ((auth.jwt() ->> 'base_role') = 'admin');

-- Izin policies
CREATE POLICY "Users see own izin" ON public.izin_malam FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staf kantor sees all izin" ON public.izin_malam FOR SELECT USING (public.has_permission('staf_kantor'));

-- Evaluasi policies
CREATE POLICY "Kepala asrama can manage evaluasi" ON public.evaluasi_asrama
  FOR ALL USING ((auth.jwt() ->> 'base_role') IN ('kepala_asrama', 'admin'));

-- Service role bypass (used by backend)
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access permissions" ON public.user_permissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access tasks" ON public.tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access izin" ON public.izin_malam FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access peminjaman" ON public.peminjaman_alat FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access evaluasi" ON public.evaluasi_asrama FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access grading" ON public.grade_history FOR ALL USING (auth.role() = 'service_role');


-- =============================================================
-- 13. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, base_role, is_profile_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
