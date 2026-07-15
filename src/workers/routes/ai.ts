import type { Env } from '../index';

// 豆包（火山方舟）AI 代理路由
// 前端请求 → Workers 代理 → 豆包 API
// API Key 存储在 Workers 环境变量中，不暴露到前端

const DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface AiProxyRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function handleAiProxy(request: Request, env: Env): Promise<Response> {
  // 从环境变量获取豆包 API Key
  const apiKey = env.DOUBAO_API_KEY;
  if (!apiKey) {
    return Response.json(
      { success: false, error: 'AI 服务未配置，请在 Workers 环境变量中设置 DOUBAO_API_KEY' },
      { status: 503 }
    );
  }

  // 解析前端请求
  let body: AiProxyRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: '请求体格式错误' }, { status: 400 });
  }

  const {
    messages,
    model: bodyModel,
    temperature = 0.7,
    max_tokens = 2048,
  } = body;

  // 优先使用环境变量配置的模型（通常是 Endpoint ID），其次用前端传来的，最后兜底
  const model = env.DOUBAO_MODEL_ID || bodyModel || 'doubao-1-5-pro-32k';

  if (!messages || messages.length === 0) {
    return Response.json({ success: false, error: 'messages 不能为空' }, { status: 400 });
  }

  // 构造豆包 API 请求
  const chatBody: ChatRequest = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  try {
    const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(chatBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `豆包 API 错误 (${response.status})`;
      try {
        const errJson = JSON.parse(errorText);
        errorMsg = errJson.error?.message || errJson.message || errorMsg;
      } catch { /* use default */ }
      return Response.json({ success: false, error: errorMsg }, { status: response.status });
    }

    const data = await response.json();

    // 提取 AI 回复内容
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || null;

    return Response.json({
      success: true,
      data: {
        content,
        usage,
        model: data.model || model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求豆包 API 失败';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
