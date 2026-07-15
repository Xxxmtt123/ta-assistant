import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { Feedback } from '@/types';

interface PushRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionLabel: string;
  type: 'photo' | 'feedback';
  status: 'pending' | 'pushed' | 'failed';
  pushedAt: string | null;
  feedback?: Feedback;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待推送', cls: 'status-pending' },
  pushed: { label: '已推送', cls: 'status-done' },
  failed: { label: '失败', cls: 'status-incomplete' },
};

const typeMap: Record<string, { label: string; icon: string }> = {
  photo: { label: '照片', icon: '🖼️' },
  feedback: { label: '反馈', icon: '💬' },
};

export default function DesktopPush() {
  const { students, photos, feedbackList, setFeedbackList, currentSession, showToast } = useAppStore();

  const sessionLabel = currentSession
    ? `第${currentSession.sessionNumber}课 ${currentSession.date}`
    : '当前课次';

  // 从 store 数据动态生成推送记录：每个学生有照片和反馈两条记录
  const records = useMemo<PushRecord[]>(() => {
    const recs: PushRecord[] = [];
    students.forEach((student) => {
      const studentPhotos = photos.filter((p) => p.studentId === student.id);
      const feedback = feedbackList.find((f) => f.studentId === student.id);

      // 照片记录：photos 中有该学生的记录则为"已推送"，否则"待推送"
      recs.push({
        id: `photo-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        sessionLabel,
        type: 'photo',
        status: studentPhotos.length > 0 ? 'pushed' : 'pending',
        pushedAt: studentPhotos.length > 0 ? studentPhotos[0].createdAt : null,
      });

      // 反馈记录：使用 feedbackList 中该学生的 status 字段
      // 注意：feedback.status 的 'draft' 在推送记录中映射为 'pending'（待推送）
      const feedbackStatus: 'pending' | 'pushed' | 'failed' =
        feedback == null
          ? 'pending'
          : feedback.status === 'pushed'
            ? 'pushed'
            : feedback.status === 'failed'
              ? 'failed'
              : 'pending';
      recs.push({
        id: `feedback-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        sessionLabel,
        type: 'feedback',
        status: feedbackStatus,
        pushedAt: feedback && feedback.status === 'pushed' ? feedback.createdAt : null,
        feedback,
      });
    });
    return recs;
  }, [students, photos, feedbackList, sessionLabel]);

  // 统计卡片从真实数据计算
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const pushedCount = records.filter((r) => r.status === 'pushed').length;
  const failedCount = records.filter((r) => r.status === 'failed').length;

  const statCards = [
    { label: '待推送', value: pendingCount, bg: 'var(--warning-light)', color: 'var(--warning)', icon: '⏳' },
    { label: '已推送', value: pushedCount, bg: 'var(--success-light)', color: 'var(--success)', icon: '✅' },
    { label: '推送失败', value: failedCount, bg: 'var(--danger-light)', color: 'var(--danger)', icon: '❌' },
    { label: '总计', value: records.length, bg: 'var(--primary-lighter)', color: 'var(--primary)', icon: '📋' },
  ];

  // 单条反馈推送：复制内容到剪贴板，更新状态为 pushed
  const handlePushFeedback = async (record: PushRecord) => {
    if (!record.feedback) {
      showToast('该学生暂无反馈内容，请先撰写反馈', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(record.feedback.content);
      setFeedbackList(
        feedbackList.map((f) =>
          f.id === record.feedback!.id ? { ...f, status: 'pushed' as const } : f
        )
      );
      showToast(`已复制 ${record.studentName} 的反馈到剪贴板`, 'success');
    } catch {
      showToast('复制失败，请检查剪贴板权限', 'error');
    }
  };

  // 一键推送全部：依次复制所有待推送反馈到剪贴板，每次间隔 500ms
  const handlePushAll = async () => {
    const pendingFeedbacks = feedbackList.filter((f) => f.status === 'draft');
    if (pendingFeedbacks.length === 0) {
      showToast('没有待推送的反馈', 'info');
      return;
    }
    showToast(`开始推送 ${pendingFeedbacks.length} 条反馈...`, 'info');
    try {
      for (const fb of pendingFeedbacks) {
        await navigator.clipboard.writeText(fb.content);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const pushedIds = new Set(pendingFeedbacks.map((f) => f.id));
      setFeedbackList(
        feedbackList.map((f) =>
          pushedIds.has(f.id) ? { ...f, status: 'pushed' as const } : f
        )
      );
      showToast(`已完成 ${pendingFeedbacks.length} 条反馈推送`, 'success');
    } catch {
      showToast('推送失败，请检查剪贴板权限', 'error');
    }
  };

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>数据推送</span></div>

      {/* 页面标题 */}
      <div className="page-title-bar">
        <h2>数据推送</h2>
        <div className="actions">
          <button onClick={handlePushAll} className="d-btn d-btn-primary">
            一键推送全部
          </button>
        </div>
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

      {/* 推送方式 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { title: '浏览器扩展', desc: '安装 Chrome 扩展后，在目标网站打开时自动识别并填充数据到对应学生位置，一键完成推送。', icon: '🔌', tag: '推荐', tagCls: 'tag-success' },
          { title: '剪贴板复制', desc: '将照片或反馈内容复制到系统剪贴板，手动粘贴到目标网站的对应位置。', icon: '📋', tag: '通用', tagCls: 'tag-primary' },
          { title: '导出文件', desc: '将照片、反馈、成绩导出为 ZIP 压缩包或 Excel 表格，手动上传到目标网站。', icon: '📁', tag: '备用', tagCls: 'tag-warning' },
        ].map((plan) => (
          <div key={plan.title} className="push-plan">
            <div className="plan-title">
              <span>{plan.icon}</span>
              <span>{plan.title}</span>
              <span className={`tag ${plan.tagCls}`} style={{ marginLeft: 'auto' }}>{plan.tag}</span>
            </div>
            <p className="plan-desc">{plan.desc}</p>
          </div>
        ))}
      </div>

      {/* 推送记录 */}
      <div className="d-panel">
        <div className="d-panel-header">
          <h3>推送记录</h3>
          <button onClick={handlePushAll} className="d-btn d-btn-sm d-btn-primary">一键推送全部</button>
        </div>
        <div className="d-panel-body" style={{ padding: 0 }}>
          <table className="d-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>课次</th>
                <th>类型</th>
                <th>状态</th>
                <th>推送时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const st = statusMap[record.status];
                const tp = typeMap[record.type];
                return (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 600 }}>{record.studentName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{record.sessionLabel}</td>
                    <td>{tp.icon} {tp.label}</td>
                    <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{record.pushedAt || '-'}</td>
                    <td>
                      {record.type === 'feedback' && record.status === 'pending' && (
                        <button onClick={() => handlePushFeedback(record)} className="d-btn d-btn-sm d-btn-primary">推送</button>
                      )}
                      {record.type === 'feedback' && record.status === 'failed' && (
                        <button onClick={() => handlePushFeedback(record)} className="d-btn d-btn-sm" style={{ background: 'var(--danger)', color: 'white' }}>重试</button>
                      )}
                      {record.type === 'feedback' && record.status === 'pushed' && (
                        <span style={{ fontSize: '12px', color: 'var(--success)' }}>已完成</span>
                      )}
                      {record.type === 'photo' && record.status === 'pending' && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>待上传</span>
                      )}
                      {record.type === 'photo' && record.status === 'pushed' && (
                        <span style={{ fontSize: '12px', color: 'var(--success)' }}>已完成</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {records.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
              暂无推送记录，请先选择班级并添加学生
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
