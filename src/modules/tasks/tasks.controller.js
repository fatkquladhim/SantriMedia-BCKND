import { TasksService } from './tasks.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const tasksService = new TasksService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { status, assigned_to } = req.query;
        let { divisi_id, platform_id } = req.query;

        // STRICT PERMISSION FILTERING
        if (req.user.base_role !== 'admin') {
            const scopedDivisiIds = req.user.permissions
                ?.filter(p => p.permission === 'ketua_divisi' && p.divisi_id)
                .map(p => p.divisi_id) || [];

            const scopedPlatformIds = req.user.permissions
                ?.filter(p => p.permission === 'ketua_platform' && p.platform_id)
                .map(p => p.platform_id) || [];

            if (scopedDivisiIds.length > 0) {
                divisi_id = scopedDivisiIds;
            } else if (scopedPlatformIds.length > 0) {
                platform_id = scopedPlatformIds;
            } else {
                // REGULAR USER - Strictly lock to their profile division
                if (!req.user.divisi_id) {
                    // Blokir akses jika divisi belum dipilih (agar tidak melihat tugas liar)
                    return ApiResponse.paginated(res, [], { page, limit, total: 0 });
                }
                divisi_id = req.user.divisi_id;
            }
        }

        const { data, total } = await tasksService.list({
            offset, limit, status,
            assignedTo: assigned_to,
            divisiId: divisi_id,
            platformId: platform_id
        });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
    try { return ApiResponse.success(res, await tasksService.getById(req.params.id)); }
    catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try {
        const data = await tasksService.create({ ...req.body, created_by: req.user.id });
        return ApiResponse.created(res, data, 'Task berhasil dibuat');
    } catch (err) { next(err); }
};

export const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const user = req.user;

        // PROTEKSI: Hanya Admin atau Ketua yang boleh Approve (done) atau Cancel tugas
        if (status === 'done' || status === 'cancelled') {
            const isKetua = user.dynamic_permissions?.some(p => ['ketua_divisi', 'ketua_platform'].includes(p));
            const isAdmin = user.base_role === 'admin';

            if (!isAdmin && !isKetua) {
                return res.status(403).json({
                    success: false,
                    message: 'Hanya Admin atau Ketua yang dapat menyetujui (Approve) atau membatalkan tugas.'
                });
            }
        }

        const data = await tasksService.updateStatus(req.params.id, status, req.user.id);
        return ApiResponse.success(res, data, 'Status task berhasil diubah');
    } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try {
        const data = await tasksService.update(req.params.id, req.body);
        return ApiResponse.success(res, data, 'Task berhasil diupdate');
    } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
    try {
        await tasksService.delete(req.params.id);
        return ApiResponse.success(res, null, 'Task berhasil dihapus');
    } catch (err) { next(err); }
};

export const submitEvidence = async (req, res, next) => {
    try {
        const data = await tasksService.submitEvidence(req.params.id, req.body.evidence_url, req.user.id);
        return ApiResponse.success(res, data, 'Evidence berhasil disubmit');
    } catch (err) { next(err); }
};
