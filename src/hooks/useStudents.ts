import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { classApi } from '@/services/api';
import { cacheStudents } from '@/db';
import type { Student } from '@/types';

export function useStudents(classId?: string) {
  const { students, setStudents, currentClass, showToast } = useAppStore();

  const effectiveClassId = classId || currentClass?.id;

  useEffect(() => {
    if (!effectiveClassId) return;

    let cancelled = false;

    async function loadStudents() {
      try {
        const classId = effectiveClassId!;
        const data: Student[] = await classApi.getStudents(classId);
        if (!cancelled) {
          setStudents(data);
          cacheStudents(data);
        }
      } catch {
        if (!cancelled) showToast('加载学生列表失败', 'error');
      }
    }

    loadStudents();
    return () => { cancelled = true; };
  }, [effectiveClassId, setStudents, showToast]);

  return { students };
}
