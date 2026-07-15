import type { Env } from '../index';
import { verifyAuth } from '../middleware/auth';

// 将 ArrayBuffer 转为 base64 字符串
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 将 base64 字符串转为 Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function handlePhotos(request: Request, env: Env) {
  const user = await verifyAuth(request, env);
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const url = new URL(request.url);
  const method = request.method;

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
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 读取文件为 ArrayBuffer 并转 base64
    const buffer = await file.arrayBuffer();
    const baseData = arrayBufferToBase64(buffer);

    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mimeType = file.type || 'image/jpeg';

    await env.DB.prepare(
      `INSERT INTO photos (id, student_id, session_id, type, base_data, mime_type, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, studentId, sessionId, type || 'homework', baseData, mimeType,
      parseInt(width || '0', 10), parseInt(height || '0', 10)
    ).run();

    return Response.json({
      success: true,
      id,
      thumbnailUrl: `/api/photos/view/${id}`,
    });
  }

  // ====== 查看单张照片 GET /api/photos/view/:id ======
  const viewMatch = url.pathname.match(/^\/api\/photos\/view\/(.+)$/);
  if (viewMatch && method === 'GET') {
    const id = viewMatch[1];
    const row = await env.DB.prepare(
      'SELECT base_data, mime_type FROM photos WHERE id = ?'
    ).bind(id).first<{ base_data: string; mime_type: string }>();

    if (!row) {
      return Response.json({ error: '照片不存在' }, { status: 404 });
    }

    const bytes = base64ToUint8Array(row.base_data);
    return new Response(bytes, {
      headers: {
        'Content-Type': row.mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // ====== 获取照片列表 GET /api/photos?sessionId=xxx ======
  if (url.pathname === '/api/photos' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: '缺少 sessionId' }, { status: 400 });

    // 查询照片元数据（不含 base_data）
    const { results } = await env.DB.prepare(
      'SELECT id, student_id, session_id, type, mime_type, width, height, created_at FROM photos WHERE session_id = ?'
    ).bind(sessionId).all();

    if (!results || results.length === 0) {
      return Response.json([]);
    }

    // 收集 studentId 用于批量查询学生姓名
    const studentIds = [...new Set(results.map((r: any) => r.student_id as string))];
    const studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const { results: studentResults } = await env.DB.prepare(
        `SELECT id, name FROM students WHERE id IN (${placeholders})`
      ).bind(...studentIds).all();
      for (const row of (studentResults || []) as any[]) {
        studentMap[row.id] = row.name;
      }
    }

    const photos = (results as any[]).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      sessionId: r.session_id,
      type: r.type,
      thumbnailUrl: `/api/photos/view/${r.id}`,
      url: `/api/photos/view/${r.id}`,
      width: r.width || 0,
      height: r.height || 0,
      createdAt: r.created_at,
      studentName: studentMap[r.student_id] || '未知学生',
    }));

    return Response.json(photos);
  }

  // ====== 获取照片完整数据（含 base_data）用于前端打包下载 GET /api/photos/data?sessionId=xxx ======
  if (url.pathname === '/api/photos/data' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: '缺少 sessionId' }, { status: 400 });

    // 查询照片完整数据（含 base_data）
    const { results } = await env.DB.prepare(
      'SELECT id, student_id, session_id, type, base_data, mime_type FROM photos WHERE session_id = ?'
    ).bind(sessionId).all();

    if (!results || results.length === 0) {
      return Response.json([]);
    }

    // 收集 studentId 用于批量查询学生姓名
    const studentIds = [...new Set((results as any[]).map((r) => r.student_id as string))];
    const studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const { results: studentResults } = await env.DB.prepare(
        `SELECT id, name FROM students WHERE id IN (${placeholders})`
      ).bind(...studentIds).all();
      for (const row of (studentResults || []) as any[]) {
        studentMap[row.id] = row.name;
      }
    }

    const photos = (results as any[]).map((r) => ({
      id: r.id,
      studentName: studentMap[r.student_id] || '未知学生',
      studentId: r.student_id,
      type: r.type,
      baseData: r.base_data,
      mimeType: r.mime_type || 'image/jpeg',
    }));

    return Response.json(photos);
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}