import { PlatformService } from './platform.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const platformService = new PlatformService();

export const list = async (req, res, next) => {
    try { return ApiResponse.success(res, await platformService.list(req.query.divisi_id)); }
    catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try { return ApiResponse.created(res, await platformService.create(req.body), 'Platform berhasil dibuat'); }
    catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try { return ApiResponse.success(res, await platformService.update(req.params.id, req.body), 'Platform berhasil diupdate'); }
    catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
    try { await platformService.delete(req.params.id); return ApiResponse.success(res, null, 'Platform berhasil dihapus'); }
    catch (err) { next(err); }
};
