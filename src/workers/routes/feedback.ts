import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleFeedback(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;

  if (url.pathname === '/api/feedback' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: '缺少 sessionId' }, { status: 400 });
    const { results } = await env.DB.prepare(
      'SELECT * FROM feedback WHERE session_id = ?'
    ).bind(sessionId).all();
    return Response.json(results);
  }

  if (url.pathname === '/api/feedback' && method === 'POST') {
    const data = await request.json() as {
      studentId: string; sessionId: string; content: string;
      templateType?: string; charCount?: number; status?: string;
    };
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO feedback (id, student_id, session_id, content, template_type, char_count, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, data.studentId, data.sessionId, data.content, data.templateType || '', data.charCount || data.content.length, data.status || 'draft').run();
    return Response.json({ id, success: true });
  }

  if (url.pathname === '/api/feedback/batch' && method === 'POST') {
    const { feedback } = await request.json() as { feedback: Array<Record<string, unknown>> };
    for (const data of feedback) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO feedback (id, student_id, session_id, content, template_type, char_count, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, data.student_id, data.session_id, data.content, data.template_type || '', data.char_count || 0, data.status || 'draft').run();
    }
    return Response.json({ success: true, count: feedback.length });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
