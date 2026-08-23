-- ======================================================================
-- Migration 012: Modul Staff Alat
-- Date: 2026-08-20
-- Adds staff-alat module tables (sewa internal, tarif, profil & kas)
-- and extends inventaris_alat with staff-alat fields.
-- Supabase: run in SQL Editor. Idempotent (IF NOT EXISTS guards).
-- ======================================================================

-- =============================================================
-- 1. Extend inventaris_alat (existing table — TIDAK buat tabel kedua)
-- =============================================================
ALTER TABLE public.inventaris_alat
    ADD COLUMN IF NOT EXISTS gambar TEXT,
    ADD COLUMN IF NOT EXISTS keterangan TEXT,
    ADD COLUMN IF NOT EXISTS jumlah INTEGER NOT NULL DEFAULT 1;

-- Add 'hilang' to kondisi_alat enum (guarded, since ALTER TYPE ADD VALUE
-- cannot run inside a transaction block in older Postgres; run standalone).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.kondisi_alat'::regtype
          AND enumlabel = 'hilang'
    ) THEN
        ALTER TYPE public.kondisi_alat ADD VALUE IF NOT EXISTS 'hilang';
    END IF;
END $$;

-- =============================================================
-- 2. New enums for sewa module
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sewa_jenis') THEN
        CREATE TYPE public.sewa_jenis AS ENUM ('Penyewaan', 'Peminjaman');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sewa_kategori') THEN
        CREATE TYPE public.sewa_kategori AS ENUM ('Umum', 'Paket Santri');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sewa_status') THEN
        CREATE TYPE public.sewa_status AS ENUM ('Lunas', 'Belum Lunas', 'Terlambat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
        CREATE TYPE public.return_status AS ENUM ('Belum Mengembalikan', 'Sudah Mengembalikan');
    END IF;
END $$;

-- =============================================================
-- 3. Table: sewa_alat (header transaksi sewa/peminjaman internal)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sewa_alat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_penyewa TEXT NOT NULL,
    jenis sewa_jenis NOT NULL DEFAULT 'Penyewaan',
    kategori sewa_kategori NOT NULL DEFAULT 'Umum',
    tanggal_penyewaan DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_pengembalian DATE NOT NULL,
    harga_sewa BIGINT NOT NULL DEFAULT 0,
    status sewa_status NOT NULL DEFAULT 'Belum Lunas',
    status_pengembalian return_status NOT NULL DEFAULT 'Belum Mengembalikan',
    catatan TEXT,
    jaminan TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sewa_alat_tgl ON public.sewa_alat(tanggal_pengembalian);
CREATE INDEX IF NOT EXISTS idx_sewa_alat_status ON public.sewa_alat(status);
CREATE INDEX IF NOT EXISTS idx_sewa_alat_pengembalian ON public.sewa_alat(status_pengembalian);

-- =============================================================
-- 4. Table: sewa_alat_items (baris item alat per transaksi)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sewa_alat_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sewa_id UUID NOT NULL REFERENCES public.sewa_alat(id) ON DELETE CASCADE,
    alat_id UUID REFERENCES public.inventaris_alat(id) ON DELETE SET NULL,
    nama_alat TEXT, -- snapshot nama alat untuk resilience
    jumlah INTEGER NOT NULL DEFAULT 1 CHECK (jumlah > 0),
    harga_satuan BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sewa_id, alat_id)
);

CREATE INDEX IF NOT EXISTS idx_sewa_items_sewa ON public.sewa_alat_items(sewa_id);
CREATE INDEX IF NOT EXISTS idx_sewa_items_alat ON public.sewa_alat_items(alat_id);

-- =============================================================
-- 5. Table: harga_sewa_alat (tarif sewa per alat/kategori)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.harga_sewa_alat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alat_id UUID REFERENCES public.inventaris_alat(id) ON DELETE CASCADE,
    nama_alat TEXT NOT NULL,
    kategori sewa_kategori NOT NULL DEFAULT 'Umum',
    jumlah INTEGER NOT NULL DEFAULT 1 CHECK (jumlah > 0),
    harga BIGINT NOT NULL DEFAULT 0 CHECK (harga >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harga_sewa_alat ON public.harga_sewa_alat(alat_id);
CREATE INDEX IF NOT EXISTS idx_harga_sewa_kategori ON public.harga_sewa_alat(kategori);

-- =============================================================
-- 6. Table: staff_alat_profil (single-row profil & kas)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.staff_alat_profil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_staff TEXT NOT NULL DEFAULT 'Pengurus Mediatech',
    sejak TEXT NOT NULL DEFAULT 'Januari 2025',
    uang_alat BIGINT NOT NULL DEFAULT 0 CHECK (uang_alat >= 0),
    logo_url TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 7. RLS Policies (service role only — backend is the only writer)
-- =============================================================
ALTER TABLE public.sewa_alat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sewa_alat_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harga_sewa_alat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_alat_profil ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access sewa_alat') THEN
        CREATE POLICY "Service role full access sewa_alat" ON public.sewa_alat FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access sewa_alat_items') THEN
        CREATE POLICY "Service role full access sewa_alat_items" ON public.sewa_alat_items FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access harga_sewa_alat') THEN
        CREATE POLICY "Service role full access harga_sewa_alat" ON public.harga_sewa_alat FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access staff_alat_profil') THEN
        CREATE POLICY "Service role full access staff_alat_profil" ON public.staff_alat_profil FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- =============================================================
-- 8. Seed: profil default (opsional, idempotent)
-- =============================================================
INSERT INTO public.staff_alat_profil (id, nama_staff, sejak, uang_alat)
VALUES ('00000000-0000-0000-0000-000000000001', 'Pengurus Mediatech', 'Januari 2025', 0)
ON CONFLICT (id) DO NOTHING;
