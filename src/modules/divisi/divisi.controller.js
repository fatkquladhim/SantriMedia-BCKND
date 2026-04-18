import { DivisiService } from './divisi.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const divisiService = new DivisiService();

export const list = async (req, res, next) => {
    try { return ApiResponse.success(res, await divisiService.list()); }
    catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
    try { return ApiResponse.success(res, await divisiService.getById(req.params.id)); }
    catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try { return ApiResponse.created(res, await divisiService.create(req.body), 'Divisi berhasil dibuat'); }
    catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try { return ApiResponse.success(res, await divisiService.update(req.params.id, req.body), 'Divisi berhasil diupdate'); }
    catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
    try { await divisiService.delete(req.params.id); return ApiResponse.success(res, null, 'Divisi berhasil dihapus'); }
    catch (err) { next(err); }
};
