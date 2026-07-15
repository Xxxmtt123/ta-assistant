import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleStudents(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;
  const classId = url.searchParams.get('classId');

  // 获取班级的学生列表
  if (url.pathname === '/api/students' && method === 'GET' && classId) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM students WHERE class_id = ? ORDER BY name'
    ).bind(classId).all();
    return Response.json(results);
  }

  // 创建学生
  if (url.pathname === '/api/students' && method === 'POST') {
    const data = await request.json() as {
      classId: string; name: string; studentId?: string;
      phone?: string; parentName?: string; note?: string;
    };
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO students (id, class_id, name, student_id, phone, parent_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, data.classId, data.name, data.studentId || '', data.phone || '', data.parentName || '', data.note || '').run();
    return Response.json({ id, success: true });
  }

  // 更新学生
  const match = url.pathname.match(/^\/api\/students\/([^/]+)$/);
  if (match && method === 'PUT') {
    const id = match[1];
    const data = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.studentId !== undefined) { sets.push('student_id = ?'); values.push(data.studentId); }
    if (data.phone !== undefined) { sets.push('phone = ?'); values.push(data.phone); }
    if (data.parentName !== undefined) { sets.push('parent_name = ?'); values.push(data.parentName); }
    if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note); }
    if (data.classId !== undefined) { sets.push('class_id = ?'); values.push(data.classId); }

    if (sets.length > 0) {
      values.push(id);
      await env.DB.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
    }
    return Response.json({ success: true });
  }

  // 删除学生
  if (match && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(match[1]).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
