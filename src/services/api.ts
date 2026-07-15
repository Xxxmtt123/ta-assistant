import type { User, Class, Student, Session, Score, Feedback, Photo } from '@/types';

// 本地开发走 Vite proxy（/api → http://127.0.0.1:8787）
// 生产环境指向 Cloudflare Workers
const API_BASE = import.meta.env.VITE_API_BASE || 'https://ta-assistant-api.2144961248.workers.dev';

function getToken(): string | null {
  return localStorage.getItem('ta_token');
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('ta_token');
      window.location.href = '/login';
      throw new Error('登录已过期，请重新登录');
    }
    const error = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ====== 认证 ======
export const authApi = {
  register: (username: string, password: string, name: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<User>('/api/auth/me'),
};

// ====== 班级 ======
export const classApi = {
  list: () => request<Class[]>('/api/classes'),
  create: (data: Partial<Class>) =>
    request<Class>('/api/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Class>) =>
    request<Class>(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/classes/${id}`, { method: 'DELETE' }),
  getStudents: (id: string) => request<Student[]>(`/api/classes/${id}/students`),
};

// ====== 学生 ======
export const studentApi = {
  create: (data: Partial<Student> & { classId: string }) =>
    request<Student>('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Student>) =>
    request<Student>(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/students/${id}`, { method: 'DELETE' }),
};

// ====== 课次 ======
export const sessionApi = {
  list: (classId: string) => request<Session[]>(`/api/sessions?classId=${classId}`),
};

// ====== 成绩 ======
export const scoreApi = {
  list: (sessionId: string) => request<Score[]>(`/api/scores?sessionId=${sessionId}`),
  batch: (scores: Partial<Score>[]) =>
    request<void>('/api/scores/batch', { method: 'POST', body: JSON.stringify({ scores }) }),
};

// ====== 反馈 ======
export const feedbackApi = {
  list: (sessionId?: string) => request<Feedback[]>(`/api/feedback${sessionId ? `?sessionId=${sessionId}` : ''}`),
  save: (data: Partial<Feedback>) =>
    request<Feedback>('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
};

// ====== 照片 ======
export const photoApi = {
  upload: async (file: File, studentId: string, sessionId: string, type: 'homework' | 'quiz', width?: number, height?: number) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    formData.append('sessionId', sessionId);
    formData.append('type', type);
    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));

    const res = await fetch(`${API_BASE}/api/photos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) throw new Error('照片上传失败');
    return res.json() as Promise<{ success: boolean; id: string; thumbnailUrl: string; url: string }>;
  },
  getBySession: (sessionId: string) => request<Photo[]>(`/api/photos?sessionId=${sessionId}`),
  // 获取照片数据用于打包下载（现在返回 URL 而非 base64）
  getDataForDownload: (sessionId: string) => request<Array<{ id: string; studentName: string; studentId: string; type: string; url: string; mimeType: string }>>(`/api/photos/data?sessionId=${sessionId}`),
};

// ====== AI（DeepSeek）======
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const BUILT_IN_API_KEY = 'sk-64e07e9929c24381a5f761a3c19fb7d8';
const BUILT_IN_MODEL = 'deepseek-chat';

function getAiConfig(): { apiKey: string; modelId: string } {
  const apiKey = localStorage.getItem('ta_ai_api_key') || BUILT_IN_API_KEY;
  const modelId = localStorage.getItem('ta_ai_model') || BUILT_IN_MODEL;
  return { apiKey, modelId };
}

export const aiApi = {
  chat: async (messages: Array<{ role: string; content: string }>, options?: { model?: string; temperature?: number; max_tokens?: number }) => {
    const config = getAiConfig();
    const model = options?.model || config.modelId;

    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new Error(err.error?.message || `DeepSeek API 错误 (${res.status})`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
      model: data.model || model,
    };
  },

  // 流式输出（打字机效果）
  chatStream: (
    messages: Array<{ role: string; content: string }>,
    onChunk: (text: string) => void,
    options?: { model?: string; temperature?: number; max_tokens?: number },
    signal?: AbortSignal,
  ): Promise<string> => {
    const config = getAiConfig();
    const model = options?.model || config.modelId;

    return fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2048,
        stream: true,
      }),
      signal,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        throw new Error(err.error?.message || `DeepSeek API 错误 (${res.status})`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(fullContent);
            }
          } catch { /* skip invalid JSON */ }
        }
      }

      return fullContent;
    });
  },
};
