-- D1 数据库建表语句

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  semester TEXT DEFAULT 'spring',
  schedule_mode TEXT DEFAULT 'weekly',
  schedule_config TEXT DEFAULT '{}',
  total_sessions INTEGER DEFAULT 20,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  name TEXT NOT NULL,
  student_id TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  session_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  status TEXT DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  score INTEGER DEFAULT NULL,
  time_used INTEGER DEFAULT NULL,
  attendance TEXT DEFAULT 'present',
  online_homework INTEGER DEFAULT 0,
  offline_homework INTEGER DEFAULT 0,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  content TEXT NOT NULL DEFAULT '',
  template_type TEXT DEFAULT '',
  char_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now'))
);