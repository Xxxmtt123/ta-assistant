import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useStudents } from '@/hooks/useStudents';
import { scoreApi } from '@/services/api';
import StudentSelector from '@/components/StudentSelector';
import type { Score } from '@/types';

type Attendance = Score['attendance'];

const ATT_OPTIONS: Array<{ val: Attendance; label: string; activeBg: string; activeColor: string }> = [
  { val: 'present', label: '出勤', activeBg: 'var(--success-light)', activeColor: 'var(--success)' },
  { val: 'late', label: '迟到', activeBg: 'var(--warning-light)', activeColor: 'var(--warning)' },
  { val: 'leave', label: '请假', activeBg: 'var(--info-light)', activeColor: 'var(--info)' },
  { val: 'absent', label: '缺勤', activeBg: 'var(--danger-light)', activeColor: 'var(--danger)' },
];

// 默认的空成绩记录判定：与全新空记录是否一致
function isScoreFilled(rec: Score | undefined): boolean {
  if (!rec) return false;
  return (
    rec.score !== null ||
    rec.timeUsed !== null ||
    rec.note.trim() !== '' ||
    rec.attendance !== 'present' ||
    rec.onlineHomework !== 0 ||
    rec.offlineHomework !== 0
  );
}

export default function MobileScores() {
  const { students } = useStudents();
  const {
    scores,
    setScores,
    currentStudentIndex,
    setCurrentStudentIndex,
    currentClass,
    currentSession,
    showToast,
  } = useAppStore();

  const sessionId = currentSession?.id || 'session-current';
  const currentStudent = students[currentStudentIndex];

  // 本地表单状态
  const [score, setScore] = useState('');
  const [timeUsed, setTimeUsed] = useState('');
  const [attendance, setAttendance] = useState<Attendance>('present');
  const [onlineHw, setOnlineHw] = useState(true);
  const [offlineHw, setOfflineHw] = useState(true);
  const [note, setNote] = useState('');

  // 当前学生已有的成绩记录
  const existingScore = scores.find(
    (s) => s.studentId === currentStudent?.id && s.sessionId === sessionId
  );

  // 页面加载时从 API 获取成绩数据
  useEffect(() => {
    if (!currentClass || !currentSession) return;

    const sessionId = currentSession.id;

    async function loadScores() {
      try {
        const scoreList = await scoreApi.getBySession(sessionId);
        const formatted = scoreList.map((s) => ({
          id: s.id || `score-${s.student_id}-${sessionId}`,
          studentId: s.student_id,
          sessionId: s.session_id || sessionId,
          score: s.score,
          timeUsed: s.time_used,
          attendance: s.attendance,
          onlineHomework: s.online_homework,
          offlineHomework: s.offline_homework,
          note: s.note,
        }));
        setScores(formatted);
      } catch (e) {
        showToast('加载成绩失败', 'error');
      }
    }

    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClass, currentSession]);

  // 学生切换时回填已有成绩数据
  useEffect(() => {
    if (existingScore) {
      setScore(existingScore.score !== null ? String(existingScore.score) : '');
      setTimeUsed(existingScore.timeUsed !== null ? String(existingScore.timeUsed) : '');
      setAttendance(existingScore.attendance);
      setOnlineHw(existingScore.onlineHomework === 1);
      setOfflineHw(existingScore.offlineHomework === 1);
      setNote(existingScore.note);
    } else {
      setScore('');
      setTimeUsed('');
      setAttendance('present');
      setOnlineHw(true);
      setOfflineHw(true);
      setNote('');
    }
    // 仅在学生切换时回填，避免覆盖用户输入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudentIndex, currentStudent?.id]);

  // 统计：已录入 X/Y 名学生
  const enteredCount = students.filter((stu) =>
    isScoreFilled(scores.find((s) => s.studentId === stu.id && s.sessionId === sessionId))
  ).length;

  const handleSave = async () => {
    if (!currentStudent) {
      showToast('请先选择学生', 'error');
      return;
    }

    const scoreRecord: Score = {
      id: existingScore?.id || `score-${currentStudent.id}-${sessionId}`,
      studentId: currentStudent.id,
      sessionId,
      score: score === '' ? null : Number(score),
      timeUsed: timeUsed === '' ? null : Number(timeUsed),
      attendance,
      onlineHomework: onlineHw ? 1 : 0,
      offlineHomework: offlineHw ? 1 : 0,
      note,
    };

    let newScores: Score[];
    if (existingScore) {
      // 已有记录：更新
      newScores = scores.map((s) => (s.id === existingScore.id ? scoreRecord : s));
    } else {
      // 没有记录：新增
      newScores = [...scores, scoreRecord];
    }
    setScores(newScores);

    try {
      const scoresToSave = newScores.map((s) => ({
        studentId: s.studentId,
        sessionId,
        score: s.score,
        timeUsed: s.timeUsed,
        attendance: s.attendance,
        onlineHomework: s.onlineHomework,
        offlineHomework: s.offlineHomework,
        note: s.note,
      }));
      await scoreApi.batch(scoresToSave);
      showToast(`已保存 ${currentStudent.name} 的成绩`, 'success');
    } catch (e: any) {
      showToast(e.message || '保存失败', 'error');
      return;
    }

    // 保存后自动跳转下一个学生
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    } else {
      showToast('已录入最后一个学生的成绩', 'info');
    }
  };

  return (
    <>
      {/* 学生横向选择器 */}
      {students.length > 0 && <StudentSelector students={students} />}

      {/* 顶部统计信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--primary-lighter)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
          已录入 {enteredCount}/{students.length} 名学生
        </span>
        <div
          style={{
            flex: 1,
            marginLeft: 12,
            height: 6,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${students.length > 0 ? (enteredCount / students.length) * 100 : 0}%`,
              background: 'var(--primary)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 成绩输入卡片 */}
      <div className="m-card">
        <div className="m-card-title">
          <span>{currentStudent?.name || ''} - 成绩录入</span>
          <span className="m-tag m-tag-primary">
            {currentStudent ? `${currentStudentIndex + 1}/${students.length}` : '-'}
          </span>
        </div>

        <div className="score-input-group">
          <label>小测分数（满分100）</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="输入分数"
            min={0}
            max={100}
          />
        </div>

        <div className="score-input-group">
          <label>用时（分钟）</label>
          <input
            type="number"
            value={timeUsed}
            onChange={(e) => setTimeUsed(e.target.value)}
            placeholder="输入用时"
            min={0}
          />
        </div>

        <div className="score-input-group">
          <label>出勤状态</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {ATT_OPTIONS.map((opt) => {
              const active = attendance === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setAttendance(opt.val)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: active ? `1.5px solid ${opt.activeColor}` : '1.5px solid var(--border)',
                    background: active ? opt.activeBg : 'var(--bg)',
                    color: active ? opt.activeColor : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-label">线上作业完成</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              是否完成线上平台作业
            </div>
          </div>
          <div
            className={`toggle-switch ${onlineHw ? 'on' : ''}`}
            onClick={() => setOnlineHw(!onlineHw)}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-label">线下作业完成</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              是否完成线下作业
            </div>
          </div>
          <div
            className={`toggle-switch ${offlineHw ? 'on' : ''}`}
            onClick={() => setOfflineHw(!offlineHw)}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="score-input-group" style={{ marginTop: 14 }}>
          <label>备注</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="输入备注（可选）"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="m-btn m-btn-primary m-btn-block"
        style={{ marginTop: 8 }}
      >
        保存并下一个 ▶
      </button>
    </>
  );
}
