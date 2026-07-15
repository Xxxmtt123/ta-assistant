import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { exportToCsv } from '@/utils/csv';
import type { Score } from '@/types';

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

const ATTENDANCE_OPTIONS: Array<{ val: Score['attendance']; label: string }> = [
  { val: 'present', label: '出勤' },
  { val: 'late', label: '迟到' },
  { val: 'leave', label: '请假' },
  { val: 'absent', label: '缺勤' },
];

function createEmptyScore(studentId: string, sessionId: string): Score {
  return {
    id: `score-${studentId}-${sessionId}`,
    studentId,
    sessionId,
    score: null,
    timeUsed: null,
    attendance: 'present',
    onlineHomework: 0,
    offlineHomework: 0,
    note: '',
  };
}

export default function DesktopScores() {
  const { students, currentClass, currentSession, scores, setScores, showToast } = useAppStore();

  const sessionId = currentSession?.id || 'session-current';

  // 为缺少成绩记录的学生初始化空记录
  useEffect(() => {
    if (students.length === 0) return;
    const missing = students.filter(
      (stu) => !scores.some((s) => s.studentId === stu.id && s.sessionId === sessionId)
    );
    if (missing.length > 0) {
      const newRecords = missing.map((stu) => createEmptyScore(stu.id, sessionId));
      setScores([...scores, ...newRecords]);
    }
  }, [students, sessionId, scores, setScores]);

  // 当前课次的成绩记录（按学生顺序）
  const sessionScores: Score[] = students.map((stu) => {
    const existing = scores.find((s) => s.studentId === stu.id && s.sessionId === sessionId);
    return existing || createEmptyScore(stu.id, sessionId);
  });

  const handleScoreChange = (
    studentId: string,
    field: keyof Score,
    value: string | number | null
  ) => {
    const updated = scores.map((s) =>
      s.studentId === studentId && s.sessionId === sessionId ? ({ ...s, [field]: value } as Score) : s
    );
    setScores(updated);
  };

  const handleSave = () => {
    showToast('成绩数据已保存', 'success');
  };

  const handleExportScores = () => {
    if (sessionScores.length === 0) {
      showToast('没有可导出的成绩', 'error');
      return;
    }
    const attendanceMap: Record<string, string> = {
      present: '出勤',
      absent: '缺勤',
      late: '迟到',
      leave: '请假',
    };
    const headers = ['学生姓名', '出勤状态', '分数', '用时(分钟)', '线上作业', '线下作业', '备注'];
    const rows = sessionScores.map((score) => {
      const student = students.find((s) => s.id === score.studentId);
      return [
        student?.name || '未知',
        attendanceMap[score.attendance] || score.attendance,
        score.score !== null ? String(score.score) : '',
        score.timeUsed !== null ? String(score.timeUsed) : '',
        String(score.onlineHomework),
        String(score.offlineHomework),
        score.note,
      ];
    });
    exportToCsv('成绩表.csv', headers, rows);
    showToast('成绩表已导出', 'success');
  };

  // 统计卡片：从 store.scores 实时计算
  const validScores = sessionScores.filter((s) => s.score !== null);
  const avgScore =
    validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + (b.score || 0), 0) / validScores.length)
      : null;
  const attendedCount = sessionScores.filter(
    (s) => s.attendance === 'present' || s.attendance === 'late'
  ).length;
  const onlineDone = sessionScores.filter((s) => s.onlineHomework === 1).length;
  const offlineDone = sessionScores.filter((s) => s.offlineHomework === 1).length;

  const statCards = [
    {
      label: '平均分',
      value: avgScore !== null ? String(avgScore) : '-',
      bg: 'var(--primary-lighter)',
      color: 'var(--primary)',
      icon: '📊',
    },
    {
      label: '出勤率',
      value:
        sessionScores.length > 0
          ? Math.round((attendedCount / sessionScores.length) * 100) + '%'
          : '-',
      bg: 'var(--success-light)',
      color: 'var(--success)',
      icon: '✅',
    },
    {
      label: '线上作业完成',
      value: sessionScores.length > 0 ? `${onlineDone}/${sessionScores.length}` : '-',
      bg: 'var(--info-light)',
      color: 'var(--info)',
      icon: '📝',
    },
    {
      label: '线下作业完成',
      value: sessionScores.length > 0 ? `${offlineDone}/${sessionScores.length}` : '-',
      bg: 'var(--warning-light)',
      color: 'var(--warning)',
      icon: '📖',
    },
  ];

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>成绩管理</span></div>

      {/* 页面标题 */}
      <div className="page-title-bar">
        <h2>成绩管理</h2>
        <div className="actions">
          <span className="tag tag-primary">{currentClass?.name || '未选择班级'}</span>
        </div>
      </div>

      {/* 工具栏：简化为当前课次标签 */}
      <div className="d-toolbar">
        <span className="tag tag-primary">
          当前课次{currentSession ? ` · 第${currentSession.sessionNumber}课` : ''}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          共 {sessionScores.length} 名学生
        </span>
      </div>

      {/* 统计卡片 */}
      <div className="d-stats-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="d-stat-card">
            <div className="d-stat-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
            <div className="d-stat-info">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 成绩表格 */}
      <div className="d-panel">
        <div className="d-panel-body" style={{ padding: 0 }}>
          <table className="d-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>出勤</th>
                <th>分数</th>
                <th>用时</th>
                <th>线上作业</th>
                <th>线下作业</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sessionScores.map((score, index) => {
                const student = students.find((s) => s.id === score.studentId);
                return (
                  <tr key={score.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          }}
                        >
                          {student?.name.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{student?.name || '未知'}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={score.attendance}
                        onChange={(e) =>
                          handleScoreChange(
                            score.studentId,
                            'attendance',
                            e.target.value as Score['attendance']
                          )
                        }
                        className="d-select"
                        style={{ height: 32, padding: '0 8px', fontSize: 12, minWidth: 80 }}
                      >
                        {ATTENDANCE_OPTIONS.map((opt) => (
                          <option key={opt.val} value={opt.val}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={score.score ?? ''}
                        onChange={(e) =>
                          handleScoreChange(
                            score.studentId,
                            'score',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        style={{ width: '64px', height: '32px', padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '13px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          value={score.timeUsed ?? ''}
                          onChange={(e) =>
                            handleScoreChange(
                              score.studentId,
                              'timeUsed',
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          style={{ width: '48px', height: '32px', padding: '0 6px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '13px', outline: 'none' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>分</span>
                      </div>
                    </td>
                    <td>
                      <div
                        className={`toggle-switch${score.onlineHomework ? ' on' : ''}`}
                        onClick={() =>
                          handleScoreChange(
                            score.studentId,
                            'onlineHomework',
                            score.onlineHomework ? 0 : 1
                          )
                        }
                      >
                        <div className="toggle-knob" />
                      </div>
                    </td>
                    <td>
                      <div
                        className={`toggle-switch${score.offlineHomework ? ' on' : ''}`}
                        onClick={() =>
                          handleScoreChange(
                            score.studentId,
                            'offlineHomework',
                            score.offlineHomework ? 0 : 1
                          )
                        }
                      >
                        <div className="toggle-knob" />
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={score.note}
                        onChange={(e) => handleScoreChange(score.studentId, 'note', e.target.value)}
                        placeholder="备注"
                        style={{ width: '100%', height: '32px', padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => showToast(`${student?.name || ''} 的成绩已保存`, 'success')}
                        className="d-btn d-btn-sm d-btn-primary"
                      >
                        保存
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sessionScores.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              请先在仪表盘选择班级和课次
            </div>
          )}
        </div>
      </div>

      {/* 底部操作 */}
      {sessionScores.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
          <button
            onClick={handleExportScores}
            className="d-btn d-btn-outline"
          >
            导出成绩表
          </button>
          <button
            onClick={handleSave}
            className="d-btn d-btn-primary"
          >
            保存全部成绩
          </button>
        </div>
      )}
    </div>
  );
}
