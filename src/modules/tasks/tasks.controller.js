import { TasksService } from './tasks.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const tasksService = new TasksService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { status, assigned_to } = req.query;
        let { divisi_id } = req.query;
        let userScope = null;

        // STRICT PERMISSION FILTERING
        if (req.user.base_role !== 'admin') {
            const scopedDivisiIds = req.user.permissions
                ?.filter(p => p.permission === 'ketua_divisi' && p.divisi_id)
                .map(p => p.divisi_id).filter(Boolean) || [];

            if (scopedDivisiIds.length > 0) {
                divisi_id = scopedDivisiIds;
            } else {
                // REGULAR USER — filter by assigned_to jika query ke diri sendiri
                if (assigned_to && assigned_to === req.user.id) {
                    // hanya filter by assigned_to, tidak perlu divisi_id
                } else if (req.user.divisi_id) {
                    // Tampilkan tugas divisi ATAU tugas yang di-assign ke user ini
                    userScope = { userId: req.user.id, divisiId: req.user.divisi_id };
                    divisi_id = undefined;
                } else {
                    return ApiResponse.paginated(res, [], { page, limit, total: 0 });
                }
            }
        }

        const { data, total } = await tasksService.list({
            offset, limit, status,
            assignedTo: assigned_to,
            divisiId: divisi_id,
            userScope
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
            const isKetua = user.dynamic_permissions?.some(p => p === 'ketua_divisi');
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
        if (req.user.base_role !== 'admin') {
            const task = await tasksService.getById(req.params.id);
            const hasDivisiPerm = req.user.permissions?.some(p => p.permission === 'ketua_divisi' && p.divisi_id === task.divisi_id);
            if (!hasDivisiPerm) {
                return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak berwenang mengelola tugas di divisi ini.' });
            }
        }
        const data = await tasksService.update(req.params.id, req.body);
        return ApiResponse.success(res, data, 'Task berhasil diupdate');
    } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
    try {
        if (req.user.base_role !== 'admin') {
            const task = await tasksService.getById(req.params.id);
            const hasDivisiPerm = req.user.permissions?.some(p => p.permission === 'ketua_divisi' && p.divisi_id === task.divisi_id);
            if (!hasDivisiPerm) {
                return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak berwenang menghapus tugas di divisi ini.' });
            }
        }
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
