import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

const ATTENDANCE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  present: { bg: 'var(--success-light)', color: 'var(--success)', label: '出勤' },
  absent: { bg: 'var(--danger-light)', color: 'var(--danger)', label: '缺勤' },
  late: { bg: 'var(--warning-light)', color: 'var(--warning)', label: '迟到' },
  leave: { bg: 'var(--info-light)', color: 'var(--info)', label: '请假' },
};

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MobileAttendance() {
  const classes = useAppStore((s) => s.classes);
  const currentClass = useAppStore((s) => s.currentClass);
  const students = useAppStore((s) => s.students);
  const sessions = useAppStore((s) => s.sessions);
  const scores = useAppStore((s) => s.scores);

  const [selectedClassId, setSelectedClassId] = useState(currentClass?.id || '');

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(formatDateInput(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDateInput(today));

  const activeClass = classes.find((c) => c.id === selectedClassId) || currentClass || classes[0] || null;

  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter((s) => s.classId === activeClass.id);
  }, [activeClass, students]);

  const classSessions = useMemo(() => {
    if (!activeClass) return [];
    return sessions
      .filter((s) => s.classId === activeClass.id)
      .filter((s) => {
        const d = s.date.slice(0, 10);
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => a.sessionNumber - b.sessionNumber);
  }, [activeClass, sessions, startDate, endDate]);

  const sessionIds = useMemo(() => new Set(classSessions.map((s) => s.id)), [classSessions]);

  const filteredScores = useMemo(() => {
    return scores.filter((sc) => sessionIds.has(sc.sessionId));
  }, [scores, sessionIds]);

  const stats = useMemo(() => {
    const totalShould = classStudents.length * classSessions.length;
    const present = filteredScores.filter((s) => s.attendance === 'present').length;
    const late = filteredScores.filter((s) => s.attendance === 'late').length;
    const absent = filteredScores.filter((s) => s.attendance === 'absent').length;
    const leave = filteredScores.filter((s) => s.attendance === 'leave').length;
    const actualPresent = present + late;
    const rate = totalShould > 0 ? Math.round((actualPresent / totalShould) * 100) : 0;
    return { totalShould, present, late, absent, leave, actualPresent, rate };
  }, [filteredScores, classStudents, classSessions]);

  const studentStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; present: number; late: number; absent: number; leave: number; total: number }
    >();
    classStudents.forEach((stu) => {
      map.set(stu.id, { name: stu.name, present: 0, late: 0, absent: 0, leave: 0, total: classSessions.length });
    });
    filteredScores.forEach((sc) => {
      const row = map.get(sc.studentId);
      if (row) {
        const counts = row as unknown as Record<string, number>;
        if (sc.attendance in counts) {
          counts[sc.attendance] += 1;
        }
      }
    });
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      ...data,
      rate: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0,
    }));
  }, [classStudents, filteredScores, classSessions.length]);

  const sessionStats = useMemo(() => {
    return classSessions.map((sess) => {
      const sessScores = filteredScores.filter((sc) => sc.sessionId === sess.id);
      const present = sessScores.filter((sc) => sc.attendance === 'present').length;
      const late = sessScores.filter((sc) => sc.attendance === 'late').length;
      const actual = present + late;
      const should = classStudents.length;
      return {
        ...sess,
        should,
        actual,
        rate: should > 0 ? Math.round((actual / should) * 100) : 0,
      };
    });
  }, [classSessions, filteredScores, classStudents.length]);

  const [activeTab, setActiveTab] = useState<'students' | 'sessions'>('students');

  return (
    <div className="p-4">
      {/* 头部 */}
      <div className="m-card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>考勤统计</div>
        <div className="score-input-group" style={{ marginBottom: 10 }}>
          <label>班级</label>
          <select
            className="d-select"
            style={{ width: '100%', height: 42 }}
            value={activeClass?.id || ''}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.length === 0 && <option value="">暂无班级</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="score-input-group" style={{ marginBottom: 0 }}>
            <label>起始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none' }}
            />
          </div>
          <div className="score-input-group" style={{ marginBottom: 0 }}>
            <label>结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {!activeClass ? (
        <div className="m-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          请先创建班级
        </div>
      ) : (
        <>
          {/* 顶部统计卡片（横向滚动） */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
            <div className="m-card" style={{ minWidth: 120, textAlign: 'center', marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{stats.rate}%</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>出勤率</div>
            </div>
            <div className="m-card" style={{ minWidth: 120, textAlign: 'center', marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{stats.actualPresent}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>实际出勤</div>
            </div>
            <div className="m-card" style={{ minWidth: 120, textAlign: 'center', marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)' }}>{stats.late}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>迟到</div>
            </div>
            <div className="m-card" style={{ minWidth: 120, textAlign: 'center', marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{stats.absent}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>缺勤</div>
            </div>
            <div className="m-card" style={{ minWidth: 120, textAlign: 'center', marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--info)' }}>{stats.leave}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>请假</div>
            </div>
          </div>

          {/* Tab 切换 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
            {[
              { key: 'students' as const, label: '学生考勤' },
              { key: 'sessions' as const, label: '课次汇总' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px', border: 'none', background: 'none',
                  fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 400,
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -2, cursor: 'pointer', flex: 1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 学生列表 */}
          {activeTab === 'students' && (
            <div className="m-card" style={{ padding: 0, overflow: 'hidden' }}>
              {studentStats.map((s, idx) => (
                <div key={s.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: AVATAR_COLORS[idx % AVATAR_COLORS.length], color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>应到 {s.total} 次</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.rate >= 90 ? 'var(--success)' : s.rate >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                      {s.rate}%
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 6, marginBottom: 8 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${s.rate}%`,
                        background: s.rate >= 90 ? 'var(--success)' : s.rate >= 70 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['present', 'late', 'absent', 'leave'] as const).map((key) => {
                      const count = (s as unknown as Record<string, number>)[key];
                      const style = ATTENDANCE_COLORS[key];
                      return (
                        <span
                          key={key}
                          className="m-tag"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.label} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {studentStats.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  暂无学生数据
                </div>
              )}
            </div>
          )}

          {/* 课次列表 */}
          {activeTab === 'sessions' && (
            <div className="m-card" style={{ padding: 0, overflow: 'hidden' }}>
              {sessionStats.map((s) => (
                <div key={s.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>第 {s.sessionNumber} 课</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${s.rate}%`,
                            background: s.rate >= 90 ? 'var(--success)' : s.rate >= 70 ? 'var(--warning)' : 'var(--danger)',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                      <span style={{ color: 'var(--success)' }}>{s.actual}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / {s.should}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    出勤率 {s.rate}%
                  </div>
                </div>
              ))}
              {sessionStats.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  该日期范围内暂无课次
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
