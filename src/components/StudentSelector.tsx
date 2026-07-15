import { useAppStore } from '@/stores/useAppStore';

const COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444', '#14B8A6'];

interface Props {
  students: Array<{ id: string; name: string }>;
}

export default function StudentSelector({ students }: Props) {
  const currentIndex = useAppStore((s) => s.currentStudentIndex);
  const setCurrentIndex = useAppStore((s) => s.setCurrentStudentIndex);

  return (
    <div className="student-scroll">
      {students.map((student, index) => (
        <div
          key={student.id}
          className={`student-chip ${currentIndex === index ? 'active' : ''}`}
          onClick={() => setCurrentIndex(index)}
        >
          <div
            className="avatar"
            style={{
              backgroundColor: currentIndex === index ? COLORS[index % COLORS.length] : undefined,
            }}
          >
            {student.name.charAt(0)}
          </div>
          <div className="name">{student.name}</div>
        </div>
      ))}
    </div>
  );
}
