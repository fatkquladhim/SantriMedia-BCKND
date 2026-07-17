import { body } from 'express-validator';

export const registerValidation = [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('fullName').notEmpty().withMessage('Nama lengkap wajib diisi'),
];

export const loginValidation = [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
];

export const completeProfileValidation = [
    body('divisi_id').isUUID().withMessage('Divisi ID harus UUID valid'),
    body('asrama_id').isUUID().withMessage('Asrama ID harus UUID valid'),
    body('alamat').notEmpty().withMessage('Alamat wajib diisi'),
    body('nomor_darurat').notEmpty().withMessage('Nomor darurat wajib diisi'),
];
