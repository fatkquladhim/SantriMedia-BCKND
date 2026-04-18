import { Router } from 'express';
import * as GradingController from './grading.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { validate } from '../../middleware/validator.js';
import { upsertGradeValidation } from './grading.validation.js';

const router = Router();

router.get('/', authGuard, permissionGuard('sdm'), GradingController.list);
router.get('/me', authGuard, GradingController.getMyGrade);
router.get('/user/:userId', authGuard, permissionGuard('sdm'), GradingController.getByUser);
router.post('/', authGuard, permissionGuard('sdm'), validate(upsertGradeValidation), GradingController.upsert);
router.patch('/:id/publish', authGuard, permissionGuard('sdm'), GradingController.publish);

export default router;
