import { supabaseAdmin } from '../../config/supabase.js';

export class AsramaService {
    async list() {
        const { data, error } = await supabaseAdmin
            .from('asrama')
            .select('*, kamar:kamar(id, nomor)')
            .order('nama');
        if (error) throw error;
        return data;
    }

    async listAllKamar() {
        const { data, error } = await supabaseAdmin
            .from('kamar')
            .select('*, asrama:asrama_id(nama)')
            .order('nomor');
        if (error) throw error;
        return data.map(k => ({
            id: k.id,
            nomor: k.nomor,
            asrama_nama: k.asrama?.nama,
            label: `${k.asrama?.nama} - Kamar ${k.nomor}`
        }));
    }

    async getById(id) {
        const { data, error } = await supabaseAdmin
            .from('asrama')
            .select('*, kamar:kamar(id, nomor, kapasitas, kepala_kamar:kepala_kamar_id(id, full_name))')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async create(asramaData) {
        const { data, error } = await supabaseAdmin.from('asrama').insert(asramaData).select().single();
        if (error) throw error;
        return data;
    }

    async update(id, updateData) {
        const { data, error } = await supabaseAdmin.from('asrama').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabaseAdmin.from('asrama').delete().eq('id', id);
        if (error) throw error;
    }

    // Kamar Management
    async addKamar(asramaId, kamarData) {
        const { data, error } = await supabaseAdmin
            .from('kamar')
            .insert({ ...kamarData, asrama_id: asramaId })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateKamar(kamarId, updateData) {
        const { data, error } = await supabaseAdmin
            .from('kamar')
            .update(updateData)
            .eq('id', kamarId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteKamar(kamarId) {
        const { error } = await supabaseAdmin.from('kamar').delete().eq('id', kamarId);
        if (error) throw error;
    }
}
