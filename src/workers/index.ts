import { Router } from 'itty-router';
import { handleAuth } from './routes/auth';
import { handleClasses } from './routes/classes';
import { handleStudents } from './routes/students';
import { handleSessions } from './routes/sessions';
import { handleScores } from './routes/scores';
import { handleFeedback } from './routes/feedback';
import { handlePhotos } from './routes/photos';
import { handleAiProxy } from './routes/ai';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  DOUBAO_API_KEY: string;
  DOUBAO_MODEL_ID: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, semester TEXT DEFAULT 'spring', schedule_mode TEXT DEFAULT 'weekly', schedule_config TEXT DEFAULT '{}', total_sessions INTEGER DEFAULT 0, student_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, name TEXT NOT NULL, student_id TEXT, phone TEXT, parent_name TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, session_number INTEGER NOT NULL, date TEXT NOT NULL, start_time TEXT, end_time TEXT, status TEXT DEFAULT 'upcoming');
CREATE TABLE IF NOT EXISTS scores (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, session_id TEXT NOT NULL, score REAL, time_used INTEGER, attendance TEXT DEFAULT 'present', online_homework INTEGER DEFAULT 0, offline_homework INTEGER DEFAULT 0, note TEXT);
CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, session_id TEXT NOT NULL, content TEXT NOT NULL, template_type TEXT DEFAULT 'ai', char_count INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, session_id TEXT NOT NULL, type TEXT NOT NULL, base_data TEXT NOT NULL, mime_type TEXT DEFAULT 'image/jpeg', width INTEGER DEFAULT 0, height INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS push_status (session_id TEXT NOT NULL, student_id TEXT NOT NULL, photo_status TEXT DEFAULT 'pending', feedback_status TEXT DEFAULT 'draft', pushed_at TEXT, PRIMARY KEY (session_id, student_id));
CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, url TEXT NOT NULL, description TEXT, file_size TEXT, tags TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_session ON scores(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_student ON photos(student_id);
CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
`;

const router = Router({ base: '/api' });

// 认证路由（无需登录）
router.post('/auth/register', handleAuth);
router.post('/auth/login', handleAuth);

// 业务路由（需要 JWT 验证）
router
  .all('/classes/*', handleClasses)
  .all('/students/*', handleStudents)
  .all('/sessions/*', handleSessions)
  .all('/scores/*', handleScores)
  .all('/feedback/*', handleFeedback)
  .all('/photos/*', handlePhotos)
  .all('/photos', handlePhotos);

// AI 代理路由（需要 JWT 验证）
router.post('/ai/chat', handleAiProxy);

// CORS 预检请求
router.options('*', () => new Response(null, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
}));

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // 自动初始化数据库（仅本地开发）
    if (url.pathname === '/api/db/init') {
      try {
        await env.DB.prepare(SCHEMA_SQL).run();
        return Response.json({ ok: true, message: '数据库初始化成功' });
      } catch (e) {
        return Response.json({ ok: false, error: String(e) });
      }
    }

    // 添加 CORS 头
    const response = await router.handle(request, env);
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, headers });
  },
};
