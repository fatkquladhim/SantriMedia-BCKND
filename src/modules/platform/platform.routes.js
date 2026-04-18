import { Router } from 'express';
import * as PlatformController from './platform.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { createPlatformValidation } from './platform.validation.js';

const router = Router();

router.get('/', authGuard, PlatformController.list);
router.post('/', authGuard, roleGuard('admin'), validate(createPlatformValidation), PlatformController.create);
router.put('/:id', authGuard, roleGuard('admin'), PlatformController.update);
router.delete('/:id', authGuard, roleGuard('admin'), PlatformController.remove);

export default router;
