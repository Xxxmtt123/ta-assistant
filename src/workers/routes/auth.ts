import type { Env } from '../index';
import { verifyAuth, signToken, hashPassword } from '../middleware/auth';

export async function handleAuth(request: Request, env: Env) {
  const url = new URL(request.url);
  const method = request.method;

  if (url.pathname === '/api/auth/register' && method === 'POST') {
    const { email, password, name } = await request.json() as { email: string; password: string; name: string };

    // 检查是否已注册
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return Response.json({ error: '该邮箱已注册' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).bind(id, email, passwordHash, name).run();

    const token = await signToken({ userId: id, email, name }, env.JWT_SECRET);
    return Response.json({ token, user: { id, email, name } });
  }

  if (url.pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await request.json() as { email: string; password: string };
    const passwordHash = await hashPassword(password);

    const user = await env.DB.prepare(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?'
    ).bind(email).first() as { id: string; email: string; name: string; password_hash: string } | undefined;

    if (!user || user.password_hash !== passwordHash) {
      return Response.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name }, env.JWT_SECRET);
    return Response.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  }

  return Response.json({ error: '未找到路由' }, { status: 404 });
}
