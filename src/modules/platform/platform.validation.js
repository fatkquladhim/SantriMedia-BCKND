import { body } from 'express-validator';

export const createPlatformValidation = [
    body('nama').notEmpty().withMessage('Nama platform wajib diisi'),
    body('divisi_id').isUUID().withMessage('divisi_id harus UUID'),
];
