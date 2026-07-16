import type { Env } from '../index';
import { getSupabaseClient } from '../index';
import { verifyAuth } from '../middleware/auth';

export async function handleAuth(request: Request, env: Env) {
  try {
    const url = new URL(request.url);
    const method = request.method;

    // 辅助函数：安全解析 JSON body
    async function safeJsonBody(): Promise<any> {
      try {
        const body = await request.json();
        return body;
      } catch (e) {
        return null;
      }
    }

    if (url.pathname === '/api/auth/register' && method === 'POST') {
      const body = await safeJsonBody();
      if (!body) {
        return new Response(JSON.stringify({ error: '请求体格式错误' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const { username, password, name } = body as { username: string; password: string; name: string };

      if (!username || !password) {
        return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const supabase = getSupabaseClient(env);

      // 检查用户名是否已存在
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: '用户名已存在' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // 密码哈希（Workers 环境用 Web Crypto API）
      const passwordHash = await hashPassword(password);

      // 插入用户
      const { data: user, error } = await supabase
        .from('users')
        .insert({ username, password_hash: passwordHash, name })
        .select('id, username, name')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      // 生成 JWT
      const token = await createJWT(user.id, env);

      return new Response(JSON.stringify({ token, user }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/api/auth/login' && method === 'POST') {
      const body = await safeJsonBody();
      if (!body) {
        return new Response(JSON.stringify({ error: '请求体格式错误' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const { username, password } = body as { username: string; password: string };

      const supabase = getSupabaseClient(env);
      const { data: user } = await supabase
        .from('users')
        .select('id, username, name, password_hash')
        .eq('username', username)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      // 验证密码
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const token = await createJWT(user.id, env);

      return new Response(JSON.stringify({
        token,
        user: { id: user.id, username: user.username, name: user.name },
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // GET /api/auth/me — 用 JWT 获取当前用户信息
    if (url.pathname === '/api/auth/me' && method === 'GET') {
      const auth = await verifyAuth(request, env);
      if (!auth) {
        return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      const supabase = getSupabaseClient(env);
      const { data: user } = await supabase
        .from('users')
        .select('id, username, name')
        .eq('id', auth.userId)
        .single();
      if (!user) {
        return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: '处理请求时出错', detail: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 密码哈希（SHA-256）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 简单 JWT（HMAC-SHA256）
async function createJWT(userId: string, env: Env): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天
  }));

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SUPABASE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payload}.${sig}`;
}
