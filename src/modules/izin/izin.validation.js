import { body } from 'express-validator';

export const createIzinValidation = [
    body('alasan').notEmpty().withMessage('Alasan wajib diisi'),
    body('tujuan').notEmpty().withMessage('Tujuan wajib diisi'),
    body('jam_keluar').isISO8601().withMessage('Jam keluar harus format ISO 8601'),
    body('estimasi_kembali').isISO8601().withMessage('Estimasi kembali harus format ISO 8601'),
];
