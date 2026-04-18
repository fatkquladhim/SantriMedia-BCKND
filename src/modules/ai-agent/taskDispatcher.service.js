/**
 * AI Task Dispatcher Service
 * Uses OpenRouter to recommend which member should receive a new task.
 * Referensi PRD: "AI membantu Ketua Divisi merekomendasikan siapa anggota
 *   yang paling 'luang' untuk diberikan tugas baru berdasarkan beban kerja aktif."
 */
import { chatCompletionJSON } from '../../config/openrouter.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../shared/logger.js';

export class TaskDispatcherService {
    /**
     * Recommend the best member(s) to assign a task to.
     * @param {string} divisiId — scope to specific divisi
     * @param {string} taskDescription — the task to be assigned
     * @returns {Promise<object>} — AI recommendation
     */
    async recommendAssignment(divisiId, taskDescription) {
        // 1. Fetch active workload for all members in the divisi
        const { data: members } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, nomor_induk')
            .eq('divisi_id', divisiId)
            .eq('base_role', 'user')
            .eq('is_profile_complete', true);

        if (!members || members.length === 0) {
            return { recommendation: 'Tidak ada anggota di divisi ini.', members: [] };
        }

        // 2. Get active task count for each member
        const workloads = await Promise.all(
            members.map(async (member) => {
                const { count } = await supabaseAdmin
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('assigned_to', member.id)
                    .in('status', ['todo', 'in_progress', 'review']);

                return {
                    id: member.id,
                    name: member.full_name,
                    nomor_induk: member.nomor_induk,
                    active_tasks: count || 0,
                };
            })
        );

        // 3. Send to OpenRouter AI for recommendation
        const systemPrompt = `Kamu adalah AI Task Dispatcher untuk ERP Pesantren Multimedia.
Tugasmu adalah merekomendasikan anggota terbaik untuk menerima tugas baru.
Pertimbangkan beban kerja aktif (semakin sedikit = semakin prioritas).
Jawab dalam format JSON:
{
  "recommended_member_id": "uuid",
  "recommended_name": "nama",
  "reason": "alasan singkat dalam bahasa Indonesia",
  "workload_summary": [{ "name": "nama", "active_tasks": 3 }]
}`;

        const userPrompt = `Deskripsi tugas baru: "${taskDescription}"

Data beban kerja anggota divisi:
${JSON.stringify(workloads, null, 2)}

Siapa yang paling tepat menerima tugas ini?`;

        const result = await chatCompletionJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);

        logger.info({ divisiId, recommendation: result }, 'AI Task Dispatcher recommendation');
        return result;
    }
}
