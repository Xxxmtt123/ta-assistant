import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleSessions(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const classId = url.searchParams.get('classId');
  const supabase = getSupabaseClient(env);

  if (url.pathname === '/api/sessions' && method === 'GET' && classId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('class_id', classId)
      .order('session_number');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/sessions' && method === 'POST') {
    const data = await request.json() as {
      classId: string; sessionNumber: number; date: string;
      startTime?: string; endTime?: string; status?: string;
    };
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        class_id: data.classId,
        session_number: data.sessionNumber,
        date: data.date,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        status: data.status || 'upcoming',
      })
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: newSession?.id, success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (match && method === 'PUT') {
    const data = await request.json();
    const updates: Record<string, unknown> = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.date !== undefined) updates.date = data.date;
    if (data.startTime !== undefined) updates.start_time = data.startTime;
    if (data.endTime !== undefined) updates.end_time = data.endTime;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', match[1]);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
