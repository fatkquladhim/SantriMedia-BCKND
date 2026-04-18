import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../../modules/notifications/notifications.service.js';

const notificationService = new NotificationService();

export class TasksService {
    async list({ offset, limit, status, assignedTo, divisiId, platformId, createdBy }) {
        let query = supabaseAdmin
            .from('tasks')
            .select('*, assigned_user:assigned_to(id, full_name), creator:created_by(id, full_name), divisi:divisi_id(id, nama), platform:platform_id(id, nama)', { count: 'exact' });

        if (status) {
            const statusMap = {
                'todo': 'todo',
                'in progress': 'in_progress',
                'in_progress': 'in_progress',
                'review': 'review',
                'done': 'done',
                'cancelled': 'cancelled'
            };
            const mappedStatus = statusMap[status.toLowerCase()] || status.toLowerCase();
            query = query.eq('status', mappedStatus);
        }
        if (assignedTo) query = query.eq('assigned_to', assignedTo);

        if (divisiId) {
            if (Array.isArray(divisiId)) query = query.in('divisi_id', divisiId);
            else query = query.eq('divisi_id', divisiId);
        }

        if (platformId) {
            if (Array.isArray(platformId)) query = query.in('platform_id', platformId);
            else query = query.eq('platform_id', platformId);
        }

        if (createdBy) query = query.eq('created_by', createdBy);

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async getById(id) {
        const { data, error } = await supabaseAdmin
            .from('tasks')
            .select('*, assigned_user:assigned_to(id, full_name, email), creator:created_by(id, full_name), divisi:divisi_id(id, nama), platform:platform_id(id, nama)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async create(taskData) {
        const { data, error } = await supabaseAdmin.from('tasks').insert(taskData).select().single();
        if (error) throw error;

        // Auto-Notification if assigned to someone
        if (data.assigned_to) {
            try {
                await notificationService.create({
                    userId: data.assigned_to,
                    title: 'Tugas Baru Didelegasikan 📋',
                    message: `Ketua memberikan tugas baru: "${data.judul}". Silakan cek Task Board.`,
                    type: 'info',
                    link: '/dashboard/tasks'
                });
            } catch (notifErr) {
                logger.error({ notifErr }, 'Failed to send task delegation notification');
            }
        }

        logger.info({ taskId: data.id }, 'Task created and notification sent');
        return data;
    }

    async updateStatus(id, status, userId) {
        const update = { status, updated_at: new Date().toISOString() };
        
        // JIKA AMBIL TUGAS: Otomatis assign ke user yang mengambil
        if (status === 'in_progress') {
            const { data: currentTask } = await supabaseAdmin.from('tasks').select('assigned_to').eq('id', id).single();
            if (currentTask && !currentTask.assigned_to) {
                update.assigned_to = userId;
            }
        }

        if (status === 'done') {
            update.completed_at = new Date().toISOString();
            
            // LOGIKA POIN: Ambil data tugas terlebih dahulu
            const { data: task, error: getError } = await supabaseAdmin
                .from('tasks')
                .select('assigned_to, poin')
                .eq('id', id)
                .single();
            
            if (!getError && task && task.assigned_to) {
                // Tambah poin ke profil user
                const { error: pError } = await supabaseAdmin.rpc('increment_user_points', {
                    user_id: task.assigned_to,
                    points_to_add: task.poin || 10
                });

                // Jika rpc belum ada, gunakan update manual (fallback)
                if (pError) {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('total_poin')
                        .eq('id', task.assigned_to)
                        .single();
                    
                    if (profile) {
                        await supabaseAdmin
                            .from('profiles')
                            .update({ total_poin: (profile.total_poin || 0) + (task.poin || 10) })
                            .eq('id', task.assigned_to);
                    }
                }
                logger.info({ userId: task.assigned_to, points: task.poin }, 'Points credited to user');
            }
        }

        const { data, error } = await supabaseAdmin.from('tasks').update(update).eq('id', id).select('*, assigned_user:assigned_to(full_name)').single();
        if (error) throw error;

        // Notify user if status is done (Reward)
        if (status === 'done' && data.assigned_to) {
            try {
                await notificationService.create({
                    userId: data.assigned_to,
                    title: 'Tugas Diverifikasi! 🌟',
                    message: `Kerja bagus! Tugas "${data.judul}" telah disetujui. Kamu mendapatkan poin XP!`,
                    type: 'success',
                    link: '/dashboard/tasks'
                });
            } catch (err) { logger.error(err); }
        }

        logger.info({ taskId: id, status, userId }, 'Task status updated');
        return data;
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin
            .from('tasks')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async submitEvidence(id, evidenceUrl, userId) {
        const { data, error } = await supabaseAdmin
            .from('tasks')
            .update({ evidence_url: evidenceUrl, status: 'review', updated_at: new Date().toISOString() })
            .eq('id', id).eq('assigned_to', userId).select().single();
        if (error) throw error;
        return data;
    }
}
