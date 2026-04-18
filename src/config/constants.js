export const BASE_ROLES = ['admin', 'kepala_kamar', 'user'];

export const DYNAMIC_PERMISSIONS = [
    'ketua_divisi',
    'ketua_platform',
    'staf_kantor',
    'staf_alat',
    'sdm',
];

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const IZIN_STATUSES = ['pending', 'approved', 'rejected'];
export const PINJAM_STATUSES = ['pending', 'approved', 'rejected', 'dipinjam', 'dikembalikan'];
export const KONDISI_ALAT = ['baik', 'rusak_ringan', 'rusak_berat', 'maintenance'];
export const GRADE_LEVELS = ['A', 'B', 'C', 'D'];

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
