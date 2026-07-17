import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

export class UsersService {
    async list({ page, limit, offset, search, role, divisiId }) {
        let query = supabaseAdmin
            .from('profiles')
            .select('*, divisi:divisi_id(id, nama), user_permissions:user_permissions!user_permissions_user_id_fkey(permission)', { count: 'exact' });

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,nomor_induk.ilike.%${search}%`);
        }
        if (role) {
            query = query.eq('base_role', role);
        }
        if (divisiId) {
            query = query.eq('divisi_id', divisiId);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { data, total: count };
    }

    async getById(id) {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select(`
        *,
        divisi:divisi_id ( id, nama ),
        asrama:asrama_id ( id, nama )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;

        const { data: permissions } = await supabaseAdmin
            .from('user_permissions')
            .select('permission, granted_by, granted_at')
            .eq('user_id', id);

        return { ...profile, dynamic_permissions: permissions || [] };
    }

    async create(userData) {
        const { email, password, full_name, base_role, divisi_id, asrama_id } = userData;

        // 0. Auto-whitelist the email to bypass database triggers
        await supabaseAdmin
            .from('allowed_registrations')
            .upsert({ email })
            .select();

        // 1. Create User in Auth with metadata (important for triggers)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { 
                full_name, 
                fullName: full_name,
                email, // Added for triggers that might need it
                nomor_induk: `STF-${Date.now()}`
            }
        });
        if (authError) throw authError;

        // 2. Upsert Profile (to avoid conflict with automatic DB triggers)
        const { data: profile, error: profError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                full_name,
                email, // Added to satisfy NOT NULL constraint
                base_role: base_role || 'user',
                divisi_id: divisi_id || null,
                asrama_id: asrama_id || null,
                is_profile_complete: true
            })
            .select()
            .single();

        if (profError) throw profError;
        return profile;
    }

    async remove(id) {
        // Nullify all nullable FK references before profile deletion
        const nullifyOps = [
            supabaseAdmin.from('user_permissions').update({ granted_by: null }).eq('granted_by', id),
            supabaseAdmin.from('tasks').update({ assigned_to: null }).eq('assigned_to', id),
            supabaseAdmin.from('izin_malam').update({ approved_by: null }).eq('approved_by', id),
            supabaseAdmin.from('peminjaman_alat').update({ approved_by: null }).eq('approved_by', id),
            supabaseAdmin.from('evaluasi_asrama').update({ kepala_asrama_id: null }).eq('kepala_asrama_id', id),
            supabaseAdmin.from('notifications').update({ published_by: null }).eq('published_by', id),
            supabaseAdmin.from('kamar').update({ kepala_kamar_id: null }).eq('kepala_kamar_id', id),
        ];
        await Promise.all(nullifyOps.map(o => o));

        // Delete owned records with non-nullable FKs
        const deleteOps = [
            supabaseAdmin.from('tasks').delete().eq('created_by', id),
            supabaseAdmin.from('izin_malam').delete().eq('user_id', id),
            supabaseAdmin.from('peminjaman_alat').delete().eq('user_id', id),
            supabaseAdmin.from('evaluasi_asrama').delete().eq('santri_id', id),
            supabaseAdmin.from('notifications').delete().eq('user_id', id),
            supabaseAdmin.from('grade_history').delete().eq('user_id', id),
        ];
        await Promise.all(deleteOps.map(o => o));

        // Delete profile (cascades to user_permissions.user_id)
        const { error: profError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);
        if (profError) throw profError;

        // Delete auth user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        logger.info({ userId: id }, 'User deleted');
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Sync is_profile_complete to auth user_metadata so JWT claim refreshes
        if (updateData.is_profile_complete) {
            const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                user_metadata: { is_profile_complete: true },
            });
            if (metaError) {
                logger.warn({ id, metaError }, 'Failed to update auth user_metadata');
            }
        }

        logger.info({ userId: id }, 'Profile updated');
        return data;
    }
}
