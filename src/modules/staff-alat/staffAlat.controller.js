import { StaffAlatService } from './staffAlat.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';
import { NotFoundError } from '../../shared/errors.js';

const staffAlatService = new StaffAlatService();

// ============================================================
// Profil & Kas
// ============================================================

export const getProfil = async (req, res, next) => {
    try {
        const profil = await staffAlatService.getProfil();
        return ApiResponse.success(res, profil, 'Profil staff alat');
    } catch (err) { next(err); }
};

export const updateProfil = async (req, res, next) => {
    try {
        const profil = await staffAlatService.updateProfil(req.body, req.user.id);
        return ApiResponse.success(res, profil, 'Profil berhasil diperbarui');
    } catch (err) { next(err); }
};

export const recomputeUangAlat = async (req, res, next) => {
    try {
        const total = await staffAlatService.recomputeUangAlat();
        return ApiResponse.success(res, { uang_alat: total }, 'Saldo kas berhasil dihitung ulang');
    } catch (err) { next(err); }
};

export const adjustUangAlat = async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount === 0) {
            return res.status(422).json({ success: false, message: 'Amount harus angka != 0' });
        }
        const newBalance = await staffAlatService.adjustUangAlat(amount);
        return ApiResponse.success(res, { uang_alat: newBalance }, 'Saldo kas berhasil disesuaikan');
    } catch (err) { next(err); }
};

// ============================================================
// Harga Sewa (Tarif)
// ============================================================

export const listHargaSewa = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { data, total } = await staffAlatService.listHargaSewa({
            offset,
            limit,
            kategori: req.query.kategori,
        });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const createHargaSewa = async (req, res, next) => {
    try {
        return ApiResponse.created(res, await staffAlatService.createHargaSewa(req.body), 'Tarif berhasil ditambahkan');
    } catch (err) { next(err); }
};

export const updateHargaSewa = async (req, res, next) => {
    try {
        return ApiResponse.success(res, await staffAlatService.updateHargaSewa(req.params.id, req.body), 'Tarif berhasil diupdate');
    } catch (err) { next(err); }
};

export const deleteHargaSewa = async (req, res, next) => {
    try {
        await staffAlatService.deleteHargaSewa(req.params.id);
        return ApiResponse.success(res, null, 'Tarif berhasil dihapus');
    } catch (err) { next(err); }
};

export const importHargaSewa = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diunggah' });
        }
        const result = await staffAlatService.importHargaSewa(req.body.items || []);
        return ApiResponse.success(res, result, `Import selesai: ${result.imported.length} berhasil, ${result.failed} gagal`);
    } catch (err) { next(err); }
};

// ============================================================
// Sewa / Peminjaman
// ============================================================

export const listSewa = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { data, total } = await staffAlatService.listSewa({
            offset,
            limit,
            status: req.query.status,
            statusPengembalian: req.query.status_pengembalian,
            jenis: req.query.jenis,
            search: req.query.search,
        });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const getSewa = async (req, res, next) => {
    try {
        return ApiResponse.success(res, await staffAlatService.getSewaById(req.params.id));
    } catch (err) { next(err); }
};

export const createSewa = async (req, res, next) => {
    try {
        const sewa = await staffAlatService.createSewa(req.body, req.user.id);
        return ApiResponse.created(res, sewa, 'Transaksi sewa berhasil dibuat');
    } catch (err) { next(err); }
};

export const updateSewa = async (req, res, next) => {
    try {
        const sewa = await staffAlatService.updateSewa(req.params.id, req.body, req.user.id);
        return ApiResponse.success(res, sewa, 'Transaksi berhasil diupdate');
    } catch (err) { next(err); }
};

export const deleteSewa = async (req, res, next) => {
    try {
        await staffAlatService.deleteSewa(req.params.id);
        return ApiResponse.success(res, null, 'Transaksi berhasil dihapus');
    } catch (err) { next(err); }
};

export const updateSewaStatus = async (req, res, next) => {
    try {
        const sewa = await staffAlatService.updateSewaStatus(req.params.id, req.body.status, req.user.id);
        return ApiResponse.success(res, sewa, 'Status pembayaran berhasil diupdate');
    } catch (err) { next(err); }
};

export const updateSewaReturnStatus = async (req, res, next) => {
    try {
        const sewa = await staffAlatService.updateSewaReturnStatus(req.params.id, req.body.status_pengembalian, req.user.id);
        return ApiResponse.success(res, sewa, 'Status pengembalian berhasil diupdate');
    } catch (err) { next(err); }
};

export const postSewaKas = async (req, res, next) => {
    try {
        const sewa = await staffAlatService.getSewaById(req.params.id);
        const amount = Number(req.body.amount ?? sewa.harga_sewa);
        if (!Number.isFinite(amount) || amount === 0) {
            return res.status(422).json({ success: false, message: 'Amount harus angka != 0' });
        }
        const newBalance = await staffAlatService.adjustUangAlat(amount);
        return ApiResponse.success(res, { uang_alat: newBalance, sewa_id: sewa.id }, 'Kas berhasil disesuaikan');
    } catch (err) { next(err); }
};

// ============================================================
// Dashboard stats
// ============================================================

export const getDashboardStats = async (req, res, next) => {
    try {
        return ApiResponse.success(res, await staffAlatService.getDashboardStats());
    } catch (err) { next(err); }
};

export const scanDeadlines = async (req, res, next) => {
    try {
        const notified = await staffAlatService.scanDeadlinesAndNotify();
        const updated = await staffAlatService.markOverdueTransactions();
        return ApiResponse.success(res, { notified, updated }, 'Scan deadline selesai');
    } catch (err) { next(err); }
};
