import { supabaseAdmin } from '../../config/supabase.js';
import { ApiResponse } from '../../shared/apiResponse.js';

function ensureBucket(bucketName) {
    return supabaseAdmin.storage.listBuckets().then(({ data: buckets }) => {
        const exists = buckets?.find(b => b.name === bucketName);
        if (!exists) {
            return supabaseAdmin.storage.createBucket(bucketName, { public: true });
        }
        return Promise.resolve(null);
    });
}

export const uploadAvatar = async (req, res, next) => {
    try {
        console.log('--- Memulai Proses Upload Avatar ---');
        if (!req.file) {
            console.error('Upload Error: File tidak ditemukan di request');
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;

        await ensureBucket('avatars');

        console.log(`Mengupload file: ${fileName} ke bucket: avatars...`);
        const { data, error } = await supabaseAdmin.storage
            .from('avatars')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('DETIL ERROR SUPABASE STORAGE:', JSON.stringify(error, null, 2));
            throw error;
        }

        const { data: publicData } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(fileName);

        console.log('Upload Berhasil! URL:', publicData.publicUrl);
        return ApiResponse.success(res, { url: publicData.publicUrl }, 'Foto berhasil diunggah');
    } catch (err) {
        console.error('CATALOG ERROR:', err);
        next(err);
    }
};

export const uploadEvidence = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
        }

        const file = req.file;
        const allowedMimeTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/x-zip-compressed',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/rtf',
        ];

        const allowedExtensions = new Set([
            'pdf', 'png', 'jpg', 'jpeg', 'webp',
            'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'rar', '7z', 'txt', 'rtf',
            'docs', 'odt', 'ods',
        ]);

        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const mimeOk = allowedMimeTypes.includes(file.mimetype);
        const extOk = allowedExtensions.has(ext);

        if (!mimeOk && !extOk) {
            return res.status(400).json({ success: false, message: `Tipe file tidak didukung. Gunakan PDF, IMG, DOC, ZIP, atau Excel. (mime=${file.mimetype}, ext=.${ext})` });
        }

        const fileExt = file.originalname.split('.').pop();
        const fileName = `evidence-${req.user.id}-${Date.now()}.${fileExt}`;

        await ensureBucket('evidence');

        const { data, error } = await supabaseAdmin.storage
            .from('evidence')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('Evidence upload error:', JSON.stringify(error, null, 2));
            throw error;
        }

        const { data: publicData } = supabaseAdmin.storage
            .from('evidence')
            .getPublicUrl(fileName);

        return ApiResponse.success(res, { url: publicData.publicUrl }, 'Bukti berhasil diunggah');
    } catch (err) {
        console.error('Evidence upload error:', err);
        next(err);
    }
};
