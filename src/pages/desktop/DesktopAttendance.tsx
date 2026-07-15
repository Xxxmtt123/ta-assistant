import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';

const ATTENDANCE_LABELS: Record<string, string> = {
  present: '出勤',
  absent: '缺勤',
  late: '迟到',
  leave: '请假',
};

const ATTENDANCE_COLORS: Record<string, { bg: string; color: string }> = {
  present: { bg: 'var(--success-light)', color: 'var(--success)' },
  absent: { bg: 'var(--danger-light)', color: 'var(--danger)' },
  late: { bg: 'var(--warning-light)', color: 'var(--warning)' },
  leave: { bg: 'var(--info-light)', color: 'var(--info)' },
};

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DesktopAttendance() {
  const classes = useAppStore((s) => s.classes);
  const currentClass = useAppStore((s) => s.currentClass);
  const students = useAppStore((s) => s.students);
  const sessions = useAppStore((s) => s.sessions);
  const scores = useAppStore((s) => s.scores);
  const showToast = useAppStore((s) => s.showToast);

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

  const handleExportCSV = () => {
    if (!activeClass) {
      showToast('请先选择班级', 'error');
      return;
    }
    const lines: string[] = [];
    lines.push(`考勤统计报表 - ${activeClass.name}`);
    lines.push(`日期范围,${startDate},${endDate}`);
    lines.push('');
    lines.push('统计概览');
    lines.push('应出勤人次,实际出勤,迟到,缺勤,请假,出勤率');
    lines.push(`${stats.totalShould},${stats.actualPresent},${stats.late},${stats.absent},${stats.leave},${stats.rate}%`);
    lines.push('');
    lines.push('学生出勤明细');
    lines.push('学生姓名,出勤次数,迟到次数,缺勤次数,请假次数,出勤率');
    studentStats.forEach((s) => {
      lines.push(`${s.name},${s.present},${s.late},${s.absent},${s.leave},${s.rate}%`);
    });
    lines.push('');
    lines.push('课次出勤汇总');
    lines.push('课次,日期,应到,实到,出勤率');
    sessionStats.forEach((s) => {
      lines.push(`第${s.sessionNumber}课,${s.date},${s.should},${s.actual},${s.rate}%`);
    });

    const csvContent = '\ufeff' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤统计_${activeClass.name}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报表已导出', 'success');
  };

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>考勤统计</span></div>

      {/* 标题栏 */}
      <div className="page-title-bar">
        <h2>考勤统计</h2>
        <button className="d-btn d-btn-primary" onClick={handleExportCSV}>
          导出报表
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="d-toolbar" style={{ marginBottom: 20 }}>
        <select
          className="d-select"
          value={activeClass?.id || ''}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{ minWidth: 180 }}
        >
          {classes.length === 0 && <option value="">暂无班级</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="d-search"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>至</span>
        <input
          type="date"
          className="d-search"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ maxWidth: 160 }}
        />
      </div>

      {!activeClass ? (
        <div className="d-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          请先创建班级
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="d-stats-grid" style={{ marginBottom: 20 }}>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--primary-lighter)', color: 'var(--primary)' }}>
                📋
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.totalShould}</div>
                <div className="stat-label">应出勤人次</div>
              </div>
            </div>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                ✓
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.actualPresent}</div>
                <div className="stat-label">实际出勤</div>
              </div>
            </div>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                ⏰
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.late}</div>
                <div className="stat-label">迟到</div>
              </div>
            </div>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                ✕
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.absent}</div>
                <div className="stat-label">缺勤</div>
              </div>
            </div>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                📝
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.leave}</div>
                <div className="stat-label">请假</div>
              </div>
            </div>
            <div className="d-stat-card">
              <div className="d-stat-icon" style={{ background: 'var(--primary-lighter)', color: 'var(--primary-dark)' }}>
                📊
              </div>
              <div className="d-stat-info">
                <div className="stat-value">{stats.rate}%</div>
                <div className="stat-label">出勤率</div>
              </div>
            </div>
          </div>

          {/* 学生出勤明细表 */}
          <div className="d-panel" style={{ marginBottom: 20 }}>
            <div className="d-panel-header">
              <h3>学生出勤明细</h3>
              <span className="d-select" style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }}>
                共 {studentStats.length} 名学生
              </span>
            </div>
            <div className="d-panel-body" style={{ padding: 0 }}>
              <table className="d-table">
                <thead>
                  <tr>
                    <th>学生姓名</th>
                    <th>出勤次数</th>
                    <th>迟到次数</th>
                    <th>缺勤次数</th>
                    <th>请假次数</th>
                    <th>出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>
                        <span className="status-badge status-present">{s.present}</span>
                      </td>
                      <td>
                        <span className="status-badge status-late">{s.late}</span>
                      </td>
                      <td>
                        <span className="status-badge status-absent">{s.absent}</span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                          {s.leave}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, maxWidth: 100 }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${s.rate}%`,
                                background: s.rate >= 90 ? 'var(--success)' : s.rate >= 70 ? 'var(--warning)' : 'var(--danger)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{s.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {studentStats.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                        暂无学生数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 课次出勤汇总表 */}
          <div className="d-panel">
            <div className="d-panel-header">
              <h3>课次出勤汇总</h3>
              <span className="d-select" style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }}>
                共 {sessionStats.length} 个课次
              </span>
            </div>
            <div className="d-panel-body" style={{ padding: 0 }}>
              <table className="d-table">
                <thead>
                  <tr>
                    <th>课次</th>
                    <th>日期</th>
                    <th>应到</th>
                    <th>实到</th>
                    <th>出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>第 {s.sessionNumber} 课</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.date}</td>
                      <td>{s.should}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: ATTENDANCE_COLORS.present.bg,
                            color: ATTENDANCE_COLORS.present.color,
                          }}
                        >
                          {s.actual}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, maxWidth: 100 }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${s.rate}%`,
                                background: s.rate >= 90 ? 'var(--success)' : s.rate >= 70 ? 'var(--warning)' : 'var(--danger)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{s.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessionStats.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                        该日期范围内暂无课次
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
