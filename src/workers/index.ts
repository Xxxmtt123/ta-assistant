import { createClient } from '@supabase/supabase-js';
import { handleAuth } from './routes/auth';
import { handleClasses } from './routes/classes';
import { handleStudents } from './routes/students';
import { handleSessions } from './routes/sessions';
import { handleScores } from './routes/scores';
import { handleFeedback } from './routes/feedback';
import { handlePhotos } from './routes/photos';
import { handleAiProxy } from './routes/ai';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  DOUBAO_API_KEY: string;
  DOUBAO_MODEL_ID: string;
}

// 创建 Supabase 客户端的辅助函数
export function getSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const method = request.method;

      // CORS 预检
      if (method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      // 健康检查
      if (pathname === '/api/health') {
        return jsonResponse({ ok: true, time: Date.now() });
      }

      let response: Response | null = null;

      // 认证路由
      if (pathname.startsWith('/api/auth')) {
        response = await handleAuth(request, env);
      }
      // 班级路由
      else if (pathname.startsWith('/api/classes')) {
        response = await handleClasses(request, env);
      }
      // 学生路由
      else if (pathname.startsWith('/api/students')) {
        response = await handleStudents(request, env);
      }
      // 课次路由
      else if (pathname.startsWith('/api/sessions')) {
        response = await handleSessions(request, env);
      }
      // 成绩路由
      else if (pathname.startsWith('/api/scores')) {
        response = await handleScores(request, env);
      }
      // 反馈路由
      else if (pathname.startsWith('/api/feedback')) {
        response = await handleFeedback(request, env);
      }
      // 照片路由（也包含头像上传 /api/avatars/upload）
      else if (pathname.startsWith('/api/photos') || pathname.startsWith('/api/avatars')) {
        response = await handlePhotos(request, env);
      }
      // AI 路由
      else if (pathname.startsWith('/api/ai')) {
        response = await handleAiProxy(request, env);
      }

      if (!response) {
        return corsJsonResponse({ error: 'Not Found' }, 404);
      }

      // 添加 CORS 头
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, { status: response.status, headers });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};

function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function corsJsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
