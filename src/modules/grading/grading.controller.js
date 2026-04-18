import { GradingService } from './grading.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';

const gradingService = new GradingService();

export const list = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { data, total } = await gradingService.list({ offset, limit, periode: req.query.periode, isPublished: req.query.is_published });
        return ApiResponse.paginated(res, data, { page, limit, total });
    } catch (err) { next(err); }
};

export const getByUser = async (req, res, next) => {
    try { return ApiResponse.success(res, await gradingService.getByUser(req.params.userId, req.query.periode)); }
    catch (err) { next(err); }
};

export const getMyGrade = async (req, res, next) => {
    try { 
        // Hanya mengembalikan history dari user yang login dan is_published=true
        const grades = await gradingService.getByUser(req.user.id, req.query.periode);
        const publishedGrades = grades.filter(g => g.is_published === true);
        return ApiResponse.success(res, publishedGrades); 
    }
    catch (err) { next(err); }
};

export const upsert = async (req, res, next) => {
    try { return ApiResponse.success(res, await gradingService.upsert(req.body), 'Grade berhasil disimpan'); }
    catch (err) { next(err); }
};

export const publish = async (req, res, next) => {
    try { return ApiResponse.success(res, await gradingService.publish(req.params.id, req.user.id), 'Grade berhasil dipublish'); }
    catch (err) { next(err); }
};
