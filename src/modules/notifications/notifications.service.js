import { supabaseAdmin } from '../../config/supabase.js';

export class NotificationService {
    async list(userId, { offset, limit, isRead } = {}) {
        let query = supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (isRead !== undefined) {
            query = query.eq('is_read', isRead === 'true' || isRead === true);
        }

        if (offset !== undefined && limit !== undefined) {
            query = query.range(offset, offset + limit - 1);
        }

        const { data, count, error } = await query;
        if (error) throw error;
        return { data, total: count };
    }

    async create({ userId, title, message, type = 'info', link }) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                link,
                is_read: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async markAsRead(id, userId) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async markAllAsRead(userId) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .select();

        if (error) throw error;
        return data;
    }
}
