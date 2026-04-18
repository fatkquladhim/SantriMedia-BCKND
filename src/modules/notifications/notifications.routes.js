import { Router } from 'express';
import * as NotificationController from './notifications.controller.js';
import { authGuard } from '../../middleware/authGuard.js';

const router = Router();

router.get('/', authGuard, NotificationController.list);
router.patch('/read-all', authGuard, NotificationController.markAllAsRead);
router.patch('/:id/read', authGuard, NotificationController.markAsRead);

export default router;
