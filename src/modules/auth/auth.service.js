import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

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

        logger.info({ userId: authData.user.id }, 'New user registered');
        return { user: authData.user, profile };
    }

    /**
     * Login with email + password.
     */
    async login({ email, password }) {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
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
        kamar:kamar_id ( id, nomor, asrama:asrama_id ( id, nama ) )
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
     * Complete user profile (onboarding).
     */
    async completeProfile(userId, profileData) {
        // Get current profile to check role
        const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('base_role')
            .eq('id', userId)
            .single();

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                nomor_induk: profileData.nomor_induk,
                divisi_id: profileData.divisi_id,
                kamar_id: profileData.kamar_id,
                alamat: profileData.alamat,
                nomor_darurat: profileData.nomor_darurat,
                base_role: currentProfile?.base_role || 'user', // Ensure role is never null
                is_profile_complete: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        logger.info({ userId }, 'Profile completed');
        return data;
    }
    /**
     * Get data needed for onboarding (list of divisi and kamar).
     */
    async getOnboardingData() {
        const { data: divisi, error: divisiError } = await supabaseAdmin
            .from('divisi')
            .select('id, nama')
            .order('nama');

        if (divisiError) throw divisiError;

        const { data: kamar, error: kamarError } = await supabaseAdmin
            .from('kamar')
            .select(`
                id,
                nomor,
                asrama:asrama_id ( nama )
            `)
            .order('nomor');

        if (kamarError) throw kamarError;

        return {
            divisi,
            kamar: kamar.map(k => ({
                id: k.id,
                label: `Kamar ${k.nomor} - ${k.asrama?.nama || 'Tanpa Asrama'}`
            }))
        };
    }
}
