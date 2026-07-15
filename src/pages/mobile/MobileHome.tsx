import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useStudents } from '@/hooks/useStudents';

const FLOW_STEPS = [
  { label: '选班级' },
  { label: '拍照批改' },
  { label: '录入成绩' },
  { label: '课中反馈' },
  { label: '数据推送' },
  { label: '推送完成' },
];

const quickActions = [
  { icon: '📷', label: '拍照批改', path: '/mobile/camera', bg: 'var(--primary-lighter)', color: 'var(--primary)', desc: '快速拍照归档作业/小测' },
  { icon: '📝', label: '录入成绩', path: '/mobile/scores', bg: 'var(--success-light)', color: 'var(--success)', desc: '分数/出勤/线上作业' },
  { icon: '✍️', label: '写反馈', path: '/mobile/feedback', bg: 'var(--warning-light)', color: 'var(--warning)', desc: 'AI辅助150字课中反馈' },
  { icon: '📤', label: '一键推送', path: '/mobile/push', bg: 'var(--info-light)', color: 'var(--info)', desc: '照片+成绩+反馈推送' },
  { icon: '📊', label: '考勤统计', path: '/mobile/attendance', bg: 'var(--primary-lighter)', color: 'var(--primary-dark)', desc: '查看班级出勤报表' },
];

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

export default function MobileHome() {
  const navigate = useNavigate();
  const currentClass = useAppStore((s) => s.currentClass);
  const photos = useAppStore((s) => s.photos);
  const scores = useAppStore((s) => s.scores);
  const feedbackList = useAppStore((s) => s.feedbackList);
  const { students } = useStudents();

  const totalStudents = students.length;

  // 从 store 数据计算各项进度
  const homeworkCount = photos.filter((p) => p.type === 'homework').length;
  const quizCount = photos.filter((p) => p.type === 'quiz').length;
  const scoreCount = scores.filter((s) => s.score !== null).length;
  const attendanceCount = scores.length;
  const feedbackCount = feedbackList.length;
  const pushedCount = feedbackList.filter((f) => f.status === 'pushed').length;

  // 待办事项从 store 数据动态生成
  const todos = useMemo(() => {
    return [
      { label: `拍照批改作业（${homeworkCount}/${totalStudents}）`, done: totalStudents > 0 && homeworkCount >= totalStudents, path: '/mobile/camera' },
      { label: `拍照批改小测（${quizCount}/${totalStudents}）`, done: totalStudents > 0 && quizCount >= totalStudents, path: '/mobile/camera' },
      { label: `录入小测成绩（${scoreCount}/${totalStudents}）`, done: totalStudents > 0 && scoreCount >= totalStudents, path: '/mobile/scores' },
      { label: `标记出勤情况（${attendanceCount}/${totalStudents}）`, done: totalStudents > 0 && attendanceCount >= totalStudents, path: '/mobile/scores' },
      { label: `撰写课中反馈（${feedbackCount}/${totalStudents}）`, done: totalStudents > 0 && feedbackCount >= totalStudents, path: '/mobile/feedback' },
      { label: `推送数据到网站（${pushedCount}）`, done: pushedCount > 0, path: '/mobile/push' },
    ];
  }, [homeworkCount, quizCount, scoreCount, attendanceCount, feedbackCount, pushedCount, totalStudents]);

  // 流程步骤的 activeStep 根据完成进度自动计算
  const activeStep = useMemo(() => {
    const hasPushed = feedbackList.some((f) => f.status === 'pushed');
    const hasFeedback = feedbackList.length > 0;
    const hasScores = scores.length > 0;
    const hasPhotos = photos.length > 0;
    const hasClass = !!currentClass;
    if (hasPushed) return 5;
    if (hasFeedback) return 4;
    if (hasScores) return 3;
    if (hasPhotos) return 2;
    if (hasClass) return 1;
    return 0;
  }, [currentClass, photos, scores, feedbackList]);

  // 学生状态一览：根据 scores 和 feedbackList 显示完成状态
  const getStudentStatus = (studentId: string): { label: string; tag: string; detail: string } => {
    const hasFeedback = feedbackList.some((f) => f.studentId === studentId);
    const hasScore = scores.some((s) => s.studentId === studentId);
    const hasPhoto = photos.some((p) => p.studentId === studentId);
    const studentScore = scores.find((s) => s.studentId === studentId);
    if (hasFeedback && hasScore) return { label: '已完成', tag: 'm-tag-success', detail: studentScore?.score != null ? `成绩 ${studentScore.score}` : '已完成' };
    if (hasPhoto || hasScore || hasFeedback) return { label: '进行中', tag: 'm-tag-warning', detail: studentScore?.score != null ? `成绩 ${studentScore.score}` : '进行中' };
    return { label: '未完成', tag: 'm-tag-danger', detail: '未开始' };
  };

  return (
    <div className="p-4">
      {/* 流程步骤指示器 + 班级信息头部 */}
      <div className="m-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white', marginBottom: 12 }}>
        {/* 流程步骤 */}
        <div className="flow-steps">
          {FLOW_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flow-step-mobile ${i < activeStep ? 'completed' : ''} ${i === activeStep ? 'active' : ''}`}
            >
              <div className="step-num">{i < activeStep ? '✓' : i + 1}</div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>

        {/* 班级信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>当前班级</div>
            <div style={{ fontSize: 20, fontWeight: 800, margin: '4px 0' }}>{currentClass?.name || '请选择班级'}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {currentClass ? `${currentClass.totalSessions}课次 · 共${students.length}名学生` : '点击班级页面选择班级'}
            </div>
          </div>
          <div
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}
            onClick={() => navigate('/mobile/classes')}
          >
            ⇄
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <span className="m-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            {currentClass ? `${students.length}名学生` : '未选择'}
          </span>
          {currentClass && (
            <>
              <span className="m-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                已录入成绩 {scores.length}
              </span>
              <span className="m-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                已生成反馈 {feedbackList.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="m-section-title">快捷操作</div>
      <div className="quick-grid">
        {quickActions.map((action) => (
          <div key={action.path} className="quick-item" onClick={() => navigate(action.path)}>
            <div className="qi-icon" style={{ background: action.bg, color: action.color }}>{action.icon}</div>
            <div className="qi-title">{action.label}</div>
            <div className="qi-desc">{action.desc}</div>
          </div>
        ))}
      </div>

      {/* 今日进度 */}
      <div className="m-section-title">今日进度</div>
      <div className="m-card">
        {todos.map((item, index) => (
          <div key={index} className="todo-item" style={{ cursor: 'pointer' }} onClick={() => navigate(item.path)}>
            <div className={`todo-check ${item.done ? 'done' : ''}`}>
              {item.done ? '✓' : ''}
            </div>
            <div className={`todo-text ${item.done ? 'done' : ''}`}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 学生列表 */}
      <div className="m-section-title">学生状态一览</div>
      <div className="m-card">
        {students.slice(0, 8).map((student, index) => {
          const statusInfo = getStudentStatus(student.id);
          return (
            <div key={student.id} className="student-row">
              <div className="sr-avatar" style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length], color: 'white' }}>
                {student.name.charAt(0)}
              </div>
              <div className="sr-info">
                <div className="sr-name">{student.name}</div>
                <div className="sr-detail">{statusInfo.detail}</div>
              </div>
              <div className="sr-tags">
                <span className={`m-tag ${statusInfo.tag}`}>{statusInfo.label}</span>
              </div>
            </div>
          );
        })}
        {students.length === 0 && (
          <div className="student-row">
            <div className="sr-info">
              <div className="sr-name" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                {currentClass ? '暂无学生' : '请先选择班级'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
