export interface JwtPayload {
  userId: string;
}

// 从请求中提取并验证 JWT（使用 Web Crypto API，不依赖 jose）
export async function verifyAuth(request: Request, env: { SUPABASE_KEY: string }): Promise<JwtPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    // 验证签名
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.SUPABASE_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    // 解析 payload
    const payload = JSON.parse(atob(payloadB64));

    // 检查过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}
