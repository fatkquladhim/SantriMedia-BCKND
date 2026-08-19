import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../shared/logger.js';
import { verifyJWT } from '../shared/jwtVerify.js';

// In-memory cache for user profiles + permissions
// TTL 2 minutes — balances freshness with performance
const userCache = new Map();
const USER_CACHE_TTL_MS = 2 * 60 * 1000;

function getCachedUser(userId) {
    const entry = userCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) {
        userCache.delete(userId);
        return null;
    }
    return entry.user;
}

function setCachedUser(userId, user) {
    userCache.set(userId, { user, cachedAt: Date.now() });
}

export function invalidateUserCache(userId) {
    userCache.delete(userId);
}

/**
 * Layer 1: Verify JWT + attach user to request.
 * 1. Local JWT verification via JWKS (no network to Supabase Auth)
 * 2. Fetch profile + permissions in single DB query
 * 3. Cache result for 2 minutes
 */
export const authGuard = async (req, res, next) => {
    try {
        if (req.user) return next();

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
        }

        const token = authHeader.replace('Bearer ', '');

        // 1. Local JWT verification via cached JWKS (~0ms, no external call)
        let payload;
        try {
            payload = await verifyJWT(token);
        } catch (err) {
            logger.warn({ err }, 'JWT verification failed');
            return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah expired' });
        }

        const userId = payload.sub;

        // 2. Check in-memory cache first
        const cached = getCachedUser(userId);
        if (cached) {
            req.user = cached;
            return next();
        }

        // 3. Fetch profile + permissions in SINGLE query (was 2 queries before)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
                id, full_name, email, base_role, is_profile_complete, divisi_id,
                divisi:divisi_id ( id, nama ),
                asrama:asrama_id ( id, nama ),
                alamat, nomor_darurat, avatar_url
            `)
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            logger.warn({ profileError, userId }, 'Profile not found');
            return res.status(401).json({ success: false, message: 'User profile not found' });
        }

        // Fetch permissions separately (can't be joined in Supabase without RLS issues)
        const { data: permissions } = await supabaseAdmin
            .from('user_permissions')
            .select('permission, target_id')
            .eq('user_id', userId);

        const user = {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            base_role: profile.base_role,
            is_profile_complete: profile.is_profile_complete,
            divisi_id: profile.divisi_id || null,
            divisi: profile.divisi || null,
            asrama_id: profile.asrama_id || null,
            asrama: profile.asrama || null,
            no_hp: profile.no_hp || null,
            bio: profile.bio || null,
            alamat: profile.alamat || null,
            nomor_darurat: profile.nomor_darurat || null,
            avatar_url: profile.avatar_url || null,
            dynamic_permissions: (permissions || []).map(p => p.permission),
            permissions: (permissions || []).map(p => ({ permission: p.permission, divisi_id: p.target_id })),
        };

        // 4. Cache for future requests
        setCachedUser(userId, user);

        req.user = user;
        next();
    } catch (err) {
        logger.error({ err }, 'Auth guard error');
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};
