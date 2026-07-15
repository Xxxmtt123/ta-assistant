import { create } from 'zustand';
import type { Class, Student, Session, Score, Feedback, User, Resource, Photo } from '@/types';

interface AppState {
  // 用户
  user: User | null;
  setUser: (user: User | null) => void;

  // 当前选中的班级
  currentClass: Class | null;
  setCurrentClass: (cls: Class | null) => void;

  // 当前选中的课次
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;

  // 当前选中的学生索引（用于手机端学生切换器）
  currentStudentIndex: number;
  setCurrentStudentIndex: (index: number) => void;

  // 班级列表
  classes: Class[];
  setClasses: (classes: Class[]) => void;

  // 学生列表
  students: Student[];
  setStudents: (students: Student[]) => void;

  // 课次列表
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;

  // 成绩列表
  scores: Score[];
  setScores: (scores: Score[]) => void;

  // 反馈列表
  feedbackList: Feedback[];
  setFeedbackList: (list: Feedback[]) => void;

  // 资料库
  resources: Resource[];
  setResources: (resources: Resource[]) => void;

  // 照片列表
  photos: Photo[];
  setPhotos: (photos: Photo[]) => void;

  // AI 设置
  aiModelId: string;
  setAiModelId: (modelId: string) => void;

  // 是否为移动端
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;

  // Toast 通知
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentClass: null,
  setCurrentClass: (cls) => set({ currentClass: cls }),
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  currentStudentIndex: 0,
  setCurrentStudentIndex: (index) => set({ currentStudentIndex: index }),
  classes: [],
  setClasses: (classes) => set({ classes }),
  students: [],
  setStudents: (students) => set({ students }),
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  scores: [],
  setScores: (scores) => set({ scores }),
  feedbackList: [],
  setFeedbackList: (list) => set({ feedbackList: list }),
  resources: [],
  setResources: (resources) => set({ resources }),
  photos: [],
  setPhotos: (photos) => set({ photos }),
  aiModelId: localStorage.getItem('ta_ai_model') || 'deepseek-chat',
  setAiModelId: (modelId) => {
    localStorage.setItem('ta_ai_model', modelId);
    set({ aiModelId: modelId });
  },
  isMobile: window.innerWidth < 768,
  setIsMobile: (isMobile) => set({ isMobile }),
  toasts: [],
  showToast: (message, type = 'success') => {
    const id = String(++toastId);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
