import { SearchService } from './search.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const searchService = new SearchService();

export const globalSearch = async (req, res, next) => {
    try {
        const { q } = req.query;
        const results = await searchService.global(q, req.user);
        return ApiResponse.success(res, results);
    } catch (err) { next(err); }
};
