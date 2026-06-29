import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { auditRbac, auditData, auditAdmin } from '../../shared/audit.js';

const notificationService = new NotificationService();

export class RbacService {
    async getUserPermissions(userId) {
        const { data, error } = await supabaseAdmin
            .from('user_permissions')
            .select(`
                *,
                granted_by_profile:granted_by(full_name)
            `)
            .eq('user_id', userId);
        if (error) throw error;

        // Fetch all divisi and platforms to map names in memory
        const { data: divisi } = await supabaseAdmin.from('divisi').select('id, nama');
        const { data: platform } = await supabaseAdmin.from('platform').select('id, nama');

        const divisiMap = new Map((divisi || []).map(d => [d.id, d.nama]));
        const platformMap = new Map((platform || []).map(p => [p.id, p.nama]));

        // Post-process to clarify which target it belongs to
        return data.map(p => {
            let targetName = null;
            if (p.permission === 'ketua_divisi') {
                targetName = divisiMap.get(p.target_id) || null;
            } else if (p.permission === 'ketua_platform') {
                targetName = platformMap.get(p.target_id) || null;
            }
            return {
                ...p,
                target_name: targetName
            };
        });
    }

    async grantPermission(userId, permission, grantedBy, targetId = null) {
        // 1. Check if this exact permission already exists
        let query = supabaseAdmin
            .from('user_permissions')
            .select('*')
            .eq('user_id', userId)
            .eq('permission', permission);

        if (targetId) {
            query = query.eq('target_id', targetId);
        } else {
            query = query.is('target_id', null);
        }

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
                target_id: targetId,
                granted_by: grantedBy,
                granted_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await auditRbac.grant_permission(grantedBy, 'admin', userId, permission, targetId);

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

    async revokePermission(userId, permission, targetId = null, revokedBy) {
        let query = supabaseAdmin
            .from('user_permissions')
            .delete()
            .eq('user_id', userId)
            .eq('permission', permission);

        if (targetId) {
            query = query.eq('target_id', targetId);
        } else {
            query = query.is('target_id', null);
        }

        const { error } = await query;
        if (error) throw error;

        // Audit log
        await auditRbac.revoke_permission(revokedBy, 'admin', userId, permission, targetId);

        logger.info({ userId, permission, targetId }, 'Permission revoked');
    }

    async setBaseRole(userId, role, changedBy) {
        // Get old role for audit
        const { data: current } = await supabaseAdmin
            .from('profiles')
            .select('base_role')
            .eq('id', userId)
            .single();

        const oldRole = current?.base_role || 'user';

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ base_role: role, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        if (error) throw error;

        // Audit log
        await auditRbac.change_role(changedBy, 'admin', userId, oldRole, role);

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
