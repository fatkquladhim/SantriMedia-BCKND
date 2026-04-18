import { Router } from 'express';
import * as EvaluasiController from './evaluasi.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { createEvaluasiValidation } from './evaluasi.validation.js';

const router = Router();

router.get('/', authGuard, roleGuard('admin', 'kepala_kamar', 'sdm'), EvaluasiController.list);
router.post('/', authGuard, roleGuard('admin', 'kepala_kamar'), validate(createEvaluasiValidation), EvaluasiController.create);
router.put('/:id', authGuard, roleGuard('admin', 'kepala_kamar'), EvaluasiController.update);

export default router;
