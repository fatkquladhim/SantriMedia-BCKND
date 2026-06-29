-- ======================================================================
-- Performance Indexes for Production Scale
-- Run after 001_full_schema.sql
-- ======================================================================

-- =============================================================
-- TASKS: Composite indexes for common query patterns
-- =============================================================
-- Primary: assigned_to + status + divisi_id (task dispatcher, user task lists)
CREATE INDEX idx_tasks_assigned_status_divisi ON public.tasks(assigned_to, status, divisi_id);

-- Primary: created_by + status (delegation views)
CREATE INDEX idx_tasks_created_by_status ON public.tasks(created_by, status);

-- Platform-scoped queries
CREATE INDEX idx_tasks_platform_status ON public.tasks(platform_id, status);

-- Deadline-based queries (overdue detection)
CREATE INDEX idx_tasks_deadline_status ON public.tasks(deadline, status) WHERE deadline IS NOT NULL;

-- =============================================================
-- IZIN MALAM: Composite indexes
-- =============================================================
CREATE INDEX idx_izin_user_status ON public.izin_malam(user_id, status);
CREATE INDEX idx_izin_approved_by_status ON public.izin_malam(approved_by, status);
CREATE INDEX idx_izin_jam_keluar ON public.izin_malam(jam_keluar);

-- =============================================================
-- PEMINJAMAN ALAT: Composite indexes
-- =============================================================
CREATE INDEX idx_pinjam_user_status ON public.peminjaman_alat(user_id, status);
CREATE INDEX idx_pinjam_alat_status ON public.peminjaman_alat(alat_id, status);
CREATE INDEX idx_pinjam_approved_by_status ON public.peminjaman_alat(approved_by, status);
CREATE INDEX idx_pinjam_tanggal_pinjam ON public.peminjaman_alat(tanggal_pinjam);

-- =============================================================
-- EVALUASI ASRAMA: Composite indexes
-- =============================================================
CREATE INDEX idx_eval_santri_bulan ON public.evaluasi_asrama(santri_id, bulan_evaluasi);
CREATE INDEX idx_eval_kepala_bulan ON public.evaluasi_asrama(kepala_asrama_id, bulan_evaluasi);

-- =============================================================
-- GRADE HISTORY: Composite indexes
-- =============================================================
CREATE INDEX idx_grade_user_published ON public.grade_history(user_id, is_published);
CREATE INDEX idx_grade_periode_published ON public.grade_history(periode, is_published);

-- =============================================================
-- PROFILES: Additional indexes for auth/lookups
-- =============================================================
CREATE INDEX idx_profiles_divisi_role ON public.profiles(divisi_id, base_role);
CREATE INDEX idx_profiles_kamar ON public.profiles(kamar_id);
CREATE INDEX idx_profiles_nomor_induk ON public.profiles(nomor_induk);

-- =============================================================
-- USER PERMISSIONS: Already indexed in base migration
-- =============================================================

-- =============================================================
-- INVENTARIS ALAT: Additional indexes
-- =============================================================
CREATE INDEX idx_alat_kategori_available ON public.inventaris_alat(kategori, is_available);
CREATE INDEX idx_alat_next_maintenance ON public.inventaris_alat(next_maintenance) WHERE next_maintenance IS NOT NULL;