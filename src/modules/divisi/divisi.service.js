import { supabaseAdmin } from '../../config/supabase.js';

export class DivisiService {
    async list() {
        const { data, error } = await supabaseAdmin.from('divisi').select('*').order('nama');
        if (error) throw error;
        return data;
    }

    async getById(id) {
        const { data, error } = await supabaseAdmin.from('divisi')
            .select('*, platforms:platform(id, nama)').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async create(divisiData) {
        const { nama, deskripsi } = divisiData;
        const { data, error } = await supabaseAdmin.from('divisi').insert({ nama, deskripsi }).select().single();
        if (error) throw error;
        return data;
    }

    async update(id, updateData) {
        const { nama, deskripsi } = updateData;
        const { data, error } = await supabaseAdmin.from('divisi').update({ nama, deskripsi }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabaseAdmin.from('divisi').delete().eq('id', id);
        if (error) throw error;
    }
}
