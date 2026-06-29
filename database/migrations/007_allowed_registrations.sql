-- ======================================================================
-- Allowed Registrations (Email Whitelist)
-- Run after 001_full_schema.sql
-- ======================================================================

CREATE TABLE public.allowed_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    divisi_id UUID REFERENCES public.divisi(id),
    kamar_id UUID REFERENCES public.kamar(id),
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allowed_reg_email ON public.allowed_registrations(email);
CREATE INDEX idx_allowed_reg_invited_by ON public.allowed_registrations(invited_by);
CREATE INDEX idx_allowed_reg_expires ON public.allowed_registrations(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE public.allowed_registrations ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admin full access allowed_registrations" ON public.allowed_registrations
    FOR ALL USING ((auth.jwt() ->> 'base_role') = 'admin');

-- Service role for backend registration check
CREATE POLICY "Service role full access allowed_registrations" ON public.allowed_registrations
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER trigger_allowed_registrations_updated_at
    BEFORE UPDATE ON public.allowed_registrations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();