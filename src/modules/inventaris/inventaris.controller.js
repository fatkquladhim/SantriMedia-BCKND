import { InventarisService } from './inventaris.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const inventarisService = new InventarisService();

export const listAlat = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { data, total } = await inventarisService.listAlat({ offset, limit, kategori: req.query.kategori, isAvailable: req.query.is_available });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const createAlat = async (req, res, next) => {
    try { return ApiResponse.created(res, await inventarisService.createAlat(req.body), 'Alat berhasil ditambahkan'); }
    catch (err) { next(err); }
};

export const updateAlat = async (req, res, next) => {
    try { return ApiResponse.success(res, await inventarisService.updateAlat(req.params.id, req.body), 'Alat berhasil diupdate'); }
    catch (err) { next(err); }
};

export const deleteAlat = async (req, res, next) => {
    try { 
        await inventarisService.deleteAlat(req.params.id);
        return ApiResponse.success(res, null, 'Alat berhasil dihapus'); 
    }
    catch (err) { next(err); }
};

export const listPeminjaman = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const userId = req.user.dynamic_permissions.includes('staf_alat') || req.user.base_role === 'admin' ? req.query.user_id : req.user.id;
        const { data, total } = await inventarisService.listPeminjaman({ offset, limit, userId, status: req.query.status });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const requestBorrow = async (req, res, next) => {
    try {
        const data = await inventarisService.requestBorrow({ ...req.body, user_id: req.user.id });
        return ApiResponse.created(res, data, 'Peminjaman berhasil diajukan');
    } catch (err) { next(err); }
};

export const approveBorrow = async (req, res, next) => {
    try { return ApiResponse.success(res, await inventarisService.approveBorrow(req.params.id, req.user.id), 'Peminjaman disetujui'); }
    catch (err) { next(err); }
};

export const rejectBorrow = async (req, res, next) => {
    try { return ApiResponse.success(res, await inventarisService.rejectBorrow(req.params.id, req.user.id, req.body.catatan), 'Peminjaman ditolak'); }
    catch (err) { next(err); }
};

export const returnItem = async (req, res, next) => {
    try { return ApiResponse.success(res, await inventarisService.returnItem(req.params.id), 'Alat berhasil dikembalikan'); }
    catch (err) { next(err); }
};

export const stokOpname = async (req, res, next) => {
    try { return ApiResponse.success(res, await inventarisService.stokOpname()); }
    catch (err) { next(err); }
};
