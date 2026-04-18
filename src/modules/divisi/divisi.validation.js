import { body } from 'express-validator';

export const createDivisiValidation = [
    body('nama').notEmpty().withMessage('Nama divisi wajib diisi'),
    body('deskripsi').optional().isString().withMessage('Deskripsi harus string'),
];
