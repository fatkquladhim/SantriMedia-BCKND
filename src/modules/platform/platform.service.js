import { supabaseAdmin } from '../../config/supabase.js';

export class PlatformService {
    async list(divisiId) {
        let query = supabaseAdmin.from('platform').select('*, divisi:divisi_id(id, nama)');
        if (divisiId) query = query.eq('divisi_id', divisiId);
        const { data, error } = await query.order('nama');
        if (error) throw error;
        return data;
    }

    async create(platformData) {
        const { data, error } = await supabaseAdmin.from('platform').insert(platformData).select().single();
        if (error) throw error;
        return data;
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin.from('platform').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabaseAdmin.from('platform').delete().eq('id', id);
        if (error) throw error;
    }
}
