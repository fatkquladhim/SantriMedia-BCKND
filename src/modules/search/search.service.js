import { supabaseAdmin } from '../../config/supabase.js';

export class SearchService {
    async global(query, user) {
        if (!query || query.length < 2) return { users: [], tasks: [], divisions: [], platforms: [], equipment: [] };

        const results = {
            users: [],
            tasks: [],
            divisions: [],
            platforms: [],
            equipment: []
        };

        // 1. Search Users (Admin only)
        if (user.base_role === 'admin') {
            const { data: users } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(5);
            results.users = users || [];
        }

        // 2. Search Tasks (Filtered by user access - same logic as Tasks list)
        let tasksQuery = supabaseAdmin
            .from('tasks')
            .select('id, judul, status, divisi_id, platform_id')
            .ilike('judul', `%${query}%`)
            .limit(10);
            
        // Filter based on role
        if (user.base_role !== 'admin') {
            if (user.divisi_id) {
                tasksQuery = tasksQuery.eq('divisi_id', user.divisi_id);
            }
        }
        
        const { data: tasks } = await tasksQuery;
        results.tasks = tasks || [];

        // 3. Search Divisions/Platforms
        const { data: divisions } = await supabaseAdmin
            .from('divisi')
            .select('id, nama')
            .ilike('nama', `%${query}%`)
            .limit(5);
        results.divisions = divisions || [];

        const { data: platforms } = await supabaseAdmin
            .from('platform')
            .select('id, nama')
            .ilike('nama', `%${query}%`)
            .limit(5);
        results.platforms = platforms || [];
        
        // 4. Search Equipment
        const { data: equipment } = await supabaseAdmin
            .from('inventaris_alat')
            .select('id, nama, kategori, serial_number, is_available')
            .or(`nama.ilike.%${query}%,serial_number.ilike.%${query}%`)
            .limit(5);
        results.equipment = equipment || [];

        return results;
    }
}
