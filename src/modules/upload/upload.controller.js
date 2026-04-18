import { supabaseAdmin } from '../../config/supabase.js';
import { ApiResponse } from '../../shared/apiResponse.js';

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

        // 1. PASTIKAN BUCKET ADA (Self-healing)
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.find(b => b.name === 'avatars');

        if (!bucketExists) {
            console.log('Bucket "avatars" tidak ada. Mencoba membuat...');
            const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
                public: true
            });
            if (createError) {
                console.error('Gagal membuat bucket:', createError);
                throw createError;
            }
        }

        // 2. UPLOAD FILE
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

        // 3. AMBIL URL PUBLIK
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
