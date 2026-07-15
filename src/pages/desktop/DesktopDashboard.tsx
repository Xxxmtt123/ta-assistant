import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];

export default function DesktopDashboard() {
  const navigate = useNavigate();
  const { classes, students, scores, feedbackList, photos } = useAppStore();

  // 今日出勤率：从 scores 中统计 present 占比
  const presentCount = scores.filter((s) => s.attendance === 'present').length;
  const attendanceRate = scores.length > 0 ? Math.round((presentCount / scores.length) * 100) + '%' : '-';

  // 反馈完成：feedbackList 中 status='draft' 的数量
  const draftFeedbackCount = feedbackList.filter((f) => f.status === 'draft').length;

  const statCards = [
    { label: '管理班级', value: classes.length, bg: 'var(--primary-lighter)', color: 'var(--primary)', icon: '📚' },
    { label: '学生总数', value: students.length, bg: 'var(--success-light)', color: 'var(--success)', icon: '👥' },
    { label: '今日出勤', value: attendanceRate, bg: 'var(--info-light)', color: 'var(--info)', icon: '✅' },
    { label: '反馈完成', value: draftFeedbackCount, bg: 'var(--warning-light)', color: 'var(--warning)', icon: '📝' },
  ];

  // 待办事项：根据 store 数据动态生成
  const totalStudents = students.length;
  const scoreEnteredCount = scores.length;
  const feedbackDoneCount = feedbackList.length;
  const photoCount = photos.length;

  const todos = [
    {
      text: `录入成绩（已录入 ${scoreEnteredCount}/${totalStudents}）`,
      done: totalStudents > 0 && scoreEnteredCount >= totalStudents,
    },
    {
      text: `撰写反馈（已完成 ${feedbackDoneCount}/${totalStudents}）`,
      done: totalStudents > 0 && feedbackDoneCount >= totalStudents,
    },
    {
      text: `拍照批改（已拍 ${photoCount} 张）`,
      done: photoCount > 0,
    },
  ];

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>仪表盘</span></div>

      {/* 页面标题 */}
      <div className="page-title-bar">
        <h2>仪表盘</h2>
        <div className="actions">
          <button className="d-btn d-btn-outline">📊 导出报表</button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="d-stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="d-stat-card">
            <div className="d-stat-icon" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
            <div className="d-stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 两栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 各班级今日进度 */}
        <div className="d-panel">
          <div className="d-panel-header">
            <h3>各班级今日进度</h3>
          </div>
          <div className="d-panel-body">
            {classes.map((cls, index) => {
              // 真实学生人数：从 students 中按 classId 统计
              const classStudents = students.filter((s) => s.classId === cls.id).length;
              // 进度条比例：学生数 / 班级人数
              const capacity = cls.studentCount || 0;
              const pct = capacity > 0 ? Math.min(100, Math.round((classStudents / capacity) * 100)) : 0;
              return (
                <div
                  key={cls.id}
                  onClick={() => navigate('/desktop/classes')}
                  className="class-card-mini"
                >
                  <div className="cc-color" style={{ background: COLORS[index % COLORS.length] }} />
                  <div className="cc-info">
                    <div className="cc-name">
                      {cls.name}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'}
                      </span>
                    </div>
                    <div className="cc-meta">
                      {classStudents}人 · {cls.totalSessions}课次
                    </div>
                  </div>
                  <div className="cc-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[index % COLORS.length] }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>{pct}%</div>
                  </div>
                </div>
              );
            })}
            {classes.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>暂无班级数据</div>
            )}
          </div>
        </div>

        {/* 待办事项 */}
        <div className="d-panel">
          <div className="d-panel-header">
            <h3>待办事项</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>今日剩余 {todos.filter((t) => !t.done).length} 项</span>
          </div>
          <div className="d-panel-body">
            {todos.map((todo, i) => (
              <div key={i} className="todo-item" style={{ padding: '10px 0' }}>
                <div className={`todo-check${todo.done ? ' done' : ''}`}>{todo.done ? '✓' : ''}</div>
                <div className={`todo-text${todo.done ? ' done' : ''}`}>{todo.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
