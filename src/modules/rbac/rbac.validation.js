import { body } from 'express-validator';
import { DYNAMIC_PERMISSIONS, BASE_ROLES } from '../../config/constants.js';

export const grantPermissionValidation = [
    body('permission').isIn(DYNAMIC_PERMISSIONS).withMessage(`Permission harus salah satu dari: ${DYNAMIC_PERMISSIONS.join(', ')}`),
    body('target_id').optional().isUUID().withMessage('Target ID harus format UUID yang valid'),
];

export const revokePermissionValidation = [
    body('permission').isIn(DYNAMIC_PERMISSIONS).withMessage(`Permission tidak valid`),
    body('target_id').optional().isUUID().withMessage('Target ID harus format UUID yang valid'),
];

export const setBaseRoleValidation = [
    body('role').isIn(BASE_ROLES).withMessage(`Role harus salah satu dari: ${BASE_ROLES.join(', ')}`),
];
