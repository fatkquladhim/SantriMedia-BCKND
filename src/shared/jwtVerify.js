import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/environment.js';
import { logger } from './logger.js';

// JWKS — fetched once, cached for 5 minutes
let jwksCache = { jwks: null, fetchedAt: 0 };
const JWKS_TTL_MS = 5 * 60 * 1000;

async function getJWKS() {
    const now = Date.now();
    if (jwksCache.jwks && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
        return jwksCache.jwks;
    }
    const jwksUrl = new URL(`${env.supabase.url}/.well-known/jwks.json`);
    jwksCache = { jwks: createRemoteJWKSet(jwksUrl), fetchedAt: now };
    return jwksCache.jwks;
}

/**
 * Verify JWT locally using Supabase JWKS endpoint + jose library.
 * No network call to Supabase Auth API — only to public JWKS endpoint (cached 5 min).
 * Falls back to HTTP verify if local verification fails.
 */
export async function verifyJWT(token) {
    try {
        const jwks = await getJWKS();
        const { payload } = await jwtVerify(token, jwks, {
            issuer: env.supabase.url,
            audience: env.supabase.anonKey,
        });
        return payload;
    } catch (localErr) {
        logger.warn({ err: localErr.message }, 'Local JWT verification failed, attempting HTTP fallback');
        // Fallback: use Supabase Auth API for verification
        const { createClient } = await import('@supabase/supabase-js');
        const sbAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey);
        const { data: { user }, error } = await sbAdmin.auth.getUser(token);
        if (error || !user) throw new Error(error?.message || 'User not found');
        return {
            sub: user.id,
            email: user.email,
            ...user,
        };
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