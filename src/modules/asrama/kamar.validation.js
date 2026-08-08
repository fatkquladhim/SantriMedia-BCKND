import { body } from 'express-validator';

export const createKamarValidation = [
    body('nomor').notEmpty().withMessage('Nomor kamar wajib diisi'),
    body('kapasitas').optional().isInt({ min: 1 }).withMessage('Kapasitas minimal 1 orang'),
];

export const updateKamarValidation = [
    body('nomor').optional().notEmpty().withMessage('Nomor kamar tidak boleh kosong'),
    body('kapasitas').optional().isInt({ min: 1 }).withMessage('Kapasitas minimal 1 orang'),
];
