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
        kamar:kamar_id ( id, nomor, asrama:asrama_id ( id, nama ) )
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
        const { email, password, full_name, base_role, divisi_id, kamar_id } = userData;

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
                kamar_id: kamar_id || null,
                is_profile_complete: true
            })
            .select()
            .single();

        if (profError) throw profError;
        return profile;
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        logger.info({ userId: id }, 'Profile updated');
        return data;
    }
}
