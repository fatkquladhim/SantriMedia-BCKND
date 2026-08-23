import { Router } from 'express';
import multer from 'multer';
import * as C from './staffAlat.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { validate } from '../../middleware/validator.js';
import {
    createSewaValidation,
    updateSewaValidation,
    sewaIdParamValidation,
    statusValidation,
    returnStatusValidation,
    createHargaValidation,
    updateHargaValidation,
    profilUpdateValidation,
    listSewaValidation,
} from './staffAlat.validation.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ===== Semua route modul staff-alat: authGuard + permissionGuard('staf_alat') =====
// Admin bypass otomatis via permissionGuard.

// Profil & Kas
router.get('/profil', C.getProfil);
router.put('/profil', validate(profilUpdateValidation), C.updateProfil);
router.post('/profil/recompute', C.recomputeUangAlat);

// Tarif Harga
router.get('/harga-sewa', validate(listSewaValidation), C.listHargaSewa);
router.post('/harga-sewa', validate(createHargaValidation), C.createHargaSewa);
router.put('/harga-sewa/:id', validate(updateHargaValidation), C.updateHargaSewa);
router.delete('/harga-sewa/:id', validate(sewaIdParamValidation), C.deleteHargaSewa);
router.post('/harga-sewa/import', upload.single('file'), C.importHargaSewa);

// Sewa / Peminjaman
router.get('/sewa', validate(listSewaValidation), C.listSewa);
router.get('/sewa/:id', validate(sewaIdParamValidation), C.getSewa);
router.post('/sewa', validate(createSewaValidation), C.createSewa);
router.put('/sewa/:id', validate(updateSewaValidation), C.updateSewa);
router.delete('/sewa/:id', validate(sewaIdParamValidation), C.deleteSewa);
router.patch('/sewa/:id/status', validate(statusValidation), C.updateSewaStatus);
router.patch('/sewa/:id/return', validate(returnStatusValidation), C.updateSewaReturnStatus);
router.post('/sewa/:id/kas', validate(sewaIdParamValidation), C.postSewaKas);

// Dashboard
router.get('/dashboard/stats', C.getDashboardStats);
router.post('/scan-deadlines', C.scanDeadlines);

// Routes that must come AFTER /:id-style params to avoid capture
export default router;
