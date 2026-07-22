import { body } from 'express-validator';

export const updateUserValidation = [
    body('full_name').optional().notEmpty().withMessage('Nama tidak boleh kosong'),
    body('base_role').optional().isIn(['admin', 'kepala_asrama', 'user']).withMessage('Role tidak valid'),
    body('divisi_id').optional().isUUID().withMessage('Divisi ID harus UUID'),
    body('asrama_id').optional().isUUID().withMessage('Asrama ID harus UUID'),
    body('alamat').optional().notEmpty().withMessage('Alamat tidak boleh kosong'),
    body('no_hp')
        .optional()
        .matches(/^(\+62|62|0)[0-9]{8,13}$/)
        .withMessage('Format nomor HP tidak valid (contoh: 08123456789)'),
];
