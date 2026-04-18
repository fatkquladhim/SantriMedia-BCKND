import { Router } from 'express';
import * as IzinController from './izin.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { validate } from '../../middleware/validator.js';
import { createIzinValidation } from './izin.validation.js';

const router = Router();

router.get('/', authGuard, IzinController.list);
router.post('/', authGuard, validate(createIzinValidation), IzinController.create);
router.patch('/:id/approve', authGuard, permissionGuard('staf_kantor'), IzinController.approve);
router.patch('/:id/reject', authGuard, permissionGuard('staf_kantor'), IzinController.reject);

export default router;
