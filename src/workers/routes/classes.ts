import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleClasses(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;

  // 获取用户所有班级
  if (url.pathname === '/api/classes' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM classes WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.userId).all();
    return Response.json(results);
  }

  // 创建班级
  if (url.pathname === '/api/classes' && method === 'POST') {
    const data = await request.json() as {
      name: string; semester?: string; scheduleMode?: string;
      scheduleConfig?: string; totalSessions?: number;
    };
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO classes (id, user_id, name, semester, schedule_mode, schedule_config, total_sessions) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, user.userId, data.name,
      data.semester || 'spring', data.scheduleMode || 'weekly',
      data.scheduleConfig || '{}', data.totalSessions || 20
    ).run();
    return Response.json({ id, success: true });
  }

  // 更新班级
  const match = url.pathname.match(/^\/api\/classes\/([^/]+)$/);
  if (match && method === 'PUT') {
    const id = match[1];
    const data = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.semester !== undefined) { sets.push('semester = ?'); values.push(data.semester); }
    if (data.scheduleMode !== undefined) { sets.push('schedule_mode = ?'); values.push(data.scheduleMode); }
    if (data.scheduleConfig !== undefined) { sets.push('schedule_config = ?'); values.push(data.scheduleConfig); }
    if (data.totalSessions !== undefined) { sets.push('total_sessions = ?'); values.push(data.totalSessions); }

    if (sets.length > 0) {
      values.push(id);
      await env.DB.prepare(`UPDATE classes SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
    }
    return Response.json({ success: true });
  }

  // 删除班级
  if (match && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM classes WHERE id = ? AND user_id = ?').bind(match[1], user.userId).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
