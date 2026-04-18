import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

export class EvaluasiService {
    async list({ offset, limit, santriId, bulan, kepalaKamarId }) {
        let query = supabaseAdmin.from('evaluasi_asrama')
            .select('*, santri:santri_id(id, full_name), kepala_kamar:kepala_asrama_id(id, full_name)', { count: 'exact' });
        if (santriId) query = query.eq('santri_id', santriId);
        if (bulan) query = query.eq('bulan_evaluasi', bulan);
        if (kepalaKamarId) query = query.eq('kepala_asrama_id', kepalaKamarId);
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async create(evaluasiData) {
        const { data, error } = await supabaseAdmin.from('evaluasi_asrama').insert(evaluasiData).select().single();
        if (error) throw error;
        logger.info({ evaluasiId: data.id }, 'Evaluasi created');
        return data;
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin.from('evaluasi_asrama')
            .update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
}
