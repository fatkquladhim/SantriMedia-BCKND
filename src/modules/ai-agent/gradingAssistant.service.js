/**
 * AI Grading Assistant Service
 * Uses OpenRouter to recommend grades based on technical + asrama performance.
 * Referensi PRD: "Agen ini mengumpulkan variabel (Jumlah tugas x Ketepatan waktu)
 *   + (Nilai Asrama dari Kepala Asrama) dan memunculkan rekomendasi Grade."
 */
import { chatCompletionJSON } from '../../config/openrouter.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';
import { getCurrentPeriod } from '../../shared/dateUtils.js';

export class GradingAssistantService {
    /**
     * Generate AI-powered grade recommendation for a member.
     */
    async recommendGrade(userId, periode) {
        const targetPeriode = periode || getCurrentPeriod();

        // 1. Fetch completed tasks in the period
        const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('id, judul, status, deadline, completed_at, created_at')
            .eq('assigned_to', userId)
            .gte('created_at', `${targetPeriode}-01`)
            .lt('created_at', this._nextMonth(targetPeriode));

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const onTimeTasks = tasks?.filter(t =>
            t.status === 'done' && t.deadline && new Date(t.completed_at) <= new Date(t.deadline)
        ).length || 0;

        // 2. Fetch evaluasi asrama
        const { data: evaluations } = await supabaseAdmin
            .from('evaluasi_asrama')
            .select('kategori, skor, catatan')
            .eq('santri_id', userId)
            .eq('bulan_evaluasi', targetPeriode);

        const avgAsrama = evaluations?.length
            ? evaluations.reduce((sum, e) => sum + (e.skor || 0), 0) / evaluations.length
            : null;

        // 3. Fetch member info
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, nomor_induk')
            .eq('id', userId)
            .single();

        // 4. Send to AI
        const systemPrompt = `Kamu adalah AI Grading Assistant untuk ERP Pesantren Multimedia.
Tugasmu adalah merekomendasikan Grade (A/B/C/D) berdasarkan performa teknis dan nilai asrama.

Kriteria:
- A: Performa sangat baik (>90% on-time, skor asrama >80)
- B: Performa baik (>70% on-time, skor asrama >60)
- C: Performa cukup (>50% on-time, skor asrama >40)
- D: Performa kurang (<50% on-time atau skor asrama <40)

Jawab dalam format JSON:
{
  "recommended_grade": "A",
  "skor_teknis": 85.5,
  "skor_asrama": 78.0,
  "skor_final": 82.0,
  "catatan_ai": "Penjelasan singkat dalam bahasa Indonesia"
}`;

        const userPrompt = `Anggota: ${profile?.full_name} (${profile?.nomor_induk})
Periode: ${targetPeriode}

Data Teknis:
- Total tugas: ${totalTasks}
- Selesai: ${completedTasks}
- Tepat waktu: ${onTimeTasks}
- On-time rate: ${totalTasks > 0 ? ((onTimeTasks / totalTasks) * 100).toFixed(1) : 0}%

Data Asrama:
- Jumlah evaluasi: ${evaluations?.length || 0}
- Rata-rata skor: ${avgAsrama !== null ? avgAsrama.toFixed(1) : 'Belum ada evaluasi'}
- Detail: ${JSON.stringify(evaluations || [])}

Berikan rekomendasi grade.`;

        const result = await chatCompletionJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);

        logger.info({ userId, periode: targetPeriode, grade: result }, 'AI Grading recommendation');
        return result;
    }

    _nextMonth(periode) {
        const [year, month] = periode.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    }
}
