import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { NotFoundError } from '../../shared/errors.js';

const notificationService = new NotificationService();

const PROFIL_SINGLE_ID = '00000000-0000-0000-0000-000000000001';

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function daysBetween(fromStr, toStr) {
    const from = new Date(`${fromStr}T00:00:00Z`);
    const to = new Date(`${toStr}T00:00:00Z`);
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format today as YYYY-MM-DD in local time (stable for cron/scan). */
function localDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export class StaffAlatService {
    // ============================================================
    // Profil & Kas
    // ============================================================

    async getProfil() {
        const { data, error } = await supabaseAdmin
            .from('staff_alat_profil')
            .select('*')
            .eq('id', PROFIL_SINGLE_ID)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                const { data: created, error: createError } = await supabaseAdmin
                    .from('staff_alat_profil')
                    .insert({ id: PROFIL_SINGLE_ID })
                    .select()
                    .single();
                if (createError) throw createError;
                return created;
            }
            throw error;
        }
        return data;
    }

    async updateProfil(updateData, userId) {
        const { data, error } = await supabaseAdmin
            .from('staff_alat_profil')
            .update({ ...updateData, updated_by: userId, updated_at: new Date().toISOString() })
            .eq('id', PROFIL_SINGLE_ID)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /** Recompute saldo kas dari seluruh transaksi (recovery dari drift). */
    async recomputeUangAlat() {
        const { data: sewaList, error } = await supabaseAdmin
            .from('sewa_alat')
            .select('harga_sewa, status, jenis')
            .eq('status', 'Lunas')
            .neq('jenis', 'Peminjaman');
        if (error) throw error;

        const total = (sewaList || []).reduce((sum, s) => sum + (Number(s.harga_sewa) || 0), 0);
        await supabaseAdmin
            .from('staff_alat_profil')
            .update({ uang_alat: total, updated_at: new Date().toISOString() })
            .eq('id', PROFIL_SINGLE_ID);
        return total;
    }

    // ============================================================
    // Harga Sewa (Tarif)
    // ============================================================

    async listHargaSewa({ offset, limit, kategori }) {
        let query = supabaseAdmin.from('harga_sewa_alat').select('*', { count: 'exact' });
        if (kategori) query = query.eq('kategori', kategori);
        const { data, count, error } = await query
            .order('nama_alat', { ascending: true })
            .range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async createHargaSewa(hargaData) {
        const { data, error } = await supabaseAdmin
            .from('harga_sewa_alat')
            .insert({
                nama_alat: hargaData.nama_alat,
                kategori: hargaData.kategori || 'Umum',
                jumlah: hargaData.jumlah || 1,
                harga: hargaData.harga,
                alat_id: hargaData.alat_id || null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateHargaSewa(id, updateData) {
        const { data, error } = await supabaseAdmin
            .from('harga_sewa_alat')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteHargaSewa(id) {
        const { error } = await supabaseAdmin.from('harga_sewa_alat').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    /** Cari tarif: prioritas alat_id match, fallback nama_alat, fallback kategori. */
    async findPrice(alat, kategori) {
        if (!alat) return null;
        let { data, error } = await supabaseAdmin
            .from('harga_sewa_alat')
            .select('*')
            .eq('alat_id', alat.id)
            .eq('kategori', kategori)
            .limit(1);
        if (error) throw error;
        if (data && data.length > 0) return data[0];

        ({ data, error } = await supabaseAdmin
            .from('harga_sewa_alat')
            .select('*')
            .eq('nama_alat', alat.nama)
            .eq('kategori', kategori)
            .limit(1));
        if (error) throw error;
        if (data && data.length > 0) return data[0];

        ({ data, error } = await supabaseAdmin
            .from('harga_sewa_alat')
            .select('*')
            .eq('nama_alat', alat.nama)
            .limit(1));
        if (error) throw error;
        if (data && data.length > 0) return data[0];

        return null;
    }

    // ============================================================
    // Sewa / Peminjaman
    // ============================================================

    async listSewa({ offset, limit, status, statusPengembalian, jenis, search }) {
        let query = supabaseAdmin.from('sewa_alat')
            .select('*, items:sewa_alat_items(*, alat:alat_id(id, nama, gambar, kategori, kondisi, jumlah))', { count: 'exact' });
        if (status) query = query.eq('status', status);
        if (statusPengembalian) query = query.eq('status_pengembalian', statusPengembalian);
        if (jenis) query = query.eq('jenis', jenis);
        if (search) query = query.ilike('nama_penyewa', `%${search}%`);
        const { data, count, error } = await query
            .order('tanggal_penyewaan', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;
        return { data, total: count };
    }

    async getSewaById(id) {
        const { data, error } = await supabaseAdmin
            .from('sewa_alat')
            .select('*, items:sewa_alat_items(*, alat:alat_id(id, nama, gambar, kategori, kondisi, jumlah))')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) throw new NotFoundError('Transaksi sewa');
        return data;
    }

    /**
     * Hitung harga_satuan per item dari tarif (auto-fill) + total header.
     * @param {Array} items — [{ alat_id, jumlah, harga_satuan? }]
     * @param {string} kategori — 'Umum' | 'Paket Santri'
     * @param {string} jenis — 'Penyewaan' | 'Peminjaman'
     */
    async resolveItemPrices(items, kategori, jenis) {
        const alatIds = items.map((i) => i.alat_id);
        const { data: alatList, error } = await supabaseAdmin
            .from('inventaris_alat')
            .select('id, nama, kategori, kondisi, jumlah')
            .in('id', alatIds);
        if (error) throw error;

        const alatMap = new Map((alatList || []).map((a) => [a.id, a]));

        const resolved = [];
        let total = 0;
        for (const item of items) {
            const alat = alatMap.get(item.alat_id);
            const qty = Number(item.jumlah) || 1;

            let unitPrice = 0;
            if (jenis === 'Penyewaan') {
                const price = await this.findPrice(alat, kategori);
                unitPrice = price ? Number(price.harga) : 0;
            }
            if (item.harga_satuan !== undefined && item.harga_satuan !== null && Number(item.harga_satuan) > 0) {
                unitPrice = Number(item.harga_satuan);
            }

            resolved.push({
                alat_id: item.alat_id,
                nama_alat: alat ? alat.nama : null,
                jumlah: qty,
                harga_satuan: unitPrice,
            });
            total += unitPrice * qty;
        }
        return { resolved, total };
    }

    async createSewa(payload, userId) {
        const { resolved, total } = await this.resolveItemPrices(
            payload.items,
            payload.kategori || 'Umum',
            payload.jenis || 'Penyewaan'
        );

        const header = {
            nama_penyewa: payload.nama_penyewa,
            jenis: payload.jenis || 'Penyewaan',
            kategori: payload.kategori || 'Umum',
            tanggal_penyewaan: payload.tanggal_penyewaan,
            tanggal_pengembalian: payload.tanggal_pengembalian,
            harga_sewa: payload.harga_sewa !== undefined && payload.harga_sewa !== null
                ? payload.harga_sewa
                : total,
            status: payload.status || 'Belum Lunas',
            status_pengembalian: payload.status_pengembalian || 'Belum Mengembalikan',
            catatan: payload.catatan || null,
            jaminan: payload.jaminan || null,
            created_by: userId,
        };

        const { data: sewa, error: headerError } = await supabaseAdmin
            .from('sewa_alat')
            .insert(header)
            .select()
            .single();
        if (headerError) throw headerError;

        const itemsPayload = resolved.map((r) => ({ sewa_id: sewa.id, ...r }));
        const { error: itemsError } = await supabaseAdmin
            .from('sewa_alat_items')
            .insert(itemsPayload);
        if (itemsError) {
            await supabaseAdmin.from('sewa_alat').delete().eq('id', sewa.id);
            throw itemsError;
        }

        // Kas idempoten: jika langsung dibuat Lunas (Penyewaan), tambah saldo
        if (header.status === 'Lunas' && header.jenis !== 'Peminjaman' && header.harga_sewa > 0) {
            await this.addToUangAlat(header.harga_sewa);
        }

        await this.notifyDeadlineForSewa(sewa);
        return this.getSewaById(sewa.id);
    }

    async updateSewa(id, payload, userId) {
        const existing = await this.getSewaById(id);

        const prevLunas = existing.status === 'Lunas';
        const nextLunas = (payload.status ?? existing.status) === 'Lunas';
        const prevHarga = Number(existing.harga_sewa) || 0;
        const nextHarga = payload.harga_sewa !== undefined && payload.harga_sewa !== null
            ? Number(payload.harga_sewa)
            : prevHarga;
        const jenis = payload.jenis ?? existing.jenis;

        let resolved = existing.items || [];
        let total = prevHarga;
        if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
            const result = await this.resolveItemPrices(
                payload.items,
                payload.kategori ?? existing.kategori,
                jenis
            );
            resolved = result.resolved;
            total = result.total;
        }

        const updateData = {
            ...(payload.nama_penyewa !== undefined && { nama_penyewa: payload.nama_penyewa }),
            ...(payload.jenis !== undefined && { jenis: payload.jenis }),
            ...(payload.kategori !== undefined && { kategori: payload.kategori }),
            ...(payload.tanggal_penyewaan !== undefined && { tanggal_penyewaan: payload.tanggal_penyewaan }),
            ...(payload.tanggal_pengembalian !== undefined && { tanggal_pengembalian: payload.tanggal_pengembalian }),
            ...(payload.catatan !== undefined && { catatan: payload.catatan || null }),
            ...(payload.jaminan !== undefined && { jaminan: payload.jaminan || null }),
            ...(payload.status !== undefined && { status: payload.status }),
            ...(payload.status_pengembalian !== undefined && { status_pengembalian: payload.status_pengembalian }),
            harga_sewa: payload.harga_sewa !== undefined && payload.harga_sewa !== null ? payload.harga_sewa : total,
            updated_at: new Date().toISOString(),
        };
        updateData.updated_by = userId;

        // Kas: reversal/penambahan hanya terjadi saat transisi status 'Lunas'
        if (!prevLunas && nextLunas && jenis !== 'Peminjaman') {
            await this.addToUangAlat(nextHarga);
        } else if (prevLunas && !nextLunas && existing.jenis !== 'Peminjaman') {
            await this.subtractFromUangAlat(prevHarga);
        } else if (prevLunas && nextLunas && existing.jenis !== 'Peminjaman' && jenis !== 'Peminjaman' && nextHarga !== prevHarga) {
            // Tetap Lunas tapi harga berubah — selisih
            const delta = nextHarga - prevHarga;
            if (delta > 0) await this.addToUangAlat(delta);
            else await this.subtractFromUangAlat(Math.abs(delta));
        }

        const { data: updated, error } = await supabaseAdmin
            .from('sewa_alat')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
            const { error: delError } = await supabaseAdmin
                .from('sewa_alat_items')
                .delete()
                .eq('sewa_id', id);
            if (delError) throw delError;

            const itemsPayload = resolved.map((r) => ({ sewa_id: id, ...r }));
            const { error: insError } = await supabaseAdmin
                .from('sewa_alat_items')
                .insert(itemsPayload);
            if (insError) throw insError;
        }

        await this.notifyDeadlineForSewa(updated);
        return this.getSewaById(id);
    }

    async deleteSewa(id) {
        const existing = await this.getSewaById(id);
        const { error } = await supabaseAdmin.from('sewa_alat').delete().eq('id', id);
        if (error) throw error;

        // Reversal kas jika transaksi yang dihapus berstatus Lunas (Penyewaan)
        if (existing.status === 'Lunas' && existing.jenis !== 'Peminjaman' && Number(existing.harga_sewa) > 0) {
            await this.subtractFromUangAlat(Number(existing.harga_sewa));
        }
        return true;
    }

    /** Update status pembayaran (PATCH /sewa/:id/status) — idempoten kas. */
    async updateSewaStatus(id, newStatus, userId) {
        const existing = await this.getSewaById(id);

        const prevLunas = existing.status === 'Lunas';
        const nextLunas = newStatus === 'Lunas';
        const harga = Number(existing.harga_sewa) || 0;

        if (!prevLunas && nextLunas && existing.jenis !== 'Peminjaman' && harga > 0) {
            await this.addToUangAlat(harga);
        } else if (prevLunas && !nextLunas && existing.jenis !== 'Peminjaman' && harga > 0) {
            await this.subtractFromUangAlat(harga);
        }

        const { data, error } = await supabaseAdmin
            .from('sewa_alat')
            .update({ status: newStatus, updated_at: new Date().toISOString(), updated_by: userId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /** Update status pengembalian (PATCH /sewa/:id/return). */
    async updateSewaReturnStatus(id, newStatus, userId) {
        const { data, error } = await supabaseAdmin
            .from('sewa_alat')
            .update({ status_pengembalian: newStatus, updated_at: new Date().toISOString(), updated_by: userId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============================================================
    // Kas helpers (idempoten, read-modify-write)
    // ============================================================

    async getUangAlat() {
        const profil = await this.getProfil();
        return Number(profil.uang_alat) || 0;
    }

    async setUangAlat(value) {
        const safeValue = Math.max(0, Number(value) || 0);
        const { data, error } = await supabaseAdmin
            .from('staff_alat_profil')
            .update({ uang_alat: safeValue, updated_at: new Date().toISOString() })
            .eq('id', PROFIL_SINGLE_ID)
            .select()
            .single();
        if (error) throw error;
        return Number(data.uang_alat);
    }

    async addToUangAlat(amount) {
        const current = await this.getUangAlat();
        return this.setUangAlat(current + Number(amount));
    }

    async subtractFromUangAlat(amount) {
        const current = await this.getUangAlat();
        return this.setUangAlat(current - Number(amount));
    }

    /** Endpoint manual admin: POST /sewa/:id/kas { amount } — adjust saldo. */
    async adjustUangAlat(amount) {
        return this.addToUangAlat(amount);
    }

    // ============================================================
    // Notifikasi deadline
    // ============================================================

    /** Notifikasi ke semua user staf_alat untuk transaksi dengan deadline <= 1 hari. */
    async notifyDeadlineForSewa(sewa) {
        try {
            if (sewa.status_pengembalian === 'Sudah Mengembalikan') return;
            const daysLeft = daysBetween(todayStr(), sewa.tanggal_pengembalian);
            if (daysLeft > 1) return;

            const { data: staffUsers } = await supabaseAdmin
                .from('user_permissions')
                .select('user_id')
                .eq('permission', 'staf_alat');
            const userIds = [...new Set((staffUsers || []).map((s) => s.user_id))];

            const isOverdue = daysLeft < 0 || sewa.status === 'Terlambat';
            const title = isOverdue
                ? '⏰ Sewa Alat Terlambat Dikembalikan'
                : '📦 Deadline Pengembalian Alat Mendekat';
            const message = `${sewa.nama_penyewa} — ${sewa.jenis === 'Peminjaman' ? 'peminjaman' : 'sewa'} harus dikembalikan ${isOverdue ? `${Math.abs(daysLeft)} hari yang lalu (${sewa.tanggal_pengembalian})` : `besok/hari ini (${sewa.tanggal_pengembalian})`}.`;

            for (const userId of userIds) {
                await notificationService.create({
                    userId,
                    title,
                    message,
                    type: isOverdue ? 'error' : 'warning',
                    link: '/dashboard/admin/staff-alat?tab=sewa',
                });
            }
        } catch (err) {
            logger.error({ err, sewaId: sewa.id }, 'Failed to send deadline notification');
        }
    }

    /** Scan semua transaksi aktif, kirim notifikasi untuk yang overdue/besok. */
    async scanDeadlinesAndNotify() {
        const { data: sewaList, error } = await supabaseAdmin
            .from('sewa_alat')
            .select('*')
            .neq('status_pengembalian', 'Sudah Mengembalikan');
        if (error) throw error;

        let notified = 0;
        for (const sewa of sewaList || []) {
            const daysLeft = daysBetween(todayStr(), sewa.tanggal_pengembalian);
            if (daysLeft <= 1) {
                await this.notifyDeadlineForSewa(sewa);
                notified += 1;
            }
        }
        logger.info({ notified }, 'Staff alat: deadline scan completed');
        return notified;
    }

    /** Auto-update status Terlambat untuk transaksi lewat deadline. */
    async markOverdueTransactions() {
        const { data: sewaList, error } = await supabaseAdmin
            .from('sewa_alat')
            .select('id, tanggal_pengembalian, status')
            .in('status', ['Belum Lunas', 'Lunas'])
            .neq('status_pengembalian', 'Sudah Mengembalikan');
        if (error) throw error;

        let updated = 0;
        for (const sewa of sewaList || []) {
            const daysLeft = daysBetween(todayStr(), sewa.tanggal_pengembalian);
            if (daysLeft < 0 && sewa.status !== 'Terlambat') {
                await supabaseAdmin
                    .from('sewa_alat')
                    .update({ status: 'Terlambat', updated_at: new Date().toISOString() })
                    .eq('id', sewa.id);
                updated += 1;
            }
        }
        if (updated > 0) logger.info({ updated }, 'Staff alat: overdue transactions marked as Terlambat');
        return updated;
    }

    /** Statistik untuk dashboard staff alat. */
    async getDashboardStats() {
        const [{ data: alat }, { data: sewa }, profil] = await Promise.all([
            supabaseAdmin.from('inventaris_alat').select('id, nama, gambar, kategori, kondisi, jumlah, is_available'),
            supabaseAdmin.from('sewa_alat').select('*'),
            this.getProfil(),
        ]);
        return { alat: alat || [], sewa: sewa || [], uangAlat: Number(profil.uang_alat) || 0 };
    }

    /** Helper lokal untuk dipakai dashboard. */
    async listAlatForModule() {
        const { data, error } = await supabaseAdmin
            .from('inventaris_alat')
            .select('*')
            .order('nama', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    // ============================================================
    // Import tarif (Excel) — batch upsert
    // ============================================================

    async importHargaSewa(items) {
        const imported = [];
        const errors = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const rowNum = i + 2;
            try {
                const nama = String(item.nama_alat || item.nama || '').trim();
                if (!nama) {
                    errors.push({ row: rowNum, error: 'Nama alat wajib diisi' });
                    continue;
                }
                const kategori = item.kategori === 'Paket Santri' ? 'Paket Santri' : 'Umum';
                const jumlah = Math.max(1, Number(item.jumlah) || 1);
                const harga = Math.max(0, Number(item.harga) || 0);

                const { data, error } = await supabaseAdmin
                    .from('harga_sewa_alat')
                    .insert({ nama_alat: nama, kategori, jumlah, harga })
                    .select()
                    .single();
                if (error) throw error;
                imported.push(data);
            } catch (err) {
                errors.push({ row: rowNum, error: err.message || 'Gagal insert' });
            }
        }
        return { imported, failed: errors.length, errors };
    }
}
