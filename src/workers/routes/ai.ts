import type { Env } from '../index';

// DeepSeek AI 代理路由
// 前端请求 → Workers 代理 → DeepSeek API
// API Key 存储在 Workers 环境变量中，不暴露到前端

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: object;
  model?: string;
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleAiProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method !== 'POST') {
    return jsonError('Method Not Allowed', 405);
  }

  // 从环境变量获取 DeepSeek API Key
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonError('AI 服务未配置，请在 Workers 环境变量中设置 DEEPSEEK_API_KEY', 503);
  }

  // 解析前端请求
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('请求体格式错误', 400);
  }

  const {
    messages,
    model: bodyModel,
    temperature = 0.7,
    max_tokens = 2048,
  } = body;

  if (!messages || messages.length === 0) {
    return jsonError('messages 不能为空', 400);
  }

  // 优先使用环境变量配置的模型，其次用前端传来的，最后兜底
  const model = env.DEEPSEEK_MODEL_ID || bodyModel || 'deepseek-chat';

  const chatBody: DeepSeekChatRequest = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  try {
    if (pathname === '/api/ai/chat' || pathname === '/api/ai/chat/') {
      // ====== 非流式 ======
      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(chatBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `DeepSeek API 错误 (${response.status})`;
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.error?.message || errJson.message || errorMsg;
        } catch { /* use default */ }
        return jsonError(errorMsg, response.status);
      }

      const data = (await response.json()) as DeepSeekChatResponse;

      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || null;

      return new Response(
        JSON.stringify({
          content,
          usage,
          model: data.model || model,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pathname === '/api/ai/chat/stream' || pathname === '/api/ai/chat/stream/') {
      // ====== 流式 SSE ======
      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...chatBody, stream: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `DeepSeek API 错误 (${response.status})`;
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.error?.message || errJson.message || errorMsg;
        } catch { /* use default */ }
        return jsonError(errorMsg, response.status);
      }

      // 直接透传 DeepSeek 的 SSE 流
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return jsonError('Not Found', 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求 DeepSeek API 失败';
    return jsonError(message, 500);
  }
}
