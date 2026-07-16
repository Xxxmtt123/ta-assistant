import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handlePhotos(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const method = request.method;
  const supabase = getSupabaseClient(env);

  // ====== 上传照片 POST /api/photos/upload ======
  if (url.pathname === '/api/photos/upload' && method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('studentId') as string;
    const sessionId = formData.get('sessionId') as string;
    const type = formData.get('type') as string;
    const width = formData.get('width') as string;
    const height = formData.get('height') as string;

    if (!file || !studentId || !sessionId) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 读取文件为 ArrayBuffer
    const fileData = await file.arrayBuffer();
    const mimeType = file.type || 'image/jpeg';

    // 上传照片到 Supabase Storage
    const fileName = `${studentId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, fileData, { contentType: mimeType });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 保存记录到 photos 表
    const { data: photoRecord, error: dbError } = await supabase
      .from('photos')
      .insert({
        student_id: studentId,
        session_id: sessionId,
        type: type || 'homework',
        bucket: 'photos',
        path: fileName,
        url: publicUrl,
        mime_type: mimeType,
        width: parseInt(width || '0', 10),
        height: parseInt(height || '0', 10),
      })
      .select('id')
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      id: photoRecord?.id,
      thumbnailUrl: publicUrl,
      url: publicUrl,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ====== 上传头像 POST /api/avatars/upload?studentId=xxx ======
  if (url.pathname === '/api/avatars/upload' && method === 'POST') {
    const studentId = url.searchParams.get('studentId');
    if (!studentId) {
      return new Response(JSON.stringify({ error: '缺少 studentId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: '缺少文件' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const fileData = await file.arrayBuffer();
    const mimeType = file.type || 'image/jpeg';
    const fileName = `avatars/${studentId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, fileData, { contentType: mimeType });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

    // 更新学生的 avatar_url
    const { error: dbError } = await supabase
      .from('students')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', studentId);

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ====== 获取照片列表 GET /api/photos?sessionId=xxx ======
  if (url.pathname === '/api/photos' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return new Response(JSON.stringify({ error: '缺少 sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // 查询照片元数据
    const { data: results, error } = await supabase
      .from('photos')
      .select('id, student_id, session_id, type, url, mime_type, width, height, path, created_at')
      .eq('session_id', sessionId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!results || results.length === 0) {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }

    // 收集 studentId 用于批量查询学生姓名
    const studentIds = [...new Set(results.map((r: any) => r.student_id as string))];
    const studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const { data: studentResults } = await supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds);
      for (const row of (studentResults || []) as any[]) {
        studentMap[row.id] = row.name;
      }
    }

    const photos = results.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      sessionId: r.session_id,
      type: r.type,
      thumbnailUrl: r.url || '',
      url: r.url || '',
      width: r.width || 0,
      height: r.height || 0,
      path: r.path || '',
      createdAt: r.created_at,
      studentName: studentMap[r.student_id] || '未知学生',
    }));

    return new Response(JSON.stringify(photos), { headers: { 'Content-Type': 'application/json' } });
  }

  // ====== 删除单张照片 DELETE /api/photos/:id ======
  if (url.pathname.match(/^\/api\/photos\/[\w-]+$/) && method === 'DELETE') {
    const photoId = url.pathname.split('/').pop();

    // 先获取照片记录（需要 path 字段来删除 Storage 文件）
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('id, path')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return new Response(JSON.stringify({ error: '照片不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 删除 Storage 文件
    if (photo.path) {
      await supabase.storage.from('photos').remove([photo.path]);
    }

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ====== 获取最近照片（用于实时同步） GET /api/photos/recent?classId=xxx ======
  if (url.pathname === '/api/photos/recent' && method === 'GET') {
    const classId = url.searchParams.get('classId');
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    let sessionIds: string[] = [];
    if (classId) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('class_id', classId);
      sessionIds = (sessions || []).map((s: any) => s.id);
    }

    let query = supabase
      .from('photos')
      .select('id, student_id, session_id, type, url, mime_type, width, height, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (sessionIds.length > 0) {
      query = query.in('session_id', sessionIds);
    }

    const { data: results, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 批量查学生姓名
    const recentStudentIds = [...new Set((results || []).map((r: any) => r.student_id))];
    const recentStudentMap: Record<string, string> = {};
    if (recentStudentIds.length > 0) {
      const { data: studentResults } = await supabase
        .from('students')
        .select('id, name')
        .in('id', recentStudentIds);
      for (const row of (studentResults || []) as any[]) {
        recentStudentMap[row.id] = row.name;
      }
    }

    const recentPhotos = (results || []).map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      sessionId: r.session_id,
      type: r.type,
      thumbnailUrl: r.url || '',
      url: r.url || '',
      width: r.width || 0,
      height: r.height || 0,
      createdAt: r.created_at,
      studentName: recentStudentMap[r.student_id] || '未知学生',
    }));

    return new Response(JSON.stringify(recentPhotos), { headers: { 'Content-Type': 'application/json' } });
  }

  // ====== 获取照片数据用于前端打包下载 GET /api/photos/data?sessionId=xxx ======
  if (url.pathname === '/api/photos/data' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return new Response(JSON.stringify({ error: '缺少 sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // 查询照片元数据
    const { data: results, error } = await supabase
      .from('photos')
      .select('id, student_id, session_id, type, url, mime_type')
      .eq('session_id', sessionId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!results || results.length === 0) {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }

    // 收集 studentId 用于批量查询学生姓名
    const studentIds = [...new Set(results.map((r: any) => r.student_id as string))];
    const studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const { data: studentResults } = await supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds);
      for (const row of (studentResults || []) as any[]) {
        studentMap[row.id] = row.name;
      }
    }

    // 由于照片存储在 Supabase Storage 中，前端可以直接通过 URL 下载
    // 此接口返回元数据和公开 URL，不再返回 base64
    const photos = results.map((r: any) => ({
      id: r.id,
      studentName: studentMap[r.student_id] || '未知学生',
      studentId: r.student_id,
      type: r.type,
      url: r.url || '',
      mimeType: r.mime_type || 'image/jpeg',
    }));

    return new Response(JSON.stringify(photos), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
