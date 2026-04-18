import { body } from 'express-validator';
import { GRADE_LEVELS } from '../../config/constants.js';

export const upsertGradeValidation = [
    body('user_id').isUUID().withMessage('user_id harus UUID'),
    body('periode').matches(/^\d{4}-\d{2}$/).withMessage('Format periode: YYYY-MM'),
    body('skor_teknis').optional().isFloat({ min: 0, max: 100 }).withMessage('Skor teknis 0-100'),
    body('skor_asrama').optional().isFloat({ min: 0, max: 100 }).withMessage('Skor asrama 0-100'),
    body('grade').optional().isIn(GRADE_LEVELS).withMessage(`Grade: ${GRADE_LEVELS.join(', ')}`),
];
