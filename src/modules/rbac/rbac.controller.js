import { RbacService } from './rbac.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const rbacService = new RbacService();

export const getUserPermissions = async (req, res, next) => {
    try {
        const data = await rbacService.getUserPermissions(req.params.userId);
        return ApiResponse.success(res, data);
    } catch (err) { next(err); }
};

export const grantPermission = async (req, res, next) => {
    try {
        const data = await rbacService.grantPermission(
            req.params.userId,
            req.body.permission,
            req.user.id,
            req.body.target_id
        );
        return ApiResponse.success(res, data, 'Permission berhasil diberikan');
    } catch (err) { next(err); }
};

export const revokePermission = async (req, res, next) => {
    try {
        await rbacService.revokePermission(
            req.params.userId,
            req.body.permission,
            req.body.target_id
        );
        return ApiResponse.success(res, null, 'Permission berhasil dicabut');
    } catch (err) { next(err); }
};

export const setBaseRole = async (req, res, next) => {
    try {
        const data = await rbacService.setBaseRole(req.params.userId, req.body.role);
        return ApiResponse.success(res, data, 'Base role berhasil diubah');
    } catch (err) { next(err); }
};

export const getWhitelist = async (req, res, next) => {
    try {
        const data = await rbacService.getWhitelist();
        return ApiResponse.success(res, data);
    } catch (err) { next(err); }
};

export const addToWhitelist = async (req, res, next) => {
    try {
        const data = await rbacService.addToWhitelist(req.body.email);
        return ApiResponse.success(res, data, 'Email berhasil ditambahkan ke whitelist');
    } catch (err) { next(err); }
};

export const removeFromWhitelist = async (req, res, next) => {
    try {
        await rbacService.removeFromWhitelist(req.params.email);
        return ApiResponse.success(res, null, 'Email berhasil dihapus dari whitelist');
    } catch (err) { next(err); }
};
