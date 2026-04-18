import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';

const notificationService = new NotificationService();

export class IzinService {
    async list({ offset, limit, userId, status, reqUser, isManagement }) {
        let query = supabaseAdmin
            .from('izin_malam')
            .select('*, user:user_id(id, full_name, nomor_induk), approver:approved_by(id, full_name)', { count: 'exact' });
            
        if (userId) query = query.eq('user_id', userId);
        
        if (status) {
            const statusMap = {
                'Disetujui': 'approved',
                'Ditolak': 'rejected',
                'Menunggu': 'pending',
                'Validasi Kantor': 'approved_staf'
            };
            const mappedStatus = statusMap[status] || status;
            query = query.eq('status', mappedStatus);
        } else if (!userId && reqUser && !isManagement) {
            // Smart status filtering for LIMITED dashboard views only
            if (reqUser.dynamic_permissions?.includes('staf_kantor')) {
                query = query.eq('status', 'pending');
            } else if (reqUser.base_role === 'kepala_kamar') {
                query = query.eq('status', 'approved_staf');
            }
        }
        
        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async create(izinData) {
        const { data, error } = await supabaseAdmin.from('izin_malam').insert(izinData).select().single();
        if (error) throw error;
        logger.info({ izinId: data.id }, 'Izin malam created');
        return data;
    }

    async approve(id, user, catatan) {
        const userId = user.id;
        const role = user.base_role;
        const perms = user.dynamic_permissions || [];

        // Check current status before action
        const { data: current } = await supabaseAdmin.from('izin_malam').select('status, user_id').eq('id', id).single();
        if (!current) throw new Error('Izin tidak ditemukan');

        if (current.status !== 'pending') {
            throw new Error('Hanya izin berstatus "Menunggu" yang dapat disetujui.');
        }

        // Authorization Change: Staff or Admin can give FINAL approval directly
        if (role !== 'admin' && !perms.includes('staf_kantor')) {
            throw new Error('Hanya Staf Kantor atau Admin yang dapat memberikan persetujuan izin.');
        }

        const { data, error } = await supabaseAdmin.from('izin_malam')
            .update({ 
                status: 'approved', 
                approved_by: userId, 
                catatan_approval: catatan, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', id).select('*, user:user_id(id, full_name, kamar_id)').single();

        if (error) throw error;

        // Notif Final ke Santri
        try {
            await notificationService.create({
                userId: data.user_id,
                title: 'Izin Malam DISETUJUI! 🚀',
                message: `Pihak kantor telah memberikan izin. Selamat berkarya!`,
                type: 'success',
                link: `/dashboard/izin`
            });
        } catch (notifErr) {
            logger.error({ notifErr }, 'Notification failed');
        }

        logger.info({ izinId: id, userId }, 'Izin approved directly (single stage)');
        return data;
    }

    async reject(id, user, catatan) {
        const userId = user.id;
        const { data, error } = await supabaseAdmin.from('izin_malam')
            .update({ 
                status: 'rejected', 
                approved_by: userId, 
                catatan_approval: catatan, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', id).select('*, user:user_id(id, full_name)').single();

        if (error) throw error;

        // Notifikasi ke Santri (Alasan penolakan)
        try {
            await notificationService.create({
                userId: data.user_id,
                title: 'Izin Malam Ditolak ❌',
                message: `Mohon maaf, izin Anda ditolak. alasan: ${catatan || 'Tidak disebutkan'}.`,
                type: 'error',
                link: `/dashboard/izin`
            });
        } catch (notifErr) {
            logger.error({ notifErr }, 'Failed to send rejection notification to Student');
        }

        logger.info({ izinId: id, userId }, 'Izin rejected and student notified');
        return data;
    }
}

