import { body } from 'express-validator';

export const createAsramaValidation = [
    body('nama').notEmpty().withMessage('Nama asrama wajib diisi'),
];
