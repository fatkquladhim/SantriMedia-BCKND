/**
 * AI Inventory Anomaly Service
 * Uses OpenRouter to detect anomalies in equipment borrowing patterns.
 * Referensi PRD: "Memberitahu Staf Alat jika ada alat yang dipinjam terlalu
 *   lama melampaui kebiasaan normal, atau merekomendasikan jadwal maintenance."
 */
import { chatCompletionJSON } from '../../config/openrouter.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

export class InventoryAnomalyService {
    /**
     * Detect anomalies in current borrow situations.
     */
    async detectAnomalies() {
        // 1. Fetch active borrows (approved/dipinjam tapi belum dikembalikan)
        const { data: activeBorrows } = await supabaseAdmin
            .from('peminjaman_alat')
            .select('*, alat:alat_id(id, nama, kategori, last_maintenance), user:user_id(id, full_name)')
            .in('status', ['approved', 'dipinjam'])
            .is('actual_kembali', null);

        // 2. Fetch equipment needing maintenance
        const { data: allEquipment } = await supabaseAdmin
            .from('inventaris_alat')
            .select('id, nama, kategori, last_maintenance, next_maintenance, kondisi')
            .order('last_maintenance', { ascending: true, nullsFirst: true });

        // 3. Send to AI
        const systemPrompt = `Kamu adalah AI Inventory Anomaly Detector untuk ERP Pesantren Multimedia.
Tugasmu:
1. Deteksi alat yang dipinjam terlalu lama (>3 hari biasanya anomali untuk kamera/lighting)
2. Identifikasi alat yang perlu maintenance segera
3. Beri rekomendasi tindakan

Jawab dalam format JSON:
{
  "overdue_borrows": [
    { "alat_nama": "...", "peminjam": "...", "hari_dipinjam": 5, "severity": "high|medium|low", "suggestion": "..." }
  ],
  "maintenance_needed": [
    { "alat_nama": "...", "last_maintenance": "...", "recommendation": "..." }
  ],
  "summary": "Ringkasan singkat dalam bahasa Indonesia"
}`;

        const userPrompt = `Data Peminjaman Aktif:
${JSON.stringify(activeBorrows?.map(b => ({
            alat: b.alat?.nama,
            kategori: b.alat?.kategori,
            peminjam: b.user?.full_name,
            tanggal_pinjam: b.tanggal_pinjam,
            estimasi_kembali: b.estimasi_kembali,
            hari_dipinjam: Math.ceil((Date.now() - new Date(b.tanggal_pinjam).getTime()) / (1000 * 60 * 60 * 24)),
        })) || [], null, 2)}

Data Semua Alat:
${JSON.stringify(allEquipment?.map(e => ({
            nama: e.nama,
            kategori: e.kategori,
            kondisi: e.kondisi,
            last_maintenance: e.last_maintenance,
            next_maintenance: e.next_maintenance,
        })) || [], null, 2)}

Tanggal hari ini: ${new Date().toISOString().split('T')[0]}

Analisa anomali dan berikan rekomendasi.`;

        const result = await chatCompletionJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ], { max_tokens: 2048 });

        logger.info({ anomalies: result }, 'AI Inventory anomaly detection');
        return result;
    }
}
