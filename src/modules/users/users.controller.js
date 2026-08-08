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
        const isSdm = req.user.dynamic_permissions?.some(p => p === 'sdm');
        if (req.user.base_role !== 'admin' && !isSdm) {
            const isKetua = req.user.dynamic_permissions?.some(p => p === 'ketua_divisi');

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

export const remove = async (req, res, next) => {
    try {
        await usersService.remove(req.params.id);
        return ApiResponse.success(res, null, 'User berhasil dihapus');
    } catch (err) { next(err); }
};

export const updateMe = async (req, res, next) => {
    try {
        const { full_name, bio, avatar_url, divisi_id, asrama_id, alamat, no_hp } = req.body;
        const data = await usersService.update(req.user.id, {
            full_name: full_name || null,
            bio: bio === undefined ? undefined : (bio || null),
            avatar_url: avatar_url === undefined ? undefined : (avatar_url || null),
            divisi_id: divisi_id === undefined ? undefined : (divisi_id || null),
            asrama_id: asrama_id === undefined ? undefined : (asrama_id || null),
            alamat: alamat === undefined ? undefined : (alamat || null),
            no_hp: no_hp === undefined ? undefined : (no_hp || null),
        });
        return ApiResponse.success(res, data, 'Profil berhasil diperbarui');
    } catch (err) { next(err); }
};
