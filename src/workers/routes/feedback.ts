import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleFeedback(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const supabase = getSupabaseClient(env);

  if (url.pathname === '/api/feedback' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return new Response(JSON.stringify({ error: '缺少 sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/feedback' && method === 'POST') {
    const data = await request.json() as {
      studentId: string; sessionId: string; content: string;
      templateType?: string; charCount?: number; status?: string;
    };

    // Upsert
    await supabase
      .from('feedback')
      .delete()
      .eq('student_id', data.studentId)
      .eq('session_id', data.sessionId);

    const { error } = await supabase
      .from('feedback')
      .insert({
        student_id: data.studentId,
        session_id: data.sessionId,
        content: data.content,
        template_type: data.templateType || '',
        char_count: data.charCount || data.content.length,
        status: data.status || 'draft',
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/feedback/batch' && method === 'POST') {
    const { feedback } = await request.json() as { feedback: Array<Record<string, unknown>> };

    for (const data of feedback) {
      await supabase
        .from('feedback')
        .delete()
        .eq('student_id', data.student_id)
        .eq('session_id', data.session_id);

      await supabase
        .from('feedback')
        .insert({
          student_id: data.student_id,
          session_id: data.session_id,
          content: data.content,
          template_type: data.template_type || '',
          char_count: data.char_count || 0,
          status: data.status || 'draft',
        });
    }

    return new Response(JSON.stringify({ success: true, count: feedback.length }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
