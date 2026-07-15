-- TA Assistant 数据库初始化脚本
-- 使用方式：wrangler d1 execute ta-assistant-db --remote --file=src/db/schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  semester TEXT DEFAULT 'spring',
  schedule_mode TEXT DEFAULT 'weekly',
  schedule_config TEXT DEFAULT '{}',
  total_sessions INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 学生表
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  student_id TEXT,
  phone TEXT,
  parent_name TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 课次表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'upcoming'
);

-- 成绩表
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  score REAL,
  time_used INTEGER,
  attendance TEXT DEFAULT 'present',
  online_homework INTEGER DEFAULT 0,
  offline_homework INTEGER DEFAULT 0,
  note TEXT
);

-- 反馈表
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT DEFAULT 'ai',
  char_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 照片表（base64 存储方案）
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  base_data TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/jpeg',
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 推送状态表
CREATE TABLE IF NOT EXISTS push_status (
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  photo_status TEXT DEFAULT 'pending',
  feedback_status TEXT DEFAULT 'draft',
  pushed_at TEXT,
  PRIMARY KEY (session_id, student_id)
);

-- 资料库资源表
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  file_size TEXT,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_session ON scores(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_student ON photos(student_id);
CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
