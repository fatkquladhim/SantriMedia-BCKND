import { body } from 'express-validator';

export const createEvaluasiValidation = [
    body('santri_id').isUUID().withMessage('santri_id harus UUID'),
    body('kategori').notEmpty().withMessage('Kategori wajib diisi'),
    body('catatan').notEmpty().withMessage('Catatan wajib diisi'),
    body('skor').isInt({ min: 0, max: 100 }).withMessage('Skor harus 0-100'),
    body('bulan_evaluasi').matches(/^\d{4}-\d{2}$/).withMessage('Format bulan: YYYY-MM'),
];
