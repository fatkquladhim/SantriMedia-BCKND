import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../shared/logger.js';
import { verifyJWT, extractUserFromPayload } from '../shared/jwtVerify.js';

/**
 * Layer 1: Verify JWT token and attach user to request.
 * 1. Local JWT verification (signature, exp, iss, aud)
 * 2. Fetch profile + permissions from DB
 */
export const authGuard = async (req, res, next) => {
    try {
        if (req.user) {
            return next();
        }
        logger.debug({ path: req.path }, 'Auth guard check starting');
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
        }

        const token = authHeader.replace('Bearer ', '');

        // 1. Local JWT verification (fast, no network call)
        let payload;
        try {
            payload = await verifyJWT(token);
        } catch (err) {
            logger.warn({ err }, 'Local JWT verification failed');
            return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah expired' });
        }

        const userId = payload.sub;
        logger.debug({ userId }, 'Local JWT verified, fetching profile');

        // 2. Fetch profile + permissions from DB (single query with join)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
                id, full_name, email, base_role, is_profile_complete, divisi_id,
                divisi:divisi_id ( id, nama ),
                kamar:kamar_id ( id, nomor, asrama:asrama_id ( id, nama ) )
            `)
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            logger.warn({ profileError, userId }, 'Profile not found');
            return res.status(401).json({ success: false, message: 'User profile not found' });
        }

        const { data: permissions } = await supabaseAdmin
            .from('user_permissions')
            .select('permission, target_id')
            .eq('user_id', userId);

        const dynamicPermissions = (permissions || []).map(p => p.permission);
        const permissionDetails = (permissions || []).map(p => ({
            permission: p.permission,
            divisi_id: p.target_id,
            platform_id: p.target_id
        }));

        // Attach to request
        req.user = {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            base_role: profile.base_role,
            is_profile_complete: profile.is_profile_complete,
            divisi_id: profile.divisi_id || null,
            divisi: profile.divisi || null,
            kamar: profile.kamar || null,
            dynamic_permissions: dynamicPermissions,
            permissions: permissionDetails,
        };

        next();
    } catch (err) {
        logger.error({ err }, 'Auth guard error');
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};
