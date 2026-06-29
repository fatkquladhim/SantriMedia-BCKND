-- ======================================================================
-- Auto-update updated_at triggers
-- Run after 001_full_schema.sql
-- ======================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at column
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_izin_malam_updated_at
    BEFORE UPDATE ON public.izin_malam
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_peminjaman_alat_updated_at
    BEFORE UPDATE ON public.peminjaman_alat
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_inventaris_alat_updated_at
    BEFORE UPDATE ON public.inventaris_alat
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_evaluasi_asrama_updated_at
    BEFORE UPDATE ON public.evaluasi_asrama
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_grade_history_updated_at
    BEFORE UPDATE ON public.grade_history
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_divisi_updated_at
    BEFORE UPDATE ON public.divisi
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_platform_updated_at
    BEFORE UPDATE ON public.platform
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_asrama_updated_at
    BEFORE UPDATE ON public.asrama
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_kamar_updated_at
    BEFORE UPDATE ON public.kamar
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();