import { Router } from 'express';
import * as AiController from './ai.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// AI Task Dispatcher — for Ketua Divisi / Ketua Platform
router.post(
    '/task-dispatch',
    authGuard,
    aiLimiter,
    permissionGuard('ketua_divisi', 'ketua_platform'),
    AiController.recommendAssignment
);

// AI Grading Assistant — for SDM
router.get(
    '/grade-recommend/:userId',
    authGuard,
    aiLimiter,
    permissionGuard('sdm'),
    AiController.recommendGrade
);

// AI Inventory Anomaly — for Staf Alat
router.get(
    '/inventory-anomaly',
    authGuard,
    aiLimiter,
    permissionGuard('staf_alat'),
    AiController.detectAnomalies
);

export default router;
