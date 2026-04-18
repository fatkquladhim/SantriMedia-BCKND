import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../shared/logger.js';

/**
 * Layer 1: Verify JWT token and attach user to request.
 * Reads base_role and dynamic_permissions from the profile + user_permissions table.
 */
export const authGuard = async (req, res, next) => {
    try {
        logger.debug({ path: req.path }, 'Auth guard check starting');
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token with Supabase Admin (does not respect RLS)
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            logger.warn({ error }, 'Invalid token in authGuard');
            return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah expired' });
        }
        logger.debug({ userId: user.id }, 'Token verified, fetching profile');

        // Fetch profile + permissions from DB
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, base_role, is_profile_complete, divisi_id')
            .eq('id', user.id)
            .single();

        const { data: permissions } = await supabaseAdmin
            .from('user_permissions')
            .select('permission, divisi_id, platform_id')
            .eq('user_id', user.id);

        const dynamicPermissions = (permissions || []).map(p => p.permission);
        const permissionDetails = (permissions || []).map(p => ({
            permission: p.permission,
            divisi_id: p.divisi_id,
            platform_id: p.platform_id
        }));

        // Attach to request
        req.user = {
            id: user.id,
            email: user.email,
            full_name: profile?.full_name || '',
            base_role: profile?.base_role || 'user',
            is_profile_complete: profile?.is_profile_complete || false,
            divisi_id: profile?.divisi_id || null, // Base division from profile
            dynamic_permissions: dynamicPermissions,
            permissions: permissionDetails,
        };

        next();
    } catch (err) {
        logger.error({ err }, 'Auth guard error');
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};
