-- ======================================================================
-- Audit Log Table for Security/Compliance
-- Run after 001_full_schema.sql
-- ======================================================================

CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'auth.login', 'auth.logout', 'rbac.grant', 'rbac.revoke', 'data.create', 'data.update', 'data.delete', 'admin.action'
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    actor_id UUID REFERENCES public.profiles(id), -- Who performed the action (null for system)
    actor_role TEXT, -- base_role of actor at time of event
    target_type TEXT, -- 'user', 'task', 'izin', 'alat', 'permission', 'grade', etc.
    target_id UUID, -- ID of affected resource
    old_values JSONB, -- Previous state (for updates/deletes)
    new_values JSONB, -- New state (for creates/updates)
    metadata JSONB, -- Additional context (IP, user agent, request_id, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_target ON public.audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_severity ON public.audit_log(severity) WHERE severity IN ('warning', 'critical');

-- RLS: Only admins and SDM can view audit logs
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all audit logs" ON public.audit_log
    FOR SELECT USING ((auth.jwt() ->> 'base_role') = 'admin');

CREATE POLICY "SDM can view audit logs" ON public.audit_log
    FOR SELECT USING (public.has_permission('sdm'));

-- Service role can insert (backend writes)
CREATE POLICY "Service role can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at (not needed for audit_log as it's append-only)
-- But add for consistency if we ever update
CREATE TRIGGER trigger_audit_log_updated_at
    BEFORE UPDATE ON public.audit_log
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();