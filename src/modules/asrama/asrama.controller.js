import { AsramaService } from './asrama.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const asramaService = new AsramaService();

export const list = async (req, res, next) => {
    try { return ApiResponse.success(res, await asramaService.list()); }
    catch (err) { next(err); }
};

export const listAllKamar = async (req, res, next) => {
    try { return ApiResponse.success(res, await asramaService.listAllKamar()); }
    catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
    try { return ApiResponse.success(res, await asramaService.getById(req.params.id)); }
    catch (err) { next(err); }
};

export const create = async (req, res, next) => {
    try { return ApiResponse.created(res, await asramaService.create(req.body), 'Asrama berhasil dibuat'); }
    catch (err) { next(err); }
};

export const update = async (req, res, next) => {
    try { return ApiResponse.success(res, await asramaService.update(req.params.id, req.body), 'Asrama berhasil diupdate'); }
    catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
    try { await asramaService.delete(req.params.id); return ApiResponse.success(res, null, 'Asrama berhasil dihapus'); }
    catch (err) { next(err); }
};

// Kamar Management
export const addKamar = async (req, res, next) => {
    try {
        const data = await asramaService.addKamar(req.params.asramaId, req.body);
        return ApiResponse.created(res, data, 'Kamar berhasil ditambahkan');
    } catch (err) { next(err); }
};

export const updateKamar = async (req, res, next) => {
    try {
        const data = await asramaService.updateKamar(req.params.id, req.body);
        return ApiResponse.success(res, data, 'Kamar berhasil diupdate');
    } catch (err) { next(err); }
};

export const removeKamar = async (req, res, next) => {
    try {
        await asramaService.deleteKamar(req.params.id);
        return ApiResponse.success(res, null, 'Kamar berhasil dihapus');
    } catch (err) { next(err); }
};
