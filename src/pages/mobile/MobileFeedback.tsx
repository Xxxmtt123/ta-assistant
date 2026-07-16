import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useStudents } from '@/hooks/useStudents';
import StudentSelector from '@/components/StudentSelector';
import { feedbackApi } from '@/services/api';
import {
  generateSingleFeedback,
  generateBatchFeedback,
  generateBatchFeedbackStreamed,
  generateSingleFeedbackStreamed,
  PERFORMANCE_OPTIONS,
} from '@/services/aiGenerator';
import type { PerformanceLevel, StudentNote } from '@/services/aiGenerator';

function StudentAvatar({ student, size = 32 }: { student: any; size?: number }) {
  const avatarUrl = student?.avatarUrl || student?.avatar_url;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={student?.name || ''}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const COLORS = ['#e94560', '#0f3460', '#FFD700', '#16c79a', '#bb86fc', '#ff7043'];
  const hash = (student?.name || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: COLORS[hash % COLORS.length], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {(student?.name || '?')[0]}
    </div>
  );
}

type ViewMode = 'setup' | 'notes' | 'result';

export default function MobileFeedback() {
  const { students: hookStudents } = useStudents();
  const { currentStudentIndex, setCurrentStudentIndex, showToast, feedbackList, setFeedbackList, currentSession, currentClass, students: storeStudents } = useAppStore();
  // 使用 hook 返回的学生列表（按班级正确过滤），fallback 到 store
  const students = hookStudents.length > 0 ? hookStudents : storeStudents;
  const [viewMode, setViewMode] = useState<'setup' | 'notes' | 'result'>('setup');
  const [editContent, setEditContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  // 流式生成的实时内容（按 studentId 存储）
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  // 流式生成中当前卡片的滚动引用
  const generatingCardRef = useRef<HTMLDivElement>(null);

  const handleDeleteFeedback = (feedbackId: string) => {
    if (!window.confirm('确定要删除这条反馈吗？')) return;
    const newList = feedbackList.filter(f => f.id !== feedbackId);
    setFeedbackList(newList);
    if (currentClass) {
      if (newList.length > 0) {
        localStorage.setItem(`feedback_list_${currentClass.id}`, JSON.stringify(newList));
      } else {
        localStorage.removeItem(`feedback_list_${currentClass.id}`);
      }
    }
    showToast('已删除', 'success');
  };

  // 自动滚动到当前正在生成的卡片
  useEffect(() => {
    if (isGenerating && generatingCardRef.current) {
      generatingCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [batchProgress.current, isGenerating]);

  // Step 1: 课程信息
  const [courseContent, setCourseContent] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Step 2: 每个学生的课堂表现
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>(
    students.map(s => ({ studentId: s.id, studentName: s.name, performanceNote: '', performanceLevel: 'good' }))
  );

  // 同步 studentNotes 跟 students（班级切换时重新初始化）
  const isFirstMount = useRef(true);

  useEffect(() => {
    const classId = currentClass?.id || '';
    if (!classId || students.length === 0) return;

    // 检查 studentNotes 是否已经对应当前 students（避免旧数据覆盖新班级）
    const currentNoteIds = studentNotes.map(n => n.studentId).sort().join(',');
    const currentStudentIds = students.map(s => s.id).sort().join(',');
    if (currentNoteIds === currentStudentIds) return; // 已匹配，无需重置

    // 尝试从缓存恢复（只在首次挂载时）
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const cachedNotes = currentSession
        ? localStorage.getItem(`feedback_notes_${currentSession.id}`)
        : null;
      const cachedList = currentClass
        ? localStorage.getItem(`feedback_list_${currentClass.id}`)
        : null;
      const cachedCourse = currentSession
        ? localStorage.getItem(`feedback_course_${currentSession.id}`)
        : null;
      const cachedPrompt = currentSession
        ? localStorage.getItem(`feedback_prompt_${currentSession.id}`)
        : null;

      if (cachedList) {
        try {
          const parsed = JSON.parse(cachedList);
          if (parsed.length > 0) {
            setFeedbackList(parsed);
            setViewMode('result');
          }
        } catch {}
      }

      if (cachedCourse) setCourseContent(cachedCourse);
      if (cachedPrompt) setAdditionalPrompt(cachedPrompt);

      if (cachedNotes) {
        try {
          const parsed = JSON.parse(cachedNotes) as StudentNote[];
          const parsedIds = parsed.map(n => n.studentId).sort().join(',');
          if (parsedIds === currentStudentIds) {
            setStudentNotes(parsed);
            return; // 缓存匹配当前学生，不重置
          }
        } catch {}
      }
    }

    // 学生列表不匹配，重置
    setStudentNotes(students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      performanceNote: '',
      performanceLevel: 'good',
    })));
    setFeedbackList([]);
    setCourseContent('');
    setAdditionalPrompt('');
    setViewMode('setup');
    setCurrentResultId(null);
    setStreamingContent({});
  }, [currentClass?.id, students]);

  // 保存课程内容到 localStorage（按课次缓存）
  useEffect(() => {
    if (currentSession && courseContent) {
      localStorage.setItem(`feedback_course_${currentSession.id}`, courseContent);
      localStorage.setItem(`feedback_prompt_${currentSession.id}`, additionalPrompt);
    }
  }, [courseContent, additionalPrompt, currentSession]);

  // 页面加载时恢复课程内容
  useEffect(() => {
    if (currentSession && !courseContent) {
      const saved = localStorage.getItem(`feedback_course_${currentSession.id}`);
      if (saved) setCourseContent(saved);
      const savedPrompt = localStorage.getItem(`feedback_prompt_${currentSession.id}`);
      if (savedPrompt) setAdditionalPrompt(savedPrompt);
    }
  }, [currentSession]);

  // 保存 studentNotes 到 localStorage
  useEffect(() => {
    if (currentSession && studentNotes.some(n => n.performanceNote)) {
      localStorage.setItem(`feedback_notes_${currentSession.id}`, JSON.stringify(studentNotes));
    }
  }, [studentNotes, currentSession]);

  // 页面加载时恢复 studentNotes
  useEffect(() => {
    if (currentSession && students.length > 0) {
      const savedNotes = localStorage.getItem(`feedback_notes_${currentSession.id}`);
      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes) as StudentNote[];
          if (parsed.length === students.length) {
            setStudentNotes(parsed);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [currentSession, students.length]);

  // 保存反馈结果到 localStorage（按班级，用于没有 session 时的降级）
  useEffect(() => {
    if (currentClass && feedbackList.length > 0) {
      localStorage.setItem(`feedback_list_${currentClass.id}`, JSON.stringify(feedbackList));
    }
  }, [feedbackList, currentClass]);

  // 页面加载时获取反馈数据
  useEffect(() => {
    loadFeedback();
  }, [currentSession?.id]);

  async function loadFeedback() {
    if (!currentSession) {
      // 尝试从 localStorage 恢复
      if (currentClass) {
        const cached = localStorage.getItem(`feedback_list_${currentClass.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.length > 0) {
              setFeedbackList(parsed);
              setViewMode('result');
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      return;
    }
    try {
      const list = await feedbackApi.getBySession(currentSession.id);
      const formatted = list.map((f: any) => ({
        id: f.id || `fb_${f.student_id}_${Date.now()}`,
        studentId: f.student_id,
        sessionId: f.session_id || currentSession.id,
        content: f.content,
        templateType: f.template_type,
        charCount: f.char_count,
        status: f.status,
        createdAt: f.created_at || new Date().toISOString().slice(0, 10),
      }));
      setFeedbackList(formatted);
      if (formatted.length > 0) {
        setViewMode('result');
      }
    } catch (e: any) {
      console.error('加载反馈失败:', e);
      showToast('加载反馈失败', 'error');
    }
  }

  const charCount = editContent.length;
  const charCountClass = charCount >= 160 ? 'over' : charCount >= 140 ? 'warn' : '';

  const updateNote = (studentId: string, field: 'performanceNote' | 'performanceLevel', value: string) => {
    setStudentNotes(prev => prev.map(n =>
      n.studentId === studentId ? { ...n, [field]: value } : n
    ));
  };

  // 从 result 视图加载当前学生的反馈
  useEffect(() => {
    if (viewMode === 'result') {
      const currentStudent = students[currentStudentIndex];
      if (currentStudent) {
        const fb = feedbackList.find(f => f.studentId === currentStudent.id);
        setEditContent(fb?.content || '');
        setCurrentResultId(fb?.id || null);
      }
    }
  }, [viewMode, currentStudentIndex, students, feedbackList]);

  const allNotesFilled = studentNotes.every(n => n.performanceNote.trim().length > 0);
  const notesFillCount = studentNotes.filter(n => n.performanceNote.trim().length > 0).length;

  // 生成按钮：校验 + 开始生成
  const handleGenerateAll = async () => {
    if (!courseContent.trim()) {
      showToast('请先输入本节课的课程内容', 'error');
      return;
    }
    if (notesFillCount === 0) {
      showToast('请至少填写一个学生的课堂表现', 'error');
      return;
    }

    // 如果不是所有学生都填写了表现，提示用户
    if (!allNotesFilled) {
      const ok = window.confirm(`还有 ${students.length - notesFillCount} 名学生未填写课堂表现，未填写的将使用"表现良好"默认生成。是否继续？`);
      if (!ok) return;
    }

    setIsGenerating(true);
    setBatchProgress({ current: 0, total: students.length });
    setStreamingContent({});
    setViewMode('result'); // 立即切换到结果视图，展示流式生成卡片

    try {
      await generateBatchFeedbackStreamed(
        courseContent,
        studentNotes,
        additionalPrompt,
        (index, total, result) => {
          setBatchProgress({ current: index, total });
          // 清除该学生的流式内容（已完成）
          setStreamingContent(prev => { const next = { ...prev }; delete next[result.studentId]; return next; });
          // 保存到 feedbackList（用 getState 避免闭包陈旧值）
          const currentList = useAppStore.getState().feedbackList;
          const existing = currentList.find(f => f.studentId === result.studentId);
          if (existing) {
            setFeedbackList(currentList.map(f =>
              f.studentId === result.studentId
                ? { ...f, content: result.content, charCount: result.charCount, status: 'draft' as const }
                : f
            ));
          } else {
            setFeedbackList([...currentList, {
              id: 'fb_' + Date.now() + '_' + result.studentId,
              studentId: result.studentId,
              sessionId: 'current',
              content: result.content,
              charCount: result.charCount,
              templateType: 'ai',
              status: 'draft' as const,
              createdAt: new Date().toISOString().slice(0, 10),
            }]);
          }
        },
        (studentId, partialText) => {
          setStreamingContent(prev => ({ ...prev, [studentId]: partialText }));
        }
      );
      showToast(`已完成 ${students.length} 名学生的反馈生成`, 'success');
      setViewMode('result');
      setCurrentStudentIndex(0);
    } catch {
      showToast('生成失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 单个学生快速重新生成
  const handleRegenerate = async () => {
    const currentStudent = students[currentStudentIndex];
    if (!currentStudent) return;
    await doRegenerateForStudent(currentStudent.id);
  };

  // 为指定学生重写反馈
  const handleRegenerateSingle = async (studentId: string) => {
    const idx = students.findIndex(s => s.id === studentId);
    if (idx >= 0) setCurrentStudentIndex(idx);
    await doRegenerateForStudent(studentId);
  };

  const doRegenerateForStudent = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    setIsGenerating(true);
    try {
      const note = studentNotes.find(n => n.studentId === student.id) || {
        studentId: student.id, studentName: student.name,
        performanceNote: '', performanceLevel: 'good',
      };
      const result = await generateSingleFeedback(courseContent, note, additionalPrompt);
      setEditContent(result.content);
      // 更新 feedbackList
      setFeedbackList(feedbackList.map(f =>
        f.studentId === student.id
          ? { ...f, content: result.content, charCount: result.charCount }
          : f
      ));
      showToast('已重新生成', 'success');
    } catch {
      showToast('生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (editContent.length < 100) { showToast('反馈至少需要100字', 'error'); return; }
    const currentStudent = students[currentStudentIndex];
    if (!currentStudent || !currentSession) return;
    const existing = feedbackList.find(f => f.studentId === currentStudent.id);
    const templateType = existing?.templateType || 'ai';
    try {
      await feedbackApi.save(currentStudent.id, currentSession.id, editContent, templateType);
      setFeedbackList(feedbackList.map(f =>
        f.studentId === currentStudent.id
          ? { ...f, content: editContent, charCount: editContent.length, status: 'draft' as const }
          : f
      ));
      showToast(`已保存 ${currentStudent.name} 的反馈`, 'success');
    } catch (e: any) {
      showToast(e.message || '保存失败', 'error');
    }
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const saveAllFeedback = async () => {
    if (!currentSession) {
      showToast('当前没有选中的课次', 'error');
      return;
    }
    try {
      const items = feedbackList.map(f => ({
        studentId: f.studentId,
        sessionId: currentSession.id,
        content: f.content,
        templateType: f.templateType,
      }));
      await feedbackApi.batch(items);
      showToast('全部反馈保存成功', 'success');
    } catch (e: any) {
      showToast(e.message || '保存失败', 'error');
    }
  };

  // ======= 生成进度视图（多卡片流式布局）=======
  if (viewMode === 'result' && isGenerating) {
    // 找到正在生成的学生
    const currentGeneratingIdx = batchProgress.current - 1;
    const currentGeneratingStudent = students[currentGeneratingIdx];

    return (
      <div style={{ padding: '12px 12px 80px 12px' }}>
        {/* 顶部状态栏 */}
        <div className="m-card" style={{ textAlign: 'center', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            ✨ AI 正在生成反馈...
          </div>
          <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 12 }}>
            第 {batchProgress.current} / {batchProgress.total} 位 — {currentGeneratingStudent?.name || ''}
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div
              className="progress-fill"
              style={{
                width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                transition: 'width 0.5s',
              }}
            />
          </div>
        </div>

        {/* 多卡片列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {students.map((student, index) => {
            const fb = feedbackList.find(f => f.studentId === student.id);
            const streamingText = streamingContent[student.id] || '';
            const note = studentNotes.find(n => n.studentId === student.id);
            const levelInfo = note
              ? PERFORMANCE_OPTIONS.find(o => o.level === note.performanceLevel)
              : undefined;

            // 状态判断
            const isCompleted = fb && !streamingContent[student.id];
            const isStreaming = !!streamingText;
            const isWaiting = !isCompleted && !isStreaming;

            // 当前正在生成的卡片引用
            const isCurrentlyGenerating = batchProgress.current - 1 === index;

            let cardStyle: React.CSSProperties = {};
            let statusTag: React.ReactNode = null;
            let bodyContent: React.ReactNode = null;
            let footerContent: React.ReactNode = null;

            if (isWaiting) {
              // 等待中
              cardStyle = {
                opacity: 0.5,
                borderLeft: '3px solid var(--border)',
              };
              statusTag = (
                <span className="m-tag" style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 11 }}>
                  排队等待
                </span>
              );
              bodyContent = (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  暂无内容，等待生成...
                </div>
              );
            } else if (isStreaming) {
              // 生成中
              cardStyle = {
                borderLeft: '3px solid #7C3AED',
                boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.2), 0 2px 12px rgba(124, 58, 237, 0.12)',
              };
              statusTag = (
                <span className="m-tag m-tag-primary" style={{ animation: 'blink 1s infinite', fontSize: 11 }}>
                  生成中...
                </span>
              );
              bodyContent = (
                <div style={{
                  fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)',
                  minHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  padding: '8px 0',
                }}>
                  {streamingText}
                  <span style={{
                    display: 'inline-block', width: 2, height: 16,
                    background: '#7C3AED', marginLeft: 2,
                    animation: 'blink 0.8s infinite', verticalAlign: 'text-bottom',
                  }} />
                </div>
              );
              footerContent = (
                <div className={`char-count ${streamingText.length >= 160 ? 'over' : streamingText.length >= 140 ? 'warn' : ''}`}>
                  已生成 {streamingText.length} 字
                </div>
              );
            } else {
              // 已完成
              cardStyle = {
                borderLeft: '3px solid var(--success)',
              };
              statusTag = (
                <span className="m-tag" style={{ background: 'var(--success)', color: 'white', fontSize: 11 }}>
                  ✓ 已完成
                </span>
              );
              bodyContent = (
                <div style={{
                  fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)',
                  minHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  padding: '8px 0',
                }}>
                  {fb?.content || ''}
                </div>
              );
              footerContent = (
                <div className="char-count">
                  已完成 {fb?.charCount || fb?.content?.length || 0} 字 ✓
                </div>
              );
            }

            return (
              <div
                key={student.id}
                ref={isCurrentlyGenerating ? generatingCardRef : undefined}
                className="m-card"
                style={{ marginBottom: 0, padding: '14px 14px 12px 14px', ...cardStyle }}
              >
                {/* 卡片头部：学生名 + 表现标签 + 状态 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {/* 头像 */}
                  <StudentAvatar student={student} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{student.name}</div>
                    {levelInfo && (
                      <div style={{ fontSize: 11, color: levelInfo.color, marginTop: 1 }}>
                        {levelInfo.icon} {levelInfo.label}
                      </div>
                    )}
                  </div>
                  {statusTag}
                  {isCompleted && fb && (
                    <>
                      <button
                        onClick={() => handleRegenerateSingle(student.id)}
                        style={{
                          fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none',
                          cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                        }}
                      >
                        重写
                      </button>
                      <button
                        onClick={() => handleDeleteFeedback(fb.id)}
                        style={{
                          fontSize: 11, color: 'var(--error)', background: 'none', border: 'none',
                          cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                        }}
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>

                {/* 分隔线 */}
                <div style={{
                  height: 1, background: 'var(--border)',
                  margin: '4px 0 2px 0',
                }} />

                {/* 卡片内容区域 */}
                {bodyContent}

                {/* 底部统计 */}
                {footerContent}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ======= 结果查看视图 =======
  if (viewMode === 'result') {
    const currentStudent = students[currentStudentIndex];
    const fb = feedbackList.find(f => f.studentId === currentStudent?.id);
    const completedCount = feedbackList.filter(f => f.charCount >= 100).length;

    return (
      <div style={{ padding: '12px 12px 80px 12px' }}>
        {students.length > 0 && <StudentSelector students={students} />}

        {/* 顶部状态 */}
        <div className="m-card" style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          color: 'white', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>反馈生成完成</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{completedCount}/{students.length}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="m-btn m-btn-outline"
                onClick={() => setViewMode('notes')}
                style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', padding: '6px 12px' }}
              >
                返回修改表现
              </button>
              <button
                className="m-btn m-btn-outline"
                onClick={() => setViewMode('setup')}
                style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', padding: '6px 12px' }}
              >
                重新配置
              </button>
            </div>
          </div>
        </div>

        {/* 反馈编辑 */}
        <div className="m-card" style={{ marginBottom: 12 }}>
          <div className="m-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StudentAvatar student={currentStudent} size={32} />
            <span>{currentStudent?.name || ''} - 课中反馈</span>
            <span className="m-tag m-tag-primary">{currentStudentIndex + 1}/{students.length}</span>
          </div>
          <textarea
            className="feedback-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="反馈内容"
          />
          <div className={`char-count ${charCountClass}`}>
            已输入 {charCount} 字
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="m-btn m-btn-outline"
              onClick={handleRegenerate}
              disabled={isGenerating}
              style={{ flex: 1, opacity: isGenerating ? 0.6 : 1 }}
            >
              重新生成
            </button>
            <button className="m-btn m-btn-outline" onClick={() => {
              navigator.clipboard.writeText(editContent).then(() => showToast('已复制', 'success'));
            }} style={{ flex: 1 }}>
              复制
            </button>
            <button className="m-btn m-btn-outline" onClick={() => {
              const fb = feedbackList.find(f => f.studentId === currentStudent?.id);
              if (fb) handleDeleteFeedback(fb.id);
            }} style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }}>
              删除
            </button>
          </div>
        </div>

        <button className="m-btn m-btn-primary m-btn-block" onClick={handleSaveAndNext}>
          保存并下一个 ▶
        </button>
      </div>
    );
  }

  // ======= Step 2: 填写每个学生的课堂表现 =======
  if (viewMode === 'notes') {
    return (
      <div style={{ padding: '12px 12px 80px 12px' }}>
        {/* 头部 */}
        <div className="m-card" style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          color: 'white', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>第 2 步 / 共 2 步</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>填写课堂表现</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                课程：{courseContent.slice(0, 30)}{courseContent.length > 30 ? '...' : ''}
              </div>
            </div>
            <button
              className="m-btn m-btn-outline"
              onClick={() => setViewMode('setup')}
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', padding: '6px 12px', fontSize: 11 }}
            >
              ← 返回
            </button>
          </div>
        </div>

        {/* 填写进度 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            已填写 {notesFillCount}/{students.length} 名学生
          </span>
          <div className="progress-bar" style={{ flex: 1, marginLeft: 12 }}>
            <div className="progress-fill" style={{
              width: `${students.length > 0 ? (notesFillCount / students.length) * 100 : 0}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* 快捷提示词 */}
        <div className="m-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            快捷常用表现描述（点击可快速填入当前学生的表现）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              '课堂积极发言', '单词拼写有进步', '阅读理解准确率高',
              '口语表达流利', '注意力不集中', '笔记记录认真',
              '小组合作积极', '语法知识点需巩固', '发音需多练习',
            ].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const s = students[currentStudentIndex];
                  if (s) updateNote(s.id, 'performanceNote', tag);
                }}
                className="m-btn m-btn-outline m-btn-sm"
                style={{ fontSize: 11, borderRadius: 14 }}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 学生列表：表现等级 + 简要描述 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map((student, index) => {
            const note = studentNotes.find(n => n.studentId === student.id);
            const level = note?.performanceLevel || 'good';
            const levelInfo = PERFORMANCE_OPTIONS.find(o => o.level === level);

            return (
              <div key={student.id} className="m-card" style={{ margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: note ? 8 : 0 }}>
                  {/* 头像 */}
                  <StudentAvatar student={student} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{student.name}</div>
                    {note?.performanceNote && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {note.performanceNote}
                      </div>
                    )}
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: note?.performanceNote ? 'var(--success)' : 'var(--border)',
                  }} />
                </div>

                {/* 表现等级选择 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {PERFORMANCE_OPTIONS.map(opt => (
                    <button
                      key={opt.level}
                      onClick={() => updateNote(student.id, 'performanceLevel', opt.level)}
                      style={{
                        padding: '4px 10px', borderRadius: 14, fontSize: 11,
                        border: level === opt.level ? `1.5px solid ${opt.color}` : '1px solid var(--border)',
                        background: level === opt.level ? `${opt.color}12` : 'transparent',
                        color: level === opt.level ? opt.color : 'var(--text-muted)',
                        fontWeight: level === opt.level ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>

                {/* 表现输入框 */}
                <textarea
                  value={note?.performanceNote || ''}
                  onChange={(e) => updateNote(student.id, 'performanceNote', e.target.value)}
                  placeholder="输入该学生的课堂表现简要描述..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 10,
                    border: note?.performanceNote ? `1.5px solid var(--primary)` : '1px solid var(--border)',
                    fontSize: 12, outline: 'none', background: 'var(--bg)',
                    resize: 'none', lineHeight: 1.5,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 底部生成按钮 */}
        <button
          className="m-btn m-btn-primary m-btn-block"
          style={{ marginTop: 12, height: 48, fontSize: 15, background: 'linear-gradient(135deg, var(--primary), #7C3AED)' }}
          onClick={handleGenerateAll}
        >
          ✨ 一键生成全部反馈（{students.length}人）
        </button>
      </div>
    );
  }

  // ======= Step 1: 课程信息配置 =======
  return (
    <div style={{ padding: '12px 12px 80px 12px' }}>
      {/* 头部 */}
      <div className="m-card" style={{
        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        color: 'white', marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, opacity: 0.8 }}>第 1 步 / 共 2 步</div>
        <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>AI 智能反馈生成</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          先输入课程内容，再为每个学生填写课堂表现，最后一键生成个性化反馈
        </div>
      </div>

      {/* 课程内容 */}
      <div className="m-section-title">课程内容</div>
      <div className="m-card">
        <textarea
          value={courseContent}
          onChange={(e) => setCourseContent(e.target.value)}
          placeholder="输入本节课的课程内容，如：Unit 5 Reading - 主要学习了关于天气的词汇和句型，包括 sunny/rainy/cloudy/windy 等形容词，以及 What's the weather like today? 问答句型。进行了课文阅读和角色扮演练习。"
          rows={4}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: 13, outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
            background: 'var(--bg)',
          }}
        />
      </div>

      {/* 补充提示词（可选） */}
      <div className="m-section-title">补充提示词（可选）</div>
      <div className="m-card">
        <textarea
          value={additionalPrompt}
          onChange={(e) => setAdditionalPrompt(e.target.value)}
          placeholder="对所有学生通用的额外要求，如：提醒家长关注暑假作业完成情况、下节课有单元测试请做好准备..."
          rows={2}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: 12, outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
            background: 'var(--bg)',
          }}
        />
        {/* 快捷提示词 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {[
            '提醒完成暑假作业', '下节课有单元测试', '注意复习前几单元内容',
            '鼓励多开口说英语', '每天坚持听读15分钟',
          ].map(tag => (
            <button
              key={tag}
              onClick={() => setAdditionalPrompt(prev => prev ? prev + '；' + tag : tag)}
              className="m-btn m-btn-outline m-btn-sm"
              style={{ fontSize: 11, borderRadius: 14 }}
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 流程说明 */}
      <div className="m-card" style={{ marginTop: 12, background: 'var(--bg)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>生成流程</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div>1️⃣ 填写本节课的课程内容</div>
          <div>2️⃣ 为每个学生选择表现等级 + 填写简要课堂表现</div>
          <div>3️⃣ 点击「一键生成」，AI 根据课程内容和每个学生的表现生成个性化反馈</div>
          <div>4️⃣ 查看并编辑生成结果，保存或重新生成</div>
        </div>
      </div>

      {/* 下一步 */}
      <button
        className="m-btn m-btn-primary m-btn-block"
        style={{ marginTop: 12, height: 48, fontSize: 15 }}
        onClick={() => {
          if (!courseContent.trim()) {
            showToast('请先输入课程内容', 'error');
            return;
          }
          setViewMode('notes');
        }}
      >
        下一步：填写课堂表现 ▶
      </button>
    </div>
  );
}
