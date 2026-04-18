import { body } from 'express-validator';

export const updateUserValidation = [
    body('full_name').optional().notEmpty().withMessage('Nama tidak boleh kosong'),
    body('base_role').optional().isIn(['admin', 'kepala_kamar', 'user']).withMessage('Role tidak valid'),
    body('divisi_id').optional().isUUID().withMessage('Divisi ID harus UUID'),
    body('kamar_id').optional().isUUID().withMessage('Kamar ID harus UUID'),
];
