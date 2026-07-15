import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleScores(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;

  if (url.pathname === '/api/scores' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: '缺少 sessionId' }, { status: 400 });
    const { results } = await env.DB.prepare(
      'SELECT * FROM scores WHERE session_id = ?'
    ).bind(sessionId).all();
    return Response.json(results);
  }

  if (url.pathname === '/api/scores' && method === 'POST') {
    const data = await request.json() as {
      studentId: string; sessionId: string; score?: number; timeUsed?: number;
      attendance?: string; onlineHomework?: number; offlineHomework?: number; note?: string;
    };
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO scores (id, student_id, session_id, score, time_used, attendance, online_homework, offline_homework, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, data.studentId, data.sessionId, data.score ?? null, data.timeUsed ?? null, data.attendance || 'present', data.onlineHomework ?? 0, data.offlineHomework ?? 0, data.note || '').run();
    return Response.json({ id, success: true });
  }

  if (url.pathname === '/api/scores/batch' && method === 'POST') {
    const { scores } = await request.json() as { scores: Array<Record<string, unknown>> };
    for (const data of scores) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO scores (id, student_id, session_id, score, time_used, attendance, online_homework, offline_homework, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, data.student_id, data.session_id, data.score ?? null, data.time_used ?? null, data.attendance || 'present', data.online_homework ?? 0, data.offline_homework ?? 0, data.note || '').run();
    }
    return Response.json({ success: true, count: scores.length });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
