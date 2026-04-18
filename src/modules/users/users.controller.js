import { UsersService } from './users.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const usersService = new UsersService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { search, role, divisi_only } = req.query;
        let { divisi_id } = req.query;

        // Scoping for non-admins (Ketua Divisi / Platform)
        if (req.user.base_role !== 'admin' && req.user.base_role !== 'sdm') {
            const isKetua = req.user.dynamic_permissions?.some(p => p === 'ketua_divisi' || p === 'ketua_platform');

            if (isKetua && (divisi_only === 'true' || divisi_only === true)) {
                // Restrict to user's own division if they are a leader
                divisi_id = req.user.divisi_id;
            } else if (!isKetua) {
                // Regular users shouldn't list all users unless specialized
                // But for now, we'll just let the routes handle base access
            }
        }

        const { data, total } = await usersService.list({ page, limit, offset, search, role, divisiId: divisi_id });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try {
        const user = await usersService.create(req.body);
        return ApiResponse.created(res, user, 'User berhasil dibuat secara manual oleh admin');
    } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
    try {
        const data = await usersService.getById(req.params.id);
        return ApiResponse.success(res, data);
    } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try {
        const data = await usersService.update(req.params.id, req.body);
        return ApiResponse.success(res, data, 'User berhasil diupdate');
    } catch (err) { next(err); }
};

export const updateMe = async (req, res, next) => {
    try {
        const { fullName, bio, avatarUrl, divisiId, kamarId } = req.body;
        const data = await usersService.update(req.user.id, { 
            full_name: fullName, 
            bio, 
            avatar_url: avatarUrl,
            divisi_id: divisiId,
            kamar_id: kamarId,
            is_profile_complete: true // Mark profile as complete after they update
        });
        return ApiResponse.success(res, data, 'Profil berhasil diperbarui');
    } catch (err) { next(err); }
};
