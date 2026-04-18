import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

export class GradingService {
    async list({ offset, limit, periode, isPublished }) {
        let query = supabaseAdmin.from('grade_history')
            .select('*, user:user_id(id, full_name, nomor_induk), publisher:published_by(id, full_name)', { count: 'exact' });
        if (periode) query = query.eq('periode', periode);
        if (isPublished !== undefined) query = query.eq('is_published', isPublished);
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async getByUser(userId, periode) {
        let query = supabaseAdmin.from('grade_history').select('*').eq('user_id', userId);
        if (periode) query = query.eq('periode', periode);
        const { data, error } = await query.order('periode', { ascending: false });
        if (error) throw error;
        return data;
    }

    async upsert(gradeData) {
        const { data, error } = await supabaseAdmin.from('grade_history')
            .upsert(gradeData, { onConflict: 'user_id,periode' }).select().single();
        if (error) throw error;
        logger.info({ gradeId: data.id }, 'Grade upserted');
        return data;
    }

    async publish(id, publishedBy) {
        const { data, error } = await supabaseAdmin.from('grade_history')
            .update({ is_published: true, published_by: publishedBy, published_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;
        logger.info({ gradeId: id }, 'Grade published');
        return data;
    }
}
