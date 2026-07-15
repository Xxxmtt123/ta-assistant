import Dexie, { type Table } from 'dexie';
import type { Class, Student, Session, Score, Feedback, Photo } from '@/types';

class TaAssistantDB extends Dexie {
  classes!: Table<Class>;
  students!: Table<Student>;
  sessions!: Table<Session>;
  scores!: Table<Score>;
  feedback!: Table<Feedback>;
  photos!: Table<Photo>;

  constructor() {
    super('TaAssistantDB');
    this.version(1).stores({
      classes: 'id, userId, name',
      students: 'id, classId, name',
      sessions: 'id, classId, sessionNumber, date',
      scores: 'id, studentId, sessionId',
      feedback: 'id, studentId, sessionId',
      photos: 'id, studentId, sessionId, type',
    });
  }
}

export const db = new TaAssistantDB();

// 本地缓存 CRUD 辅助函数
export async function cacheClasses(list: Class[]) {
  await db.classes.clear();
  await db.classes.bulkPut(list);
}

export async function getCachedClasses(): Promise<Class[]> {
  return db.classes.toArray();
}

export async function cacheStudents(list: Student[]) {
  await db.students.clear();
  await db.students.bulkPut(list);
}

export async function getCachedStudents(): Promise<Student[]> {
  return db.students.toArray();
}

export async function cacheSessions(list: Session[]) {
  await db.sessions.clear();
  await db.sessions.bulkPut(list);
}

export async function getCachedSessions(): Promise<Session[]> {
  return db.sessions.toArray();
}
