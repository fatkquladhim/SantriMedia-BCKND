import { Router } from 'express';
import * as SearchController from './search.controller.js';
import { authGuard } from '../../middleware/authGuard.js';

const router = Router();

router.get('/global', authGuard, SearchController.globalSearch);

export default router;
