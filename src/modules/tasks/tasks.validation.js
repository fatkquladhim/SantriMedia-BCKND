import { body } from 'express-validator';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../config/constants.js';

export const createTaskValidation = [
    body('judul').notEmpty().withMessage('Judul task wajib diisi'),
    body('assigned_to').optional().isUUID().withMessage('assigned_to harus UUID'),
    body('divisi_id').optional().isUUID().withMessage('divisi_id harus UUID'),
    body('platform_id').optional().isUUID().withMessage('platform_id harus UUID'),
    body('priority').optional().isIn(TASK_PRIORITIES).withMessage('Priority tidak valid'),
    body('deadline').optional().isISO8601().withMessage('Deadline harus format ISO 8601'),
];

export const updateStatusValidation = [
    body('status').isIn(TASK_STATUSES).withMessage(`Status harus: ${TASK_STATUSES.join(', ')}`),
];

export const submitEvidenceValidation = [
    body('evidence_url').isURL().withMessage('Evidence URL tidak valid'),
];
