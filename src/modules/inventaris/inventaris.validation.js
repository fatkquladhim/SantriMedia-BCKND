import { body } from 'express-validator';
import { KONDISI_ALAT } from '../../config/constants.js';

export const createAlatValidation = [
    body('nama').notEmpty().withMessage('Nama alat wajib diisi'),
    body('kategori').notEmpty().withMessage('Kategori wajib diisi'),
    body('kondisi').optional().isIn(KONDISI_ALAT).withMessage('Kondisi tidak valid'),
];

export const requestBorrowValidation = [
    body('alat_id').isUUID().withMessage('alat_id harus UUID'),
    body('estimasi_kembali').isISO8601().withMessage('Estimasi kembali harus format ISO 8601'),
];
