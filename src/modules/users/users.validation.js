import { body } from 'express-validator';

export const updateUserValidation = [
    body('full_name').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Nama harus string'),
    body('base_role').optional({ nullable: true, checkFalsy: true }).isIn(['admin', 'kepala_asrama', 'user']).withMessage('Role tidak valid'),
    body('divisi_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Divisi ID harus UUID'),
    body('asrama_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Asrama ID harus UUID'),
    body('alamat').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Alamat harus string'),
    body('bio').optional({ nullable: true }).isString().withMessage('Bio harus string'),
    body('no_hp')
        .optional({ nullable: true })
        .matches(/^(\+62|62|0)?[0-9]{8,13}$/)
        .withMessage('Format nomor HP tidak valid (contoh: 08123456789)'),
];
