import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';

const notificationService = new NotificationService();

export class InventarisService {
    async listAlat({ offset, limit, kategori, isAvailable }) {
        let query = supabaseAdmin.from('inventaris_alat').select('*', { count: 'exact' });
        if (kategori) query = query.eq('kategori', kategori);
        if (isAvailable !== undefined) query = query.eq('is_available', isAvailable);
        const { data, count, error } = await query.order('nama').range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async createAlat(alatData) {
        const { data, error } = await supabaseAdmin.from('inventaris_alat').insert(alatData).select().single();
        if (error) throw error;
        return data;
    }

    async updateAlat(id, updateData) {
        const { data, error } = await supabaseAdmin.from('inventaris_alat')
            .update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteAlat(id) {
        const { error } = await supabaseAdmin.from('inventaris_alat').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async listPeminjaman({ offset, limit, userId, status }) {
        let query = supabaseAdmin.from('peminjaman_alat')
            .select('*, alat:alat_id(id, nama, kategori), user:user_id(id, full_name), approver:approved_by(id, full_name)', { count: 'exact' });
        if (userId) query = query.eq('user_id', userId);
        if (status) query = query.eq('status', status);
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async requestBorrow(borrowData) {
        const { data, error } = await supabaseAdmin.from('peminjaman_alat').insert(borrowData).select('*, alat:alat_id(nama)').single();
        if (error) throw error;

        // Notify Staff
        try {
            // Find staff users (logic simplified: send to admin/staff users)
            // For now, we rely on the client-side list, but ideally, we find the exact staff
            // For MVP, we can notify 'admins' or just log it. 
            // Better: We notify all users with 'staf_alat' permission.
            const { data: staffMembers } = await supabaseAdmin.from('dynamic_permissions').select('user_id').eq('permission', 'staf_alat');
            if (staffMembers) {
                for (const staff of staffMembers) {
                    await notificationService.create({
                        userId: staff.user_id,
                        title: 'Permohonan Pinjam Alat 🛠️',
                        message: `Ada permohonan baru untuk: ${data.alat.nama}. Mohon cek gudang.`,
                        type: 'info',
                        link: '/dashboard/admin/inventaris'
                    });
                }
            }
        } catch (notifErr) {
            logger.error({ notifErr }, 'Failed to notify staff about borrow request');
        }

        logger.info({ pinjamanId: data.id }, 'Borrow request created');
        return data;
    }

    async approveBorrow(id, approvedBy) {
        const { data: pinjaman } = await supabaseAdmin.from('peminjaman_alat').select('alat_id, user_id, alat:alat_id(nama)').eq('id', id).single();
        await supabaseAdmin.from('inventaris_alat').update({ is_available: false }).eq('id', pinjaman.alat_id);
        const { data, error } = await supabaseAdmin.from('peminjaman_alat')
            .update({ status: 'approved', approved_by: approvedBy, updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;

        // Notify Student
        try {
            await notificationService.create({
                userId: pinjaman.user_id,
                title: 'Alat Siap Diambil! ✅',
                message: `Peminjaman "${pinjaman.alat.nama}" disetujui. Silakan ambil di gudang alat.`,
                type: 'success',
                link: '/dashboard/inventaris'
            });
        } catch (err) { logger.error(err); }

        return data;
    }

    async rejectBorrow(id, approvedBy, catatan) {
        const { data: pinjaman } = await supabaseAdmin.from('peminjaman_alat').select('user_id, alat:alat_id(nama)').eq('id', id).single();
        const { data, error } = await supabaseAdmin.from('peminjaman_alat')
            .update({ status: 'rejected', approved_by: approvedBy, catatan, updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;

        // Notify Student
        try {
            await notificationService.create({
                userId: pinjaman.user_id,
                title: 'Peminjaman Ditolak ⚠️',
                message: `Maaf, peminjaman ${pinjaman.alat.nama} belum bisa disetujui. alasan: ${catatan || '-'}`,
                type: 'error',
                link: '/dashboard/inventaris'
            });
        } catch (err) { logger.error(err); }

        return data;
    }

    async returnItem(id) {
        const { data: pinjaman } = await supabaseAdmin.from('peminjaman_alat').select('alat_id, user_id, alat:alat_id(nama)').eq('id', id).single();
        await supabaseAdmin.from('inventaris_alat').update({ is_available: true }).eq('id', pinjaman.alat_id);
        const { data, error } = await supabaseAdmin.from('peminjaman_alat')
            .update({ status: 'dikembalikan', actual_kembali: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;

        // Notify Student (Acknowledgment)
        try {
            await notificationService.create({
                userId: pinjaman.user_id,
                title: 'Alat Dikembalikan 📦',
                message: `Terima kasih telah mengembalikan ${pinjaman.alat.nama} tepat waktu.`,
                type: 'info',
                link: '/dashboard/inventaris'
            });
        } catch (err) { logger.error(err); }

        return data;
    }

    async stokOpname() {
        const { data, error } = await supabaseAdmin.from('inventaris_alat').select('*').order('kategori');
        if (error) throw error;
        return data;
    }
}
