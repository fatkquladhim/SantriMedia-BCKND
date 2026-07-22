import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { auditAuth, auditData } from '../../shared/audit.js';

export class AuthService {
    /**
     * Register new user with email + password.
     */
    async register({ email, password, fullName }) {
        // 0. CHECK WHITELIST (GERBANG UTAMA)
        const { data: isAllowed, error: whitelistError } = await supabaseAdmin
            .from('allowed_registrations')
            .select('email')
            .eq('email', email)
            .single();

        if (whitelistError || !isAllowed) {
            await auditAuth.failed_login(email, { reason: 'not_whitelisted' });
            throw {
                status: 403,
                message: 'Akses Ditolak. Email Anda belum terdaftar di sistem instansi sebagai anggota resmi. Silakan hubungi Admin.'
            };
        }

        // 1. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
        });

        if (authError) throw authError;

        // 2. Create profile record
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: fullName,
                email,
                base_role: 'user',
                is_profile_complete: false,
            })
            .select()
            .single();

        if (profileError) {
            // Rollback auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        // Audit log
        await auditData.create(
            authData.user.id,
            'user',
            'profile',
            profile.id,
            { full_name: fullName, email, base_role: 'user' }
        );

        logger.info({ userId: authData.user.id }, 'New user registered');
        return { user: authData.user, profile };
    }

    /**
     * Login with email + password.
     */
    async login({ email, password, metadata }) {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            await auditAuth.failed_login(email, { error: error.message, ...metadata });
            throw error;
        }

        await auditAuth.login(data.user.id, 'user', metadata);
        return data;
    }

    /**
     * Get current user profile with permissions.
     */
    async getMe(userId) {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select(`
        *,
        divisi:divisi_id ( id, nama ),
        asrama:asrama_id ( id, nama )
      `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        const { data: permissions } = await supabaseAdmin
            .from('user_permissions')
            .select('permission')
            .eq('user_id', userId);

        return {
            ...profile,
            dynamic_permissions: (permissions || []).map((p) => p.permission),
        };
    }

    /**
     * Complete user profile (onboarding). NIS di-generate otomatis untuk non-admin.
     * Admin tidak memerlukan NIS, asrama, atau alamat.
     */
    async completeProfile(userId, profileData) {
        // Get current profile to check role
        const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('base_role')
            .eq('id', userId)
            .single();

        const isAdmin = currentProfile?.base_role === 'admin';

        // Generate NIS hanya untuk non-admin yang punya asrama
        let nomorInduk = null;
        if (!isAdmin && profileData.asrama_id) {
            const { data: asrama } = await supabaseAdmin
                .from('asrama')
                .select('id')
                .eq('id', profileData.asrama_id)
                .single();
            nomorInduk = await this.generateNIS(asrama?.id);
        }

        const updatePayload = {
            ...(nomorInduk && { nomor_induk: nomorInduk }),
            divisi_id: profileData.divisi_id || null,
            asrama_id: isAdmin ? null : (profileData.asrama_id || null),
            alamat: isAdmin ? null : (profileData.alamat || null),
            no_hp: profileData.no_hp || null,
            base_role: currentProfile?.base_role || 'user',
            is_profile_complete: true,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { is_profile_complete: true },
        });

        if (metaError) {
            logger.warn({ userId, metaError }, 'Failed to update auth user_metadata');
        }

        logger.info({ userId, nomorInduk }, 'Profile completed');
        return data;
    }

    /**
     * Generate Nomor Induk Santri (NIS): NIS-{tahun}-{asrama}-{urutan}
     * Example: NIS-2026-01-001
     */
    async generateNIS(asramaId) {
        const year = new Date().getFullYear();

        // Asrama index (1-based, ordered by creation)
        let asramaNum = '01';
        if (asramaId) {
            const { data: asramas } = await supabaseAdmin
                .from('asrama')
                .select('id')
                .order('created_at', { ascending: true });
            const idx = (asramas || []).findIndex(a => a.id === asramaId);
            if (idx >= 0) asramaNum = String(idx + 1).padStart(2, '0');
        }

        // Sequence: count of profiles already having a NIS in the same asrama
        let seq = 1;
        if (asramaId) {
            const { count, error } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('asrama_id', asramaId)
                .not('nomor_induk', 'is', null);
            if (!error && count) seq = count + 1;
        }

        return `NIS-${year}-${asramaNum}-${String(seq).padStart(3, '0')}`;
    }

    /**
     * Get data needed for onboarding (list of divisi and asrama).
     */
    async getOnboardingData() {
        const { data: divisi, error: divisiError } = await supabaseAdmin
            .from('divisi')
            .select('id, nama')
            .order('nama');

        if (divisiError) throw divisiError;

        const { data: asrama, error: asramaError } = await supabaseAdmin
            .from('asrama')
            .select('id, nama')
            .order('nama');

        if (asramaError) throw asramaError;

        return { divisi, asrama };
    }
}
