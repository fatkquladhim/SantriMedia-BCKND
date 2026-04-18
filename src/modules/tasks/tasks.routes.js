import { Router } from 'express';
import * as TasksController from './tasks.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { validate } from '../../middleware/validator.js';
import { createTaskValidation, updateStatusValidation, submitEvidenceValidation } from './tasks.validation.js';

const router = Router();

router.get('/', authGuard, TasksController.list);
router.get('/:id', authGuard, TasksController.getById);
router.post('/', authGuard, permissionGuard('ketua_divisi', 'ketua_platform'), validate(createTaskValidation), TasksController.create);
router.patch('/:id/status', authGuard, validate(updateStatusValidation), TasksController.updateStatus);
router.put('/:id', authGuard, permissionGuard('ketua_divisi', 'ketua_platform'), TasksController.update);
router.delete('/:id', authGuard, permissionGuard('ketua_divisi', 'ketua_platform'), TasksController.remove);
router.patch('/:id/evidence', authGuard, validate(submitEvidenceValidation), TasksController.submitEvidence);

export default router;
