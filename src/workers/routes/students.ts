import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleStudents(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const classId = url.searchParams.get('classId');
  const supabase = getSupabaseClient(env);

  // 获取班级的学生列表
  if (url.pathname === '/api/students' && method === 'GET' && classId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } });
  }

  // 创建学生
  if (url.pathname === '/api/students' && method === 'POST') {
    const data = await request.json() as {
      classId: string; name: string; studentId?: string;
      phone?: string; parentName?: string; note?: string;
    };
    const { data: newStudent, error } = await supabase
      .from('students')
      .insert({
        class_id: data.classId,
        name: data.name,
        student_id: data.studentId || '',
        phone: data.phone || '',
        parent_name: data.parentName || '',
        note: data.note || '',
      })
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: newStudent?.id, success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 更新学生
  const match = url.pathname.match(/^\/api\/students\/([^/]+)$/);
  if (match && method === 'PUT') {
    const id = match[1];
    const data = await request.json();
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.studentId !== undefined) updates.student_id = data.studentId;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.parentName !== undefined) updates.parent_name = data.parentName;
    if (data.note !== undefined) updates.note = data.note;
    if (data.classId !== undefined) updates.class_id = data.classId;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 删除学生
  if (match && method === 'DELETE') {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', match[1]);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
