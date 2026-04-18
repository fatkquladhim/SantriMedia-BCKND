import { Router } from 'express';
import * as C from './inventaris.controller.js';
import { authGuard } from '../../middleware/authGuard.js';
import { permissionGuard } from '../../middleware/permissionGuard.js';
import { validate } from '../../middleware/validator.js';
import { createAlatValidation, requestBorrowValidation } from './inventaris.validation.js';

const router = Router();

// Alat CRUD
router.get('/', authGuard, C.listAlat);
router.post('/', authGuard, permissionGuard('staf_alat'), validate(createAlatValidation), C.createAlat);
router.put('/:id', authGuard, permissionGuard('staf_alat'), C.updateAlat);
router.delete('/:id', authGuard, permissionGuard('staf_alat'), C.deleteAlat);

// Peminjaman
router.get('/pinjam', authGuard, C.listPeminjaman);
router.post('/pinjam', authGuard, validate(requestBorrowValidation), C.requestBorrow);
router.patch('/pinjam/:id/approve', authGuard, permissionGuard('staf_alat'), C.approveBorrow);
router.patch('/pinjam/:id/reject', authGuard, permissionGuard('staf_alat'), C.rejectBorrow);
router.patch('/pinjam/:id/return', authGuard, permissionGuard('staf_alat'), C.returnItem);

// Stok opname
router.get('/stok-opname', authGuard, permissionGuard('staf_alat'), C.stokOpname);

export default router;
