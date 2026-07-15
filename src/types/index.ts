// ====== 班级 ======
export interface Class {
  id: string;
  userId: string;
  name: string;
  semester: 'spring' | 'summer' | 'autumn' | 'winter';
  scheduleMode: 'weekly' | 'continuous';
  scheduleConfig: ScheduleConfig;
  totalSessions: number;
  studentCount?: number;
  createdAt: string;
}

export interface ScheduleConfig {
  days?: number[]; // 0-6, 周一到周日
  startTime?: string;
  endTime?: string;
  continuousDates?: string[];
}

// ====== 学生 ======
export interface Student {
  id: string;
  classId: string;
  name: string;
  studentId: string;
  phone: string;
  parentName: string;
  note: string;
  createdAt: string;
}

// ====== 课次 ======
export interface Session {
  id: string;
  classId: string;
  sessionNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'today' | 'done' | 'absent';
}

// ====== 成绩 ======
export interface Score {
  id: string;
  studentId: string;
  sessionId: string;
  score: number | null;
  timeUsed: number | null;
  attendance: 'present' | 'absent' | 'late' | 'leave';
  onlineHomework: number;
  offlineHomework: number;
  note: string;
}

// ====== 反馈 ======
export interface Feedback {
  id: string;
  studentId: string;
  sessionId: string;
  content: string;
  templateType: string;
  charCount: number;
  status: 'draft' | 'pushed' | 'failed';
  createdAt: string;
}

// ====== 照片 ======
export interface Photo {
  id: string;
  studentId: string;
  sessionId: string;
  type: 'homework' | 'quiz';
  thumbnailUrl?: string; // 后端返回 /api/photos/view/{id}
  url?: string;           // 同 thumbnailUrl
  width: number;
  height: number;
  createdAt: string;
  studentName?: string;   // 后端返回
  synced?: boolean;
}

// ====== 用户 ======
export interface User {
  id: string;
  email: string;
  name: string;
  token?: string;
}

// ====== 推送状态 ======
export interface PushStatus {
  sessionId: string;
  studentId: string;
  studentName: string;
  photoStatus: 'pending' | 'pushed' | 'failed';
  feedbackStatus: 'draft' | 'pushed' | 'failed';
  pushedAt: string | null;
}

// ====== 反馈模板 ======
export interface FeedbackTemplate {
  type: string;
  label: string;
  content: string;
}

// ====== API 响应 ======
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ====== 资料库 ======
export type ResourceType = 'link' | 'doc' | 'word' | 'ppt' | 'pdf' | 'excel' | 'image' | 'other';

export interface Resource {
  id: string;
  userId: string;
  title: string;
  type: ResourceType;
  category: string; // 分类：答案库/模板/常用网站/教材资料/其他
  url: string; // 链接地址或文件路径
  description?: string;
  fileSize?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
