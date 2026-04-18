import { Router } from 'express';
import * as UsersController from './users.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validator.js';
import { updateUserValidation } from './users.validation.js';

const router = Router();

router.get('/', authGuard, (req, res, next) => {
    const isPimpinan = req.user.dynamic_permissions?.some(p => p === 'ketua_divisi' || p === 'ketua_platform');
    if (req.user.base_role === 'admin' || req.user.base_role === 'sdm' || isPimpinan) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Akses ditolak. Butuh otoritas pimpinan atau SDM.' });
}, UsersController.list);
router.post('/', authGuard, roleGuard('admin'), UsersController.create);
router.get('/:id', authGuard, UsersController.getById);
router.patch('/me', authGuard, UsersController.updateMe);
router.put('/:id', authGuard, roleGuard('admin'), validate(updateUserValidation), UsersController.update);

export default router;
