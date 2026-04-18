import { EvaluasiService } from './evaluasi.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const evaluasiService = new EvaluasiService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const kepalaKamarId = req.user.base_role === 'kepala_kamar' ? req.user.id : undefined;
        const { data, total } = await evaluasiService.list({ offset, limit, santriId: req.query.santri_id, bulan: req.query.bulan, kepalaKamarId });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try {
        const data = await evaluasiService.create({ ...req.body, kepala_asrama_id: req.user.id });
        return ApiResponse.created(res, data, 'Evaluasi berhasil dibuat');
    } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try {
        const data = await evaluasiService.update(req.params.id, req.body);
        return ApiResponse.success(res, data, 'Evaluasi berhasil diupdate');
    } catch (err) { next(err); }
};
