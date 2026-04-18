import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../shared/apiResponse.js';

const authService = new AuthService();

export const register = async (req, res, next) => {
    try {
        const result = await authService.register(req.body);
        return ApiResponse.created(res, result, 'Registrasi berhasil. Silakan verifikasi email.');
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const data = await authService.login(req.body);
        return ApiResponse.success(res, data, 'Login berhasil');
    } catch (err) {
        next(err);
    }
};

export const getMe = async (req, res, next) => {
    try {
        const profile = await authService.getMe(req.user.id);
        return ApiResponse.success(res, profile);
    } catch (err) {
        next(err);
    }
};

export const completeProfile = async (req, res, next) => {
    try {
        const profile = await authService.completeProfile(req.user.id, req.body);
        return ApiResponse.success(res, profile, 'Profil berhasil dilengkapi');
    } catch (err) {
        next(err);
    }
};
export const getOnboardingData = async (req, res, next) => {
    try {
        const data = await authService.getOnboardingData();
        return ApiResponse.success(res, data);
    } catch (err) {
        next(err);
    }
};
