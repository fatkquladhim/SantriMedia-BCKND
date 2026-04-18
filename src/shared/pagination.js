import { PAGINATION } from '../config/constants.js';

/**
 * Parse pagination params from query string.
 * @param {object} query — req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query) {
    let page = parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE;
    let limit = parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;

    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

    const offset = (page - 1) * limit;

    return { page, limit, offset };
}
