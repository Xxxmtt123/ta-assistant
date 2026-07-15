import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { feedbackApi } from '@/services/api';
import { exportToCsv } from '@/utils/csv';
import {
  generateSingleFeedback,
  generateBatchFeedback,
  generateBatchFeedbackStreamed,
  PERFORMANCE_OPTIONS,
} from '@/services/aiGenerator';
import type { StudentNote } from '@/services/aiGenerator';
import type { Feedback } from '@/types';

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

const demoFeedbacks: Feedback[] = [];

type ViewMode = 'setup' | 'notes' | 'result';

export default function DesktopFeedback() {
  const { students, feedbackList, setFeedbackList, showToast, currentSession } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});

  // Step 1
  const [courseContent, setCourseContent] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Step 2
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>(
    students.map(s => ({ studentId: s.id, studentName: s.name, performanceNote: '', performanceLevel: 'good' }))
  );

  // 从 API 加载反馈
  useEffect(() => {
    if (!currentSession?.id) return;
    (async () => {
      try {
        const list = await feedbackApi.getBySession(currentSession.id);
        if (list.length > 0) {
          setFeedbackList(list);
        }
      } catch {
        // 没有反馈数据，不报错
      }
    })();
  }, [currentSession?.id, setFeedbackList]);

  useEffect(() => {
    if (feedbackList.length === 0 && demoFeedbacks.length > 0) {
      setFeedbackList(demoFeedbacks);
    }
  }, []);

  useEffect(() => {
    if (students.length > 0 && studentNotes.length !== students.length) {
      setStudentNotes(students.map(s => ({
        studentId: s.id, studentName: s.name, performanceNote: '', performanceLevel: 'good',
      })));
    }
  }, [students.length]);

  useEffect(() => {
    if (viewMode === 'result' && editingId) {
      const fb = feedbackList.find(f => f.id === editingId);
      if (fb) setEditContent(fb.content);
    }
  }, [viewMode, editingId, feedbackList]);

  const notesFillCount = studentNotes.filter(n => n.performanceNote.trim().length > 0).length;
  const completedCount = feedbackList.filter(f => f.charCount >= 100).length;

  const updateNote = (studentId: string, field: 'performanceNote' | 'performanceLevel', value: string) => {
    setStudentNotes(prev => prev.map(n =>
      n.studentId === studentId ? { ...n, [field]: value } : n
    ));
  };

  const handleGenerateAll = async () => {
    if (!courseContent.trim()) { showToast('请先输入课程内容', 'error'); return; }
    if (notesFillCount === 0) { showToast('请至少填写一个学生的课堂表现', 'error'); return; }
    if (notesFillCount < students.length) {
      const ok = window.confirm(`还有 ${students.length - notesFillCount} 名学生未填写课堂表现，将使用默认生成。是否继续？`);
      if (!ok) return;
    }

    setIsGenerating(true);
    setBatchProgress({ current: 0, total: students.length });
    setStreamingContent({});
    setViewMode('result'); // 立即切换到结果视图，展示流式生成卡片

    try {
      await generateBatchFeedbackStreamed(
        courseContent, studentNotes, additionalPrompt,
        (index, total, result) => {
          setBatchProgress({ current: index, total });
          setStreamingContent(prev => { const next = { ...prev }; delete next[result.studentId]; return next; });
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
              studentId: result.studentId, sessionId: 'current',
              content: result.content, charCount: result.charCount,
              templateType: 'ai', status: 'draft' as const,
              createdAt: new Date().toISOString().slice(0, 10),
            }]);
          }
        },
        (studentId, partialText) => {
          setStreamingContent(prev => ({ ...prev, [studentId]: partialText }));
        },
      );
      showToast(`已完成 ${students.length} 名学生的反馈生成`, 'success');
      // setViewMode('result') 已在开头调用，无需重复
      const finalList = useAppStore.getState().feedbackList;
      if (finalList.length > 0) setEditingId(finalList[0].id);
    } catch {
      showToast('生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const note = studentNotes.find(n => n.studentId === studentId) || {
      studentId, studentName: student.name, performanceNote: '', performanceLevel: 'good',
    };
    setIsGenerating(true);
    try {
      const result = await generateSingleFeedback(courseContent, note, additionalPrompt);
      setFeedbackList(feedbackList.map(f =>
        f.studentId === studentId
          ? { ...f, content: result.content, charCount: result.charCount }
          : f
      ));
      if (editingId === studentId) setEditContent(result.content);
      showToast(`已重新生成 ${student.name} 的反馈`, 'success');
    } catch { showToast('生成失败', 'error'); }
    finally { setIsGenerating(false); }
  };

  const handleSave = async () => {
    if (editContent.length < 100) { showToast('反馈至少需要100字', 'error'); return; }
    try {
      const fb = feedbackList.find(f => f.id === editingId);
      if (fb && currentSession?.id) {
        await feedbackApi.save(fb.studentId, currentSession.id, editContent, fb.templateType || 'ai');
      }
      setFeedbackList(feedbackList.map(f =>
        f.id === editingId ? { ...f, content: editContent, charCount: editContent.length, status: 'draft' as const } : f
      ));
      showToast('反馈已保存', 'success');
    } catch (err: any) {
      showToast(err.message || '保存反馈失败', 'error');
    }
  };

  const handleExportFeedback = () => {
    if (feedbackList.length === 0) {
      showToast('没有可导出的反馈', 'error');
      return;
    }
    const headers = ['学生姓名', '反馈内容', '字数', '状态'];
    const rows = feedbackList.map((fb) => {
      const student = students.find((s) => s.id === fb.studentId);
      return [
        student?.name || '未知',
        fb.content,
        String(fb.charCount),
        fb.status,
      ];
    });
    exportToCsv('反馈列表.csv', headers, rows);
    showToast('反馈列表已导出', 'success');
  };

  const handleCopyAllFeedback = () => {
    if (feedbackList.length === 0) {
      showToast('没有可复制的反馈', 'error');
      return;
    }
    const lines: string[] = [];
    feedbackList.forEach((fb) => {
      const student = students.find((s) => s.id === fb.studentId);
      lines.push(`【${student?.name || '未知'}】`);
      lines.push(fb.content);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('全部反馈已复制到剪贴板', 'success'));
  };

  // ======= Step 1: Setup =======
  if (viewMode === 'setup') {
    return (
      <div>
        <div className="page-breadcrumb">首页 / <span>反馈管理</span></div>
        <div className="page-title-bar"><h2>AI 智能反馈生成</h2></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 课程内容 */}
          <div className="d-panel">
            <div className="d-panel-header">
              <h3>📚 课程内容</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>第 1 步</span>
            </div>
            <div className="d-panel-body">
              <textarea
                value={courseContent}
                onChange={(e) => setCourseContent(e.target.value)}
                placeholder="输入本节课的课程内容，如：Unit 5 Reading - 主要学习了关于天气的词汇和句型，包括 sunny/rainy/cloudy/windy 等形容词，以及 What's the weather like today? 问答句型。进行了课文阅读和角色扮演练习。"
                rows={8}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: courseContent ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7,
                  background: courseContent ? 'var(--primary-lighter)' : 'var(--bg)',
                }}
              />
            </div>
          </div>

          {/* 补充提示词 + 流程说明 */}
          <div>
            <div className="d-panel">
              <div className="d-panel-header"><h3>💬 补充提示词（可选）</h3></div>
              <div className="d-panel-body">
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="对所有学生通用的额外要求..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 13, outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {[
                    '提醒完成暑假作业', '下节课有单元测试', '注意复习前几单元',
                    '鼓励多开口说英语', '每天坚持听读15分钟', '家长关注口语练习',
                    '注意书写工整', '多看英语绘本',
                  ].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setAdditionalPrompt(prev => prev ? prev + '；' + tag : tag)}
                      className="d-btn d-btn-outline d-btn-sm"
                      style={{ fontSize: 11, borderRadius: 14 }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="d-panel" style={{ marginTop: 16, background: 'var(--bg)' }}>
              <div className="d-panel-header"><h3>📋 生成流程</h3></div>
              <div className="d-panel-body" style={{ fontSize: 13, lineHeight: 2, color: 'var(--text-secondary)' }}>
                <div><strong>1️⃣</strong> 输入本节课的课程内容 ← <span style={{ color: 'var(--primary)' }}>当前步骤</span></div>
                <div><strong>2️⃣</strong> 为每个学生选择表现等级 + 填写简要课堂表现</div>
                <div><strong>3️⃣</strong> 点击「一键生成」，AI 生成个性化反馈</div>
                <div><strong>4️⃣</strong> 查看结果，可逐个编辑或重新生成</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button
            className="d-btn d-btn-primary"
            style={{ height: 44, fontSize: 14, paddingLeft: 24, paddingRight: 24 }}
            onClick={() => {
              if (!courseContent.trim()) { showToast('请先输入课程内容', 'error'); return; }
              setViewMode('notes');
            }}
          >
            下一步：填写课堂表现 ▶
          </button>
        </div>
      </div>
    );
  }

  // ======= Step 2: Notes =======
  if (viewMode === 'notes') {
    return (
      <div>
        <div className="page-breadcrumb">首页 / <span>填写课堂表现</span></div>
        <div className="page-title-bar">
          <h2>第 2 步：填写每个学生的课堂表现</h2>
          <div className="actions">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>已填写 {notesFillCount}/{students.length}</span>
            <button className="d-btn d-btn-outline" onClick={() => setViewMode('setup')}>← 返回课程内容</button>
            <button className="d-btn d-btn-primary" style={{ background: 'linear-gradient(135deg, var(--primary), #7C3AED)' }} onClick={handleGenerateAll}>
              ✨ 一键生成全部反馈（{students.length}人）
            </button>
          </div>
        </div>

        {/* 快捷提示词 */}
        <div className="d-toolbar" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>快捷表现描述：</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              '课堂积极发言', '单词拼写有进步', '阅读理解准确率高',
              '口语表达流利', '注意力不集中', '笔记记录认真',
              '小组合作积极', '语法知识点需巩固', '发音需多练习',
            ].map(tag => (
              <button key={tag} className="d-btn d-btn-ghost d-btn-sm" style={{ fontSize: 11, borderRadius: 14, opacity: 0.7 }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 学生表格 */}
        <div className="d-panel">
          <table className="d-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>表现等级</th>
                <th>课堂表现</th>
                <th style={{ width: 60 }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const note = studentNotes.find(n => n.studentId === student.id);
                const level = note?.performanceLevel || 'good';
                const filled = (note?.performanceNote?.trim().length ?? 0) > 0;
                return (
                  <tr key={student.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StudentAvatar student={student} size={32} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{student.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {PERFORMANCE_OPTIONS.map(opt => (
                          <button
                            key={opt.level}
                            onClick={() => updateNote(student.id, 'performanceLevel', opt.level)}
                            style={{
                              padding: '3px 8px', borderRadius: 12, fontSize: 11, border: 'none',
                              background: level === opt.level ? opt.color : 'var(--bg)',
                              color: level === opt.level ? 'white' : 'var(--text-muted)',
                              fontWeight: level === opt.level ? 600 : 400, cursor: 'pointer',
                            }}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={note?.performanceNote || ''}
                        onChange={(e) => updateNote(student.id, 'performanceNote', e.target.value)}
                        placeholder="简要描述..."
                        style={{
                          width: '100%', padding: '6px 10px', borderRadius: 8,
                          border: filled ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                          fontSize: 12, outline: 'none',
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                        background: filled ? 'var(--success)' : 'var(--border)',
                      }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ======= Result View =======
  if (viewMode === 'result' && isGenerating) {
    const progressPercent = batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0;
    const currentStudentIdx = batchProgress.current - 1;
    const currentStudentName = currentStudentIdx >= 0 && currentStudentIdx < studentNotes.length
      ? studentNotes[currentStudentIdx].studentName
      : '';
    const completedStudentIds = new Set(
      feedbackList.filter(f => f.charCount >= 100).map(f => f.studentId)
    );

    return (
      <div>
        <div className="page-breadcrumb">首页 / <span>生成反馈中...</span></div>

        {/* 顶部状态栏 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', marginBottom: 16,
          background: 'linear-gradient(135deg, var(--primary-lighter, #EEF2FF), #F5F3FF)',
          borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>&#10024;</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>AI 正在生成反馈...</span>
            {currentStudentName && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                第 {batchProgress.current}/{batchProgress.total} 位 &mdash; {currentStudentName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 400, marginLeft: 24 }}>
            <div className="progress-bar" style={{ height: 8, flex: 1 }}>
              <div className="progress-fill" style={{
                width: `${progressPercent}%`,
                transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {batchProgress.current}/{batchProgress.total}
            </span>
          </div>
        </div>

        {/* 两列网格卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          {students.map((student, idx) => {
            const isStreaming = !!streamingContent[student.id];
            const isCompleted = completedStudentIds.has(student.id);
            const streamingText = streamingContent[student.id] || '';
            const completedFb = feedbackList.find(f => f.studentId === student.id && f.charCount >= 100);
            const note = studentNotes.find(n => n.studentId === student.id);
            const levelOption = PERFORMANCE_OPTIONS.find(o => o.level === (note?.performanceLevel || 'good'));
            const levelLabel = levelOption?.label || '表现良好';

            // 卡片边框样式
            let borderStyle: React.CSSProperties = {};
            if (isStreaming) {
              borderStyle = { border: '2px solid var(--primary)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.15)' };
            } else if (isCompleted) {
              borderStyle = { borderLeft: '3px solid var(--success)', border: '1px solid var(--border)' };
            } else {
              borderStyle = { border: '1px solid var(--border)', opacity: 0.6 };
            }

            return (
              <div
                key={student.id}
                className="d-panel"
                style={{
                  ...borderStyle,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* 卡片头部 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* 状态图标 */}
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: isCompleted ? 'var(--success)' : isStreaming ? 'var(--primary)' : 'var(--border)',
                      color: isCompleted || isStreaming ? 'white' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>
                      {isCompleted ? '\u2713' : isStreaming ? '\u25C9' : '\u25CB'}
                    </span>
                    <StudentAvatar student={student} size={24} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{student.name}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: levelOption?.color || 'var(--primary)', color: 'white',
                    }}>
                      {levelLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isCompleted ? `${completedFb?.charCount || 0}字 \u2713`
                      : isStreaming ? `已生成${streamingText.length}字`
                      : '排队等待中...'}
                  </span>
                </div>

                {/* 卡片内容区域 */}
                <div style={{
                  padding: '12px 14px',
                  minHeight: 150,
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'auto',
                  maxHeight: 220,
                }}>
                  {isCompleted && completedFb ? (
                    <span style={{ color: 'var(--text)' }}>{completedFb.content}</span>
                  ) : isStreaming ? (
                    <>
                      <span style={{ color: 'var(--text)' }}>{streamingText}</span>
                      <span style={{
                        display: 'inline-block', width: 2, height: 16,
                        background: 'var(--primary)', marginLeft: 1,
                        verticalAlign: 'text-bottom',
                        animation: 'blink 1s step-end infinite',
                      }} />
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>排队等待中...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 闪烁光标动画 */}
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (viewMode === 'result') {
    return (
      <div>
        <div className="page-breadcrumb">首页 / <span>反馈结果</span></div>
        <div className="page-title-bar">
          <h2>反馈生成结果</h2>
          <div className="actions">
            <span className="tag tag-primary">{completedCount}/{feedbackList.length} 已完成</span>
            <button className="d-btn d-btn-outline" onClick={() => setViewMode('notes')}>← 返回修改表现</button>
            <button className="d-btn d-btn-outline" onClick={() => setViewMode('setup')}>重新配置</button>
            <button className="d-btn d-btn-outline" onClick={handleCopyAllFeedback}>复制全部反馈</button>
            <button className="d-btn d-btn-outline" onClick={handleExportFeedback}>导出全部反馈</button>
            <button className="d-btn d-btn-primary" onClick={async () => {
              try {
                if (currentSession?.id && feedbackList.length > 0) {
                  const items = feedbackList
                    .filter(f => f.charCount >= 100)
                    .map(f => ({
                      studentId: f.studentId,
                      sessionId: currentSession.id,
                      content: f.content,
                      templateType: f.templateType || 'ai',
                    }));
                  if (items.length > 0) {
                    await feedbackApi.batch(items);
                  }
                }
                showToast(`已保存全部反馈（${completedCount}条有效）`, 'success');
              } catch (err: any) {
                showToast(err.message || '保存反馈失败', 'error');
              }
            }}>保存全部</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* 左侧：学生列表 */}
          <div className="d-panel">
            <div className="d-panel-header"><h3>学生列表</h3></div>
            <div className="d-panel-body" style={{ maxHeight: 650, overflowY: 'auto' }}>
              {feedbackList.map((fb, idx) => {
                const student = students.find(s => s.id === fb.studentId);
                const isActive = editingId === fb.id;
                const isComplete = fb.charCount >= 100;
                return (
                  <div
                    key={fb.id}
                    onClick={() => { setEditingId(fb.id); setEditContent(fb.content); }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', borderRadius: 8,
                      backgroundColor: isActive ? 'var(--primary-lighter)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <StudentAvatar student={student} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{student?.name || '未知'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {isComplete ? `${fb.charCount}字 · 已完成` : '待撰写'}
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isComplete ? 'var(--success)' : 'var(--warning)',
                    }} />
                  </div>
                );
              })}
              {feedbackList.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>暂无反馈</div>
              )}
            </div>
          </div>

          {/* 右侧：编辑区 */}
          <div className="d-panel">
            {editingId ? (
              <>
                <div className="d-panel-header">
                  <h3>编辑反馈</h3>
                  <div className="actions">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editContent.length}/150 字</span>
                    <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => handleRegenerate(
                      feedbackList.find(f => f.id === editingId)?.studentId || ''
                    )}>
                      重新生成
                    </button>
                    <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => {
                      navigator.clipboard.writeText(editContent).then(() => showToast('已复制', 'success'));
                    }}>复制</button>
                  </div>
                </div>
                <div className="d-panel-body">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="反馈内容"
                    rows={14}
                    className="feedback-textarea"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button className="d-btn d-btn-outline" onClick={handleSave}>保存</button>
                    <button className="d-btn d-btn-primary" onClick={() => {
                      handleSave();
                      const idx = feedbackList.findIndex(f => f.id === editingId);
                      if (idx < feedbackList.length - 1) {
                        const next = feedbackList[idx + 1];
                        setEditingId(next.id);
                        setEditContent(next.content);
                      }
                    }}>保存并下一个 ▶</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="d-panel-body" style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                <p>请从左侧选择一个学生查看反馈</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
