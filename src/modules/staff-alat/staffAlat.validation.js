import { body, param, query } from 'express-validator';

export const SEWA_JENIS = ['Penyewaan', 'Peminjaman'];
export const SEWA_KATEGORI = ['Umum', 'Paket Santri'];
export const SEWA_STATUS = ['Lunas', 'Belum Lunas', 'Terlambat'];
export const RETURN_STATUS = ['Belum Mengembalikan', 'Sudah Mengembalikan'];

const isDateString = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Tanggal harus format YYYY-MM-DD');
    }
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) throw new Error('Tanggal tidak valid');
    return true;
};

export const createSewaValidation = [
    body('nama_penyewa').trim().notEmpty().withMessage('Nama penyewa wajib diisi'),
    body('jenis').optional().isIn(SEWA_JENIS).withMessage('Jenis transaksi tidak valid'),
    body('kategori').optional().isIn(SEWA_KATEGORI).withMessage('Kategori sewa tidak valid'),
    body('tanggal_penyewaan').custom(isDateString).withMessage('Tanggal penyewaan tidak valid'),
    body('tanggal_pengembalian').custom(isDateString).withMessage('Tanggal pengembalian tidak valid'),
    body('harga_sewa').optional().isInt({ min: 0 }).withMessage('Harga sewa harus angka >= 0'),
    body('status').optional().isIn(SEWA_STATUS).withMessage('Status pembayaran tidak valid'),
    body('status_pengembalian').optional().isIn(RETURN_STATUS).withMessage('Status pengembalian tidak valid'),
    body('catatan').optional().isString(),
    body('jaminan').optional().isString(),
    body('items').isArray({ min: 1 }).withMessage('Minimal satu alat harus dipilih'),
    body('items.*.alat_id').isUUID().withMessage('alat_id harus UUID'),
    body('items.*.jumlah').isInt({ min: 1 }).withMessage('Jumlah item harus angka >= 1'),
    body('items.*.harga_satuan').optional().isInt({ min: 0 }).withMessage('Harga satuan harus angka >= 0'),
];

export const updateSewaValidation = [
    param('id').isUUID().withMessage('ID transaksi tidak valid'),
    body('nama_penyewa').optional().trim().notEmpty().withMessage('Nama penyewa wajib diisi'),
    body('jenis').optional().isIn(SEWA_JENIS).withMessage('Jenis transaksi tidak valid'),
    body('kategori').optional().isIn(SEWA_KATEGORI).withMessage('Kategori sewa tidak valid'),
    body('tanggal_penyewaan').optional().custom(isDateString).withMessage('Tanggal penyewaan tidak valid'),
    body('tanggal_pengembalian').optional().custom(isDateString).withMessage('Tanggal pengembalian tidak valid'),
    body('harga_sewa').optional().isInt({ min: 0 }).withMessage('Harga sewa harus angka >= 0'),
    body('status').optional().isIn(SEWA_STATUS).withMessage('Status pembayaran tidak valid'),
    body('status_pengembalian').optional().isIn(RETURN_STATUS).withMessage('Status pengembalian tidak valid'),
    body('catatan').optional().isString(),
    body('jaminan').optional().isString(),
    body('items').optional().isArray({ min: 1 }).withMessage('Minimal satu alat harus dipilih'),
    body('items.*.alat_id').isUUID().withMessage('alat_id harus UUID'),
    body('items.*.jumlah').isInt({ min: 1 }).withMessage('Jumlah item harus angka >= 1'),
    body('items.*.harga_satuan').optional().isInt({ min: 0 }).withMessage('Harga satuan harus angka >= 0'),
];

export const sewaIdParamValidation = [
    param('id').isUUID().withMessage('ID transaksi tidak valid'),
];

export const statusValidation = [
    param('id').isUUID().withMessage('ID transaksi tidak valid'),
    body('status').isIn(SEWA_STATUS).withMessage('Status pembayaran tidak valid'),
];

export const returnStatusValidation = [
    param('id').isUUID().withMessage('ID transaksi tidak valid'),
    body('status_pengembalian').isIn(RETURN_STATUS).withMessage('Status pengembalian tidak valid'),
];

export const createHargaValidation = [
    body('nama_alat').trim().notEmpty().withMessage('Nama alat wajib diisi'),
    body('kategori').optional().isIn(SEWA_KATEGORI).withMessage('Kategori tarif tidak valid'),
    body('jumlah').optional().isInt({ min: 1 }).withMessage('Jumlah harus angka >= 1'),
    body('harga').isInt({ min: 0 }).withMessage('Harga harus angka >= 0'),
    body('alat_id').optional().isUUID().withMessage('alat_id harus UUID'),
];

export const updateHargaValidation = [
    param('id').isUUID().withMessage('ID tarif tidak valid'),
    body('nama_alat').optional().trim().notEmpty().withMessage('Nama alat wajib diisi'),
    body('kategori').optional().isIn(SEWA_KATEGORI).withMessage('Kategori tarif tidak valid'),
    body('jumlah').optional().isInt({ min: 1 }).withMessage('Jumlah harus angka >= 1'),
    body('harga').optional().isInt({ min: 0 }).withMessage('Harga harus angka >= 0'),
    body('alat_id').optional({ nullable: true }).isUUID().withMessage('alat_id harus UUID'),
];

export const profilUpdateValidation = [
    body('nama_staff').optional().trim().notEmpty().withMessage('Nama staff wajib diisi'),
    body('sejak').optional().isString(),
    body('uang_alat').optional().isInt({ min: 0 }).withMessage('Saldo harus angka >= 0'),
    body('logo_url').optional({ nullable: true }).isString(),
];

export const listSewaValidation = [
    query('status').optional().isIn(SEWA_STATUS).withMessage('Filter status tidak valid'),
    query('status_pengembalian').optional().isIn(RETURN_STATUS).withMessage('Filter status pengembalian tidak valid'),
    query('jenis').optional().isIn(SEWA_JENIS).withMessage('Filter jenis tidak valid'),
];
