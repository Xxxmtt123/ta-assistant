import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

const PLANS = [
  {
    icon: '🧩',
    title: '方案一：浏览器扩展（全自动）',
    desc: '安装浏览器扩展后，数据自动填充到目标网站，全程无需手动操作',
    tag: '推荐',
    tagClass: 'm-tag-success',
    steps: '1. 安装 Chrome/Edge 扩展\n2. 登录目标网站\n3. 点击「一键推送」即可完成',
  },
  {
    icon: '🖥️',
    title: '方案二：桌面助手（自动化）',
    desc: '通过桌面助手软件，自动打开网页并填入数据',
    tag: '',
    tagClass: '',
    steps: '1. 下载桌面助手应用\n2. 配置目标网站地址\n3. 运行推送任务',
  },
  {
    icon: '📁',
    title: '方案三：文件整理（半手动）',
    desc: '导出整理好的文件和表格，手动上传到目标网站',
    tag: '',
    tagClass: '',
    steps: '1. 导出照片压缩包\n2. 导出汇总表格\n3. 复制反馈文本手动粘贴',
  },
];

export default function MobilePush() {
  const { photos, scores, feedbackList, students, setFeedbackList, showToast } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushStatusText, setPushStatusText] = useState('');

  // 待推送统计从 store 实时计算
  const pendingPhotos = photos.length;
  const pendingScores = scores.filter((s) => s.score !== null).length;
  const pendingFeedback = feedbackList.filter((f) => f.status === 'draft').length;

  // 根据真实数据构建推送步骤
  const buildPushSteps = () => {
    const photoHalf = Math.ceil(pendingPhotos / 2);
    return [
      { label: '准备推送...', pct: 0 },
      { label: `正在上传照片（0/${pendingPhotos}）...`, pct: 20 },
      { label: `正在上传照片（${photoHalf}/${pendingPhotos}）...`, pct: 40 },
      { label: `正在上传照片（${pendingPhotos}/${pendingPhotos}）...`, pct: 60 },
      { label: '正在推送成绩...', pct: 75 },
      { label: '正在推送反馈...', pct: 90 },
      { label: '推送完成！', pct: 100 },
    ];
  };

  const handlePush = () => {
    if (pushing) return;
    const steps = buildPushSteps();
    setPushing(true);
    showToast('开始推送...', 'info');

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setPushProgress(steps[stepIndex].pct);
        setPushStatusText(steps[stepIndex].label);
      }
      if (stepIndex >= steps.length - 1) {
        clearInterval(interval);
        // 推送动画完成后，将 feedbackList 中所有 status='draft' 的更新为 'pushed'
        setFeedbackList(
          feedbackList.map((f) =>
            f.status === 'draft' ? { ...f, status: 'pushed' as const } : f
          )
        );
        setTimeout(() => {
          setPushing(false);
          showToast('推送完成！', 'success');
        }, 800);
      }
    }, 1200);
  };

  // 复制反馈到剪贴板：将所有反馈内容按学生姓名分组
  const handleCopyFeedback = async () => {
    if (feedbackList.length === 0) {
      showToast('暂无反馈内容可复制', 'info');
      return;
    }
    const grouped = feedbackList
      .map((fb) => {
        const student = students.find((s) => s.id === fb.studentId);
        const studentName = student?.name || '未知学生';
        return `【${studentName}】\n${fb.content}`;
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(grouped);
      showToast(`已复制 ${feedbackList.length} 条反馈到剪贴板`, 'success');
    } catch {
      showToast('复制失败，请检查剪贴板权限', 'error');
    }
  };

  return (
    <>
      {/* 待推送统计 */}
      <div className="push-stats">
        <div className="push-stat-item">
          <div className="stat-num">{pendingPhotos}</div>
          <div className="stat-label">待推送照片</div>
        </div>
        <div className="push-stat-item">
          <div className="stat-num">{pendingScores}</div>
          <div className="stat-label">待推送成绩</div>
        </div>
        <div className="push-stat-item">
          <div className="stat-num">{pendingFeedback}</div>
          <div className="stat-label">待推送反馈</div>
        </div>
      </div>

      {/* 推送方案 */}
      <div className="m-section-title">选择推送方案</div>
      {PLANS.map((plan, i) => (
        <div
          key={i}
          className={`push-plan ${selectedPlan === i ? 'active' : ''}`}
          onClick={() => setSelectedPlan(i)}
        >
          <div className="plan-title">
            <span>{plan.icon}</span>
            {plan.title}
            {plan.tag && <span className={`m-tag ${plan.tagClass}`} style={{ fontSize: 10 }}>{plan.tag}</span>}
          </div>
          <div className="plan-desc">{plan.desc}</div>
          <div className="plan-steps">
            {plan.steps.split('\n').map((line, j) => (
              <span key={j}>{line}<br /></span>
            ))}
          </div>
        </div>
      ))}

      {/* 推送按钮 */}
      <div style={{ marginTop: 16 }}>
        <button
          className="m-btn m-btn-success m-btn-block"
          onClick={handlePush}
          disabled={pushing}
          style={{ fontSize: 16, padding: 14 }}
        >
          🚀 一键推送
        </button>
        <div className="push-progress" style={{ display: pushing || pushProgress > 0 ? 'block' : 'none' }}>
          <div className="push-fill" style={{ width: `${pushProgress}%` }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {pushStatusText}
        </div>
      </div>

      {/* 复制反馈到剪贴板 */}
      <div style={{ marginTop: 16 }}>
        <button
          className="m-btn m-btn-outline m-btn-block"
          onClick={handleCopyFeedback}
        >
          📋 复制反馈到剪贴板
        </button>
      </div>

      {/* 导出按钮 */}
      <div style={{ marginTop: 16 }}>
        <button
          className="m-btn m-btn-outline m-btn-block"
          onClick={() => showToast('汇总表格已导出', 'success')}
        >
          📊 导出汇总表格
        </button>
      </div>
    </>
  );
}
