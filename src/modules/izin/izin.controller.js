import { IzinService } from './izin.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const izinService = new IzinService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset, user_id, status } = req.query;
        const { page: p, limit: l, offset: o } = parsePagination(req.query);

        let filterUserId = req.user.id; // Start with own ID

        // Cases where we allow seeing other people's data (Admin/Staff only)
        const isManager = req.user.base_role === 'admin' || req.user.dynamic_permissions.includes('staf_kantor');

        if (isManager) {
            if (user_id) {
                // Specific search for a user
                filterUserId = user_id;
            } else if (status || req.query.mode === 'management') {
                // Viewing management panel or filtering by status
                filterUserId = undefined; 
            } else {
                // Default to personal view even for Admin
                filterUserId = req.user.id;
            }
        } else {
            // Non-managers are strictly locked to their own ID
            filterUserId = req.user.id;
            if (user_id && user_id !== req.user.id) {
                return ApiResponse.forbidden(res, 'Akses ditolak: Anda hanya boleh melihat riwayat sendiri');
            }
        }

        const { data, total } = await izinService.list({ 
            offset: o, 
            limit: l, 
            userId: filterUserId, 
            status, 
            reqUser: req.user,
            isManagement: req.query.mode === 'management'
        });

        return ApiResponse.paginated(res, data, { page: p, limit: l, total });
    } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try {
        const data = await izinService.create({ ...req.body, user_id: req.user.id });
        return ApiResponse.created(res, data, 'Izin malam berhasil diajukan');
    } catch (err) { next(err); }
};

export const approve = async (req, res, next) => {
    try {
        const catatan = req.body?.catatan || null;
        const data = await izinService.approve(req.params.id, req.user, catatan);
        return ApiResponse.success(res, data, 'Izin disetujui');
    } catch (err) { next(err); }
};

export const reject = async (req, res, next) => {
    try {
        const catatan = req.body?.catatan || null;
        const data = await izinService.reject(req.params.id, req.user, catatan);
        return ApiResponse.success(res, data, 'Izin ditolak');
    } catch (err) { next(err); }
};

