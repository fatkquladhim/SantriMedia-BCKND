import { supabaseAdmin } from '../config/supabase.js';
import { logger } from './logger.js';

/**
 * Verify JWT using Supabase Auth API
 */
export async function verifyJWT(token) {
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            throw new Error(error?.message || 'User not found');
        }

        // Return in format compatible with authGuard (expects payload.sub)
        return {
            sub: user.id,
            email: user.email,
            ...user,
        };
    } catch (err) {
        logger.warn({ err, tokenPreview: token.slice(0, 20) + '...' }, 'JWT local verification failed');
        throw new Error(`Invalid token: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
}

/**
 * Extract user info from verified JWT payload
 */
export function extractUserFromPayload(payload) {
    const appMeta = payload.app_metadata || {};
    const userMeta = payload.user_metadata || {};

    return {
        id: payload.sub,
        email: payload.email,
        base_role: appMeta.base_role || userMeta.base_role || 'user',
        dynamic_permissions: appMeta.dynamic_permissions || userMeta.dynamic_permissions || [],
        is_profile_complete: appMeta.is_profile_complete ?? userMeta.is_profile_complete ?? false,
    };
}