import { Router } from 'express';
import * as DivisiController from './divisi.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { createDivisiValidation } from './divisi.validation.js';

const router = Router();

router.get('/', authGuard, DivisiController.list);
router.get('/:id', authGuard, DivisiController.getById);
router.post('/', authGuard, roleGuard('admin'), validate(createDivisiValidation), DivisiController.create);
router.put('/:id', authGuard, roleGuard('admin'), DivisiController.update);
router.delete('/:id', authGuard, roleGuard('admin'), DivisiController.remove);

export default router;
