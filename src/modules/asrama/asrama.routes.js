import { Router } from 'express';
import * as AsramaController from './asrama.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { createAsramaValidation } from './asrama.validation.js';
import { createKamarValidation, updateKamarValidation } from './kamar.validation.js';

const router = Router();

router.get('/', authGuard, AsramaController.list);
router.get('/all-rooms', authGuard, AsramaController.listAllKamar);
router.get('/:id', authGuard, AsramaController.getById);
router.post('/', authGuard, roleGuard('admin'), validate(createAsramaValidation), AsramaController.create);
router.put('/:id', authGuard, roleGuard('admin'), AsramaController.update);
router.delete('/:id', authGuard, roleGuard('admin'), AsramaController.remove);

// Kamar Management
router.post('/:asramaId/kamar', authGuard, roleGuard('admin'), validate(createKamarValidation), AsramaController.addKamar);
router.put('/kamar/:id', authGuard, roleGuard('admin'), validate(updateKamarValidation), AsramaController.updateKamar);
router.delete('/kamar/:id', authGuard, roleGuard('admin'), AsramaController.removeKamar);

export default router;
