import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleClasses(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const supabase = getSupabaseClient(env);

  // 获取用户所有班级
  if (url.pathname === '/api/classes' && method === 'GET') {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } });
  }

  // 创建班级
  if (url.pathname === '/api/classes' && method === 'POST') {
    const data = await request.json() as {
      name: string; semester?: string; scheduleMode?: string;
      scheduleConfig?: string; totalSessions?: number;
    };
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        user_id: user.userId,
        name: data.name,
        semester: data.semester || 'spring',
        schedule_mode: data.scheduleMode || 'weekly',
        schedule_config: data.scheduleConfig || '{}',
        total_sessions: data.totalSessions || 20,
      })
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: newClass?.id, success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 更新班级
  const match = url.pathname.match(/^\/api\/classes\/([^/]+)$/);
  if (match && method === 'PUT') {
    const id = match[1];
    const data = await request.json();
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.semester !== undefined) updates.semester = data.semester;
    if (data.scheduleMode !== undefined) updates.schedule_mode = data.scheduleMode;
    if (data.scheduleConfig !== undefined) updates.schedule_config = data.scheduleConfig;
    if (data.totalSessions !== undefined) updates.total_sessions = data.totalSessions;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 删除班级
  if (match && method === 'DELETE') {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', match[1])
      .eq('user_id', user.userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
