import { Router } from 'express';
import multer from 'multer';
import * as UploadController from './upload.controller.js';
import { authGuard } from '../../middleware/authGuard.js';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Batas dinaikkan ke 10MB
});

router.post('/avatar', authGuard, upload.single('file'), UploadController.uploadAvatar);
router.post('/evidence', authGuard, upload.single('file'), UploadController.uploadEvidence);
router.post('/alat-image', authGuard, upload.single('file'), UploadController.uploadAlatImage);

export default router;
