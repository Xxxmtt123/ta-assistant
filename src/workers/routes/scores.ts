import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleScores(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const supabase = getSupabaseClient(env);

  if (url.pathname === '/api/scores' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return new Response(JSON.stringify({ error: '缺少 sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/scores' && method === 'POST') {
    const data = await request.json() as {
      studentId: string; sessionId: string; score?: number; timeUsed?: number;
      attendance?: string; onlineHomework?: number; offlineHomework?: number; note?: string;
    };

    // Upsert：先删除再插入（scores 表有 UNIQUE 约束）
    await supabase
      .from('scores')
      .delete()
      .eq('student_id', data.studentId)
      .eq('session_id', data.sessionId);

    const { error } = await supabase
      .from('scores')
      .insert({
        student_id: data.studentId,
        session_id: data.sessionId,
        score: data.score ?? null,
        time_used: data.timeUsed ?? null,
        attendance: data.attendance || 'present',
        online_homework: data.onlineHomework ?? 0,
        offline_homework: data.offlineHomework ?? 0,
        note: data.note || '',
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/scores/batch' && method === 'POST') {
    const { scores } = await request.json() as { scores: Array<Record<string, unknown>> };

    for (const data of scores) {
      await supabase
        .from('scores')
        .delete()
        .eq('student_id', data.student_id)
        .eq('session_id', data.session_id);

      await supabase
        .from('scores')
        .insert({
          student_id: data.student_id,
          session_id: data.session_id,
          score: data.score ?? null,
          time_used: data.time_used ?? null,
          attendance: data.attendance || 'present',
          online_homework: data.online_homework ?? 0,
          offline_homework: data.offline_homework ?? 0,
          note: data.note || '',
        });
    }

    return new Response(JSON.stringify({ success: true, count: scores.length }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
