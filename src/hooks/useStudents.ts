import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { studentApi } from '@/services/api';
import type { Student } from '@/types';

export function useStudents(classId?: string) {
  const students = useAppStore((s) => s.students);
  const setStudents = useAppStore((s) => s.setStudents);
  const currentClass = useAppStore((s) => s.currentClass);
  const showToast = useAppStore((s) => s.showToast);

  const effectiveClassId = classId || currentClass?.id;

  useEffect(() => {
    if (!effectiveClassId) return;

    let cancelled = false;

    async function loadStudents() {
      try {
        const data: Student[] = await studentApi.getByClass(effectiveClassId!);
        if (!cancelled) {
          setStudents(data || []);
        }
      } catch {
        if (!cancelled) showToast('加载学生列表失败', 'error');
      }
    }

    loadStudents();
    return () => { cancelled = true; };
  }, [effectiveClassId]);

  return { students: students || [] };
}
