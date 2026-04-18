import { Router } from 'express';
import * as RbacController from './rbac.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { grantPermissionValidation, revokePermissionValidation, setBaseRoleValidation } from './rbac.validation.js';

const router = Router();

// All RBAC routes require admin
router.get('/whitelist', authGuard, roleGuard('admin'), RbacController.getWhitelist);
router.post('/whitelist', authGuard, roleGuard('admin'), RbacController.addToWhitelist);
router.delete('/whitelist/:email', authGuard, roleGuard('admin'), RbacController.removeFromWhitelist);

router.get('/:userId/permissions', authGuard, roleGuard('admin'), RbacController.getUserPermissions);
router.post('/:userId/permissions', authGuard, roleGuard('admin'), validate(grantPermissionValidation), RbacController.grantPermission);
router.delete('/:userId/permissions', authGuard, roleGuard('admin'), validate(revokePermissionValidation), RbacController.revokePermission);
router.put('/:userId/role', authGuard, roleGuard('admin'), validate(setBaseRoleValidation), RbacController.setBaseRole);

export default router;
