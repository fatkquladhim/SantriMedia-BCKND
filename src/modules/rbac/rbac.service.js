import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';

const notificationService = new NotificationService();

export class RbacService {
    async getUserPermissions(userId) {
        const { data, error } = await supabaseAdmin
            .from('user_permissions')
            .select(`
                *,
                granted_by_profile:granted_by(full_name),
                divisi:divisi_id(id, nama),
                platform:platform_id(id, nama)
            `)
            .eq('user_id', userId);
        if (error) throw error;

        // Post-process to clarify which target it belongs to
        return data.map(p => ({
            ...p,
            target_id: p.divisi_id || p.platform_id || null,
            target_name: p.divisi?.nama || p.platform?.nama || null
        }));
    }

    async grantPermission(userId, permission, grantedBy, targetId = null) {
        const divisiId = permission === 'ketua_divisi' ? targetId : null;
        const platformId = permission === 'ketua_platform' ? targetId : null;

        // 1. Check if this exact permission already exists
        let query = supabaseAdmin
            .from('user_permissions')
            .select('*')
            .eq('user_id', userId)
            .eq('permission', permission);

        if (divisiId) query = query.eq('divisi_id', divisiId);
        else query = query.is('divisi_id', null);

        if (platformId) query = query.eq('platform_id', platformId);
        else query = query.is('platform_id', null);

        const { data: existing, error: findError } = await query.maybeSingle();
        if (findError) throw findError;

        if (existing) {
            logger.info({ userId, permission, targetId }, 'Permission already exists, skipped insert');
            return existing;
        }

        // 2. Insert new permission
        const { data, error } = await supabaseAdmin
            .from('user_permissions')
            .insert({
                user_id: userId,
                permission,
                granted_by: grantedBy,
                granted_at: new Date().toISOString(),
                divisi_id: divisiId,
                platform_id: platformId
            })
            .select()
            .single();

        if (error) throw error;

        // Notify User
        try {
            const formattedPerm = permission.replace('_', ' ').toUpperCase();
            await notificationService.create({
                userId,
                title: 'Akses Baru Diberikan! 🛡️',
                message: `Admin telah memberikan Anda izin sebagai: ${formattedPerm}.`,
                type: 'info',
                link: '/dashboard/profile'
            });
        } catch (err) { logger.error(err); }

        logger.info({ userId, permission, targetId, grantedBy }, 'Permission granted (inserted)');
        return data;
    }

    async revokePermission(userId, permission, targetId = null) {
        let query = supabaseAdmin
            .from('user_permissions')
            .delete()
            .eq('user_id', userId)
            .eq('permission', permission);

        if (targetId) {
            if (permission === 'ketua_divisi') query = query.eq('divisi_id', targetId);
            if (permission === 'ketua_platform') query = query.eq('platform_id', targetId);
        } else {
            query = query.is('divisi_id', null).is('platform_id', null);
        }

        const { error } = await query;
        if (error) throw error;
        logger.info({ userId, permission, targetId }, 'Permission revoked');
    }

    async setBaseRole(userId, role) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ base_role: role, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        if (error) throw error;

        // Notify User
        try {
            await notificationService.create({
                userId,
                title: 'Perubahan Role Akun 👤',
                message: `Status akun Anda kini telah diperbarui menjadi: ${role.toUpperCase()}.`,
                type: 'info',
                link: '/dashboard/profile'
            });
        } catch (err) { logger.error(err); }

        logger.info({ userId, role }, 'Base role updated');
        return data;
    }

    async getWhitelist() {
        const { data, error } = await supabaseAdmin
            .from('allowed_registrations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async addToWhitelist(email) {
        const { data, error } = await supabaseAdmin
            .from('allowed_registrations')
            .insert({ email })
            .select()
            .single();
        if (error) throw error;
        logger.info({ email }, 'Email added to whitelist');
        return data;
    }

    async removeFromWhitelist(email) {
        const { error } = await supabaseAdmin
            .from('allowed_registrations')
            .delete()
            .eq('email', email);
        if (error) throw error;
        logger.info({ email }, 'Email removed from whitelist');
    }
}
