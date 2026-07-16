import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { studentApi } from '@/services/api';

export function useStudents(classId?: string) {
  const currentClass = useAppStore(s => s.currentClass);
  const [localStudents, setLocalStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [effectiveClassId] = classId !== undefined ? [classId] : [currentClass?.id];

  useEffect(() => {
    if (!effectiveClassId) {
      setLocalStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    studentApi.getByClass(effectiveClassId)
      .then((data) => {
        setLocalStudents(data || []);
      })
      .catch(() => {
        setLocalStudents([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveClassId]);

  return { students: localStudents, loading };
}
