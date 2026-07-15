import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleSessions(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;
  const classId = url.searchParams.get('classId');

  if (url.pathname === '/api/sessions' && method === 'GET' && classId) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM sessions WHERE class_id = ? ORDER BY session_number'
    ).bind(classId).all();
    return Response.json(results);
  }

  if (url.pathname === '/api/sessions' && method === 'POST') {
    const data = await request.json() as {
      classId: string; sessionNumber: number; date: string;
      startTime?: string; endTime?: string; status?: string;
    };
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO sessions (id, class_id, session_number, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, data.classId, data.sessionNumber, data.date, data.startTime || '', data.endTime || '', data.status || 'upcoming').run();
    return Response.json({ id, success: true });
  }

  const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (match && method === 'PUT') {
    const data = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    if (data.date !== undefined) { sets.push('date = ?'); values.push(data.date); }
    if (data.startTime !== undefined) { sets.push('start_time = ?'); values.push(data.startTime); }
    if (data.endTime !== undefined) { sets.push('end_time = ?'); values.push(data.endTime); }
    if (sets.length > 0) { values.push(match[1]); await env.DB.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run(); }
    return Response.json({ success: true });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
