import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { classApi, studentApi } from '@/services/api';
import type { Class, ScheduleConfig, Student } from '@/types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];

const SEMESTERS = [
  { key: 'spring', label: '春学期', date: '3月 - 6月' },
  { key: 'summer', label: '暑假班', date: '7月 - 8月' },
  { key: 'autumn', label: '秋学期', date: '9月 - 12月' },
  { key: 'winter', label: '寒假期', date: '1月 - 2月' },
];

const DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const STUDENT_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

const API_BASE = import.meta.env.PROD ? '' : 'https://ta-assistant-api.2144961248.workers.dev';

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  return STUDENT_COLORS[hashName(name) % STUDENT_COLORS.length];
}

function StudentAvatar({ student, size = 34 }: { student: any; size?: number }) {
  if (student.avatarUrl || student.avatar_url) {
    const url = student.avatarUrl || student.avatar_url;
    return (
      <img
        src={url}
        alt={student.name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(student.name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {student.name.charAt(0)}
    </div>
  );
}

async function uploadAvatar(file: File, studentId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('ta_token');
  const res = await fetch(`${API_BASE}/api/avatars/upload?studentId=${studentId}`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传头像失败');
  }
  const data = await res.json();
  return data.url;
}

// 生成唯一ID
const genId = () => 'cls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

export default function MobileClasses() {
  const { classes, setClasses, setCurrentClass, showToast, currentClass, students: storeStudents, setStudents } = useAppStore();
  const [showDetail, setShowDetail] = useState(false);
  const [detailClass, setDetailClass] = useState<Class | null>(null);
  const [cdTab, setCdTab] = useState(0);
  const [semester, setSemester] = useState('summer');
  const [activeDays, setActiveDays] = useState<number[]>([5]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [editStudent, setEditStudent] = useState<number | null>(null);

  // ===== 班级编辑弹窗状态 =====
  const [showClassEdit, setShowClassEdit] = useState(false);
  const [classEditMode, setClassEditMode] = useState<'add' | 'edit'>('add');
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
  const [formMode, setFormMode] = useState<'weekly' | 'continuous'>('weekly');
  const [formDays, setFormDays] = useState<number[]>([5]);
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formContDates, setFormContDates] = useState<string[]>(['7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四', '7月11日 周五']);
  const [formTotalSessions, setFormTotalSessions] = useState(20);
  const [formStudentCount, setFormStudentCount] = useState(8);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const classList = await classApi.list();
      setClasses(classList || []);
      if (classList && classList.length > 0 && !currentClass) {
        setCurrentClass(classList[0]);
      }
    } catch (e: any) {
      showToast('加载数据失败', 'error');
    }
  }

  const todayClasses = classes.filter(c => c.id === currentClass?.id || c.scheduleMode === 'weekly').slice(0, 2);
  const allClasses = classes;

  const handleSelectClass = (cls: Class) => {
    setCurrentClass(cls);
    showToast(`已切换到 ${cls.name}`, 'success');
  };

  const openDetail = async (cls: Class) => {
    setDetailClass(cls);
    setShowDetail(true);
    setCdTab(0);
    setSemester(cls.semester || 'summer');
    try {
      const stuList = await classApi.getStudents(cls.id);
      setStudents(stuList);
    } catch (e: any) {
      showToast('加载学生列表失败', 'error');
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailClass(null);
  };

  const toggleDay = (index: number) => {
    setActiveDays(prev =>
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    );
  };

  const getScheduleMeta = (cls: Class) => {
    const semLabel = cls.semester === 'spring' ? '春学期' : cls.semester === 'summer' ? '暑假班' : cls.semester === 'autumn' ? '秋学期' : '寒假期';
    if (cls.scheduleMode === 'continuous') {
      return `${cls.studentCount || 8}人 · ${semLabel} · 连续上课`;
    }
    return `${cls.studentCount || 8}人 · ${semLabel} · 每周六 14:00-16:00`;
  };

  const getProgress = (cls: Class) => {
    const total = cls.totalSessions || 20;
    const done = Math.floor(total * 0.6);
    const remain = total - done;
    const pct = Math.round((done / total) * 100);
    return { done, total, remain, pct };
  };

  const isWeekly = semester !== 'summer';
  const students = (storeStudents && storeStudents.length > 0)
    ? storeStudents.map((s, i) => ({
        ...s,
        attendance: 10 + (i % 3),
        total: 12,
        status: ['正常', '正常', '关注', '全勤', '缺勤多'][i % 5] || '正常',
        statusClass: ['session-tag-done', 'session-tag-done', 'session-tag-absent', 'session-tag-done', 'session-tag-absent'][i % 5] || 'session-tag-done',
      }))
    : [];

  // ===== 班级 CRUD =====

  // 打开新增班级弹窗
  const openAddClass = () => {
    setClassEditMode('add');
    setEditClassId(null);
    setFormName('');
    setFormSemester('summer');
    setFormMode('weekly');
    setFormDays([5]);
    setFormStartTime('14:00');
    setFormEndTime('16:00');
    setFormContDates(['7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四', '7月11日 周五']);
    setFormTotalSessions(20);
    setFormStudentCount(8);
    setShowClassEdit(true);
  };

  // 打开编辑班级弹窗
  const openEditClass = (cls: Class) => {
    setClassEditMode('edit');
    setEditClassId(cls.id);
    setFormName(cls.name);
    setFormSemester(cls.semester || 'summer');
    setFormMode(cls.scheduleMode || 'weekly');
    setFormDays(cls.scheduleConfig?.days || [5]);
    setFormStartTime(cls.scheduleConfig?.startTime || '14:00');
    setFormEndTime(cls.scheduleConfig?.endTime || '16:00');
    setFormContDates(
      (cls.scheduleConfig?.continuousDates || [])
        .filter((d: string) => /^\d+月\d+日/.test(d))
    );
    setFormTotalSessions(cls.totalSessions || 20);
    setFormStudentCount(cls.studentCount || 8);
    setShowClassEdit(true);
  };

  // 保存班级（新增或编辑）
  const saveClass = async () => {
    if (!formName.trim()) {
      showToast('请输入班级名称', 'error');
      return;
    }

    const scheduleConfig: ScheduleConfig = {
      startTime: formStartTime,
      endTime: formEndTime,
    };
    if (formMode === 'weekly') {
      scheduleConfig.days = formDays;
    } else {
      scheduleConfig.continuousDates = formContDates;
    }

    try {
      if (classEditMode === 'add') {
        const newClass = await classApi.create({
          name: formName.trim(),
          semester: formSemester,
          scheduleMode: formMode,
          scheduleConfig,
          totalSessions: formTotalSessions,
          studentCount: formStudentCount,
        });
        const updated = [...classes, newClass];
        setClasses(updated);
        setCurrentClass(newClass);
        showToast(`班级 ${newClass.name} 创建成功`, 'success');
      } else if (editClassId) {
        const updatedClass = await classApi.update(editClassId, {
          name: formName.trim(),
          semester: formSemester,
          scheduleMode: formMode,
          scheduleConfig,
          totalSessions: formTotalSessions,
          studentCount: formStudentCount,
        });
        const updated = classes.map(c => c.id === editClassId ? updatedClass : c);
        setClasses(updated);
        setDetailClass(updatedClass);
        if (currentClass?.id === editClassId) {
          setCurrentClass(updatedClass);
        }
        showToast('班级信息已更新', 'success');
      }
      setShowClassEdit(false);
    } catch (e: any) {
      showToast(e.message || '操作失败', 'error');
    }
  };

  // 删除班级
  const deleteClass = async (cls: Class) => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      showToast('再次点击确认删除班级', 'info');
      return;
    }
    try {
      await classApi.delete(cls.id);
      const updated = classes.filter(c => c.id !== cls.id);
      setClasses(updated);
      if (currentClass?.id === cls.id) {
        setCurrentClass(updated.length > 0 ? updated[0] : null);
      }
      setConfirmDelete(false);
      closeDetail();
      showToast(`班级 ${cls.name} 已删除`, 'success');
    } catch (e: any) {
      showToast(e.message || '删除失败', 'error');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  // 表单内：切换每周/连续模式
  const formIsWeekly = formMode === 'weekly';

  const toggleFormDay = (index: number) => {
    setFormDays(prev =>
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    );
  };

  // 连续上课日期快捷设置
  const quickSetContinuous = (type: 'weekday' | 'mon-sat' | 'everyday') => {
    const baseDates: Record<string, string[]> = {
      weekday: ['7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四', '7月11日 周五'],
      'mon-sat': ['7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四', '7月11日 周五', '7月12日 周六'],
      everyday: ['7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四', '7月11日 周五', '7月12日 周六', '7月13日 周日'],
    };
    setFormContDates(baseDates[type]);
    showToast('已快捷设置日期', 'success');
  };

  // 排课设置 tab 快捷设置（连续模式）
  const setQuickDays = (days: number[]) => {
    setStartTime('09:00');
    setEndTime('11:30');
    setActiveDays(days);
    showToast(`已设置为${days.length === 7 ? '每天' : days.length === 6 ? '周一至周六' : '周一至周五'}连续上课`, 'success');
  };

  // 日期选择器 ref（连续上课模式用）
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 添加连续上课日期 — 打开原生日期选择器
  const addContDate = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        // 降级：让 input 变为可见并聚焦
        dateInputRef.current.style.pointerEvents = 'auto';
        dateInputRef.current.style.opacity = '1';
        dateInputRef.current.style.position = 'fixed';
        dateInputRef.current.style.top = '50%';
        dateInputRef.current.style.left = '50%';
        dateInputRef.current.style.transform = 'translate(-50%, -50%)';
        dateInputRef.current.style.zIndex = '99999';
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  // 原生日期选择器选中后的回调
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value; // "2026-07-15"
    if (!dateStr) return;

    // 转换为中文格式
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

    // 检查是否已存在
    if (formContDates.includes(label)) {
      showToast('该日期已添加', 'error');
      e.target.value = '';
      return;
    }

    setFormContDates([...formContDates, label]);

    // 清空 input 以便选择下一个日期
    e.target.value = '';
  };

  // 删除连续上课日期
  const removeContDate = (idx: number) => {
    setFormContDates(formContDates.filter((_, i) => i !== idx));
  };

  return (
    <>
      {/* 隐藏的原生日期选择器（连续上课模式用） */}
      <input
        ref={dateInputRef}
        type="date"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        onChange={handleDateSelect}
      />
      {/* 班级列表视图 */}
      <div className={`class-list-view ${showDetail ? 'hidden' : ''}`}>
        <div className="m-section-title">今日有课</div>
        {todayClasses.map((cls, i) => (
          <div
            key={cls.id}
            className="class-card-mobile"
            onClick={() => { handleSelectClass(cls); openDetail(cls); }}
          >
            <div className="ccm-color" style={{ background: COLORS[i % COLORS.length] }} />
            <div className="ccm-info">
              <div className="ccm-name">{cls.name}</div>
              <div className="ccm-meta">{getScheduleMeta(cls)}</div>
            </div>
            <div className="ccm-arrow">›</div>
          </div>
        ))}

        <div className="m-section-title">全部班级</div>
        {allClasses.map((cls, i) => (
          <div
            key={cls.id}
            className="class-card-mobile"
            onClick={() => { handleSelectClass(cls); openDetail(cls); }}
          >
            <div className="ccm-color" style={{ background: COLORS[i % COLORS.length] }} />
            <div className="ccm-info">
              <div className="ccm-name">{cls.name}</div>
              <div className="ccm-meta">{getScheduleMeta(cls)}</div>
            </div>
            <div className="ccm-arrow">›</div>
          </div>
        ))}
        {classes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, fontSize: 14, color: 'var(--text-muted)' }}>
            暂无班级，点击右下角 + 添加
          </div>
        )}

        {/* 悬浮添加按钮 */}
        <button
          onClick={openAddClass}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 80,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            fontSize: 28,
            fontWeight: 300,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            transition: 'transform 0.2s',
          }}
          onMouseDown={(e) => { (e.currentTarget.style as any).transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { (e.currentTarget.style as any).transform = 'scale(1)'; }}
          onMouseLeave={(e) => { (e.currentTarget.style as any).transform = 'scale(1)'; }}
        >
          +
        </button>
      </div>

      {/* 班级详情视图 */}
      {showDetail && detailClass && (
        <div className="class-detail-view active">
          <div className="cd-header">
            <button className="cd-back" onClick={closeDetail}>‹</button>
            <div style={{ flex: 1 }}>
              <div className="cd-title">{detailClass.name}</div>
              <div className="cd-sub">{detailClass.studentCount || 8}人 · {detailClass.totalSessions || 20}次课次</div>
            </div>
            <button
              onClick={() => openEditClass(detailClass)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: 16,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              编辑
            </button>
          </div>

          {/* 子Tab */}
          <div className="cd-tabs">
            <div className={`cd-tab ${cdTab === 0 ? 'active' : ''}`} onClick={() => setCdTab(0)}>课程进度</div>
            <div className={`cd-tab ${cdTab === 1 ? 'active' : ''}`} onClick={() => setCdTab(1)}>排课设置</div>
            <div className={`cd-tab ${cdTab === 2 ? 'active' : ''}`} onClick={() => setCdTab(2)}>学生管理</div>
          </div>

          {/* Tab 0: 课程进度 */}
          <div className={`cd-tab-content ${cdTab === 0 ? 'active' : ''}`}>
            {(() => {
              const prog = getProgress(detailClass);
              return (
                <>
                  <div className="progress-overview">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{detailClass.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          {semester === 'spring' ? '春学期 · 2026年3月-6月' : semester === 'summer' ? '暑假班 · 2026年7月-8月' : semester === 'autumn' ? '秋学期 · 2026年9月-12月' : '寒假期 · 2027年1月-2月'}
                        </div>
                      </div>
                      <span className="m-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>进行中</span>
                    </div>
                    <div className="progress-stats">
                      <div className="progress-stat-item"><div className="val">{prog.done}</div><div className="lbl">已上课次</div></div>
                      <div className="progress-stat-item"><div className="val">{prog.total}</div><div className="lbl">总课次</div></div>
                      <div className="progress-stat-item"><div className="val">{prog.remain}</div><div className="lbl">剩余课次</div></div>
                    </div>
                    <div className="progress-bar-lg"><div className="fill" style={{ width: `${prog.pct}%` }} /></div>
                    <div style={{ textAlign: 'right', fontSize: 10, opacity: 0.7, marginTop: 4 }}>完成 {prog.pct}%</div>
                  </div>

                  <div className="m-section-title" style={{ marginTop: 4 }}>课次记录</div>
                  <div className="session-timeline">
                    <div className="session-item">
                      <div className="session-num today">{prog.done}</div>
                      <div className="session-info"><h4>第{prog.done}次课</h4><p>7月12日 周六 14:00-16:00</p></div>
                      <span className="session-tag session-tag-today">今日</span>
                    </div>
                    <div className="session-item">
                      <div className="session-num done">{prog.done - 1}</div>
                      <div className="session-info"><h4>第{prog.done - 1}次课</h4><p>7月5日 周六 14:00-16:00</p></div>
                      <span className="session-tag session-tag-done">已完成</span>
                    </div>
                    <div className="session-item">
                      <div className="session-num done">{prog.done - 2}</div>
                      <div className="session-info"><h4>第{prog.done - 2}次课</h4><p>6月28日 周六 14:00-16:00</p></div>
                      <span className="session-tag session-tag-done">已完成</span>
                    </div>
                    <div className="session-item">
                      <div className="session-num future">{prog.done + 1}</div>
                      <div className="session-info"><h4>第{prog.done + 1}次课</h4><p>7月19日 周六 14:00-16:00</p></div>
                      <span className="session-tag session-tag-future">未上</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Tab 1: 排课设置 */}
          <div className={`cd-tab-content ${cdTab === 1 ? 'active' : ''}`}>
            <div className="schedule-card">
              <h4>学期/假期安排</h4>
              <div className="semester-tabs">
                {SEMESTERS.map(sem => (
                  <div
                    key={sem.key}
                    className={`semester-tab ${semester === sem.key ? 'active' : ''}`}
                    onClick={() => setSemester(sem.key)}
                  >
                    <div className="sem-label">{sem.label}</div>
                    <div className="sem-date">{sem.date}</div>
                  </div>
                ))}
              </div>

              {isWeekly ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>每周上课日</div>
                  <div className="day-grid">
                    {DAYS.map((day, i) => (
                      <div
                        key={i}
                        className={`day-btn ${activeDays.includes(i) ? 'active' : ''}`}
                        onClick={() => toggleDay(i)}
                      >
                        <span className="day-char">{day}</span>
                        <span className="day-name">{DAY_NAMES[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="time-row">
                    <label>上课</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="time-row">
                    <label>下课</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                  <div className="toggle-row" style={{ marginTop: 6 }}>
                    <div>
                      <div className="toggle-label">自动生成课次</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>根据排课规律自动在上课日创建课次记录</div>
                    </div>
                    <div className={`toggle-switch ${autoGenerate ? 'on' : ''}`} onClick={() => setAutoGenerate(!autoGenerate)} style={{ flexShrink: 0 }}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="continuous-section">
                    <h5>连续上课日期</h5>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>设置暑假连续上课的具体日期</p>
                    <div className="continuous-dates">
                      {formContDates.map((d, i) => (
                        <div key={i} className="cont-date-item">
                          <span>{d}</span>
                          <button className="cont-del" onClick={() => { removeContDate(i); showToast('已删除日期', 'success'); }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button className="add-date-btn" onClick={addContDate}>+ 添加上课日期</button>
                  </div>
                  <div className="time-row">
                    <label>上课</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="time-row">
                    <label>下课</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>快捷设置</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => setQuickDays([1,2,3,4,5])}>周一至周五</button>
                      <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => setQuickDays([1,2,3,4,5,6])}>周一至周六</button>
                      <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => setQuickDays([1,2,3,4,5,6,0])}>每天</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="schedule-card">
              <h4>课程信息</h4>
              <div className="toggle-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div><div className="toggle-label">课程名称</div></div>
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => openEditClass(detailClass)}>编辑</span>
              </div>
              <div className="toggle-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div><div className="toggle-label">总课次</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>当前学期/假期的总课次数</div></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{detailClass.totalSessions || 20}次</span>
              </div>
              <div className="toggle-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div><div className="toggle-label">上课模式</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>当前排课模式</div></div>
                <span className="session-tag session-tag-today">{isWeekly ? '每周重复' : '连续上课'}</span>
              </div>
              <div className="toggle-row">
                <div><div className="toggle-label">学生人数</div></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{detailClass.studentCount || 8}人</span>
              </div>
            </div>

            <button className="m-btn m-btn-primary m-btn-block" style={{ marginTop: 8 }} onClick={() => showToast('排课设置已保存！', 'success')}>
              保存排课设置
            </button>

            <button
              className="m-btn m-btn-block"
              style={{
                marginTop: 10,
                background: 'var(--danger-light)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                fontWeight: 600,
              }}
              onClick={() => { setConfirmDelete(false); deleteClass(detailClass); }}
            >
              {confirmDelete ? '确认删除班级' : '删除班级'}
            </button>
          </div>

          {/* Tab 2: 学生管理 */}
          <div className={`cd-tab-content ${cdTab === 2 ? 'active' : ''}`}>
            <div className="m-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="m-section-title" style={{ margin: 0 }}>学生列表</span>
                <span className="m-tag m-tag-primary">{students.length}人</span>
              </div>
              {students.map((stu, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < students.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <StudentAvatar student={stu} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{stu.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>出勤 {stu.attendance}/{stu.total}</div>
                  </div>
                  <span className={`session-tag ${stu.statusClass}`}>{stu.status}</span>
                  <div className="stu-actions">
                    <button className="stu-action-btn" onClick={() => setEditStudent(i)}>✎</button>
                    <button className="stu-action-btn danger" onClick={async () => {
                      try {
                        await studentApi.delete(stu.id);
                        const updated = storeStudents.filter(s => s.id !== stu.id);
                        setStudents(updated);
                        showToast(`已删除 ${stu.name}`, 'success');
                      } catch (e: any) {
                        showToast(e.message || '删除学生失败', 'error');
                      }
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="m-btn m-btn-outline m-btn-block" style={{ marginTop: 10 }} onClick={() => { setEditStudent(-1); }}>
              + 添加学生
            </button>
          </div>
        </div>
      )}

      {/* 学生添加/编辑弹窗 */}
      {editStudent !== null && (
        <div className="stu-edit-overlay active" onClick={() => setEditStudent(null)}>
          <div className="stu-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="stu-edit-header">
              <h3>{editStudent === -1 ? '添加学生' : '编辑学生'}</h3>
              <button className="stu-edit-close" onClick={() => setEditStudent(null)}>✕</button>
            </div>
            {/* 头像区域（编辑模式显示） */}
            {editStudent >= 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <StudentAvatar student={storeStudents[editStudent]} size={40} />
                <button
                  className="m-btn m-btn-outline m-btn-sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const stu = storeStudents[editStudent];
                      if (!stu) return;
                      showToast('正在上传头像...', 'info');
                      try {
                        const url = await uploadAvatar(file, stu.id);
                        const updated = storeStudents.map((s, i) => i === editStudent ? { ...s, avatarUrl: url, avatar_url: url } : s);
                        setStudents(updated);
                        showToast('头像上传成功', 'success');
                      } catch (err: any) {
                        showToast(err.message || '头像上传失败', 'error');
                      }
                    };
                    input.click();
                  }}
                >
                  设置头像
                </button>
              </div>
            )}
            <div className="stu-field">
              <label>学生姓名 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="stu-name-input"
                type="text"
                defaultValue={editStudent >= 0 ? (students[editStudent]?.name || '') : ''}
                placeholder="请输入学生姓名"
              />
            </div>
            <div className="stu-field">
              <label>学号</label>
              <input
                id="stu-id-input"
                type="text"
                defaultValue={editStudent >= 0 ? (students[editStudent]?.studentId || '') : ''}
                placeholder="请输入学号（可选）"
              />
            </div>
            <div className="stu-field">
              <label>联系电话</label>
              <input
                id="stu-phone-input"
                type="tel"
                defaultValue={editStudent >= 0 ? (students[editStudent]?.phone || '') : ''}
                placeholder="请输入联系电话"
              />
            </div>
            <div className="stu-field">
              <label>家长姓名</label>
              <input
                id="stu-parent-input"
                type="text"
                defaultValue={editStudent >= 0 ? (students[editStudent]?.parentName || '') : ''}
                placeholder="请输入家长姓名"
              />
            </div>
            <div className="stu-field">
              <label>备注</label>
              <input
                id="stu-note-input"
                type="text"
                defaultValue={editStudent >= 0 ? (students[editStudent]?.note || '') : ''}
                placeholder="可选备注信息"
              />
            </div>
            <div className="stu-edit-actions">
              <button className="m-btn m-btn-outline" onClick={() => setEditStudent(null)}>取消</button>
              <button className="m-btn m-btn-primary" onClick={async () => {
                const nameEl = document.getElementById('stu-name-input') as HTMLInputElement;
                const name = nameEl?.value.trim();
                if (!name) {
                  showToast('请输入学生姓名', 'error');
                  return;
                }
                const idEl = document.getElementById('stu-id-input') as HTMLInputElement;
                const phoneEl = document.getElementById('stu-phone-input') as HTMLInputElement;
                const parentEl = document.getElementById('stu-parent-input') as HTMLInputElement;
                const noteEl = document.getElementById('stu-note-input') as HTMLInputElement;

                if (editStudent === -1) {
                  const classId = detailClass?.id || currentClass?.id || '';
                  if (!classId) {
                    showToast('未选择班级', 'error');
                    return;
                  }
                  try {
                    const newStudent = await studentApi.create({
                      classId,
                      name,
                      studentId: idEl?.value.trim() || '',
                      phone: phoneEl?.value.trim() || '',
                      parentName: parentEl?.value.trim() || '',
                      note: noteEl?.value.trim() || '',
                    });
                    setStudents([...storeStudents, newStudent]);
                    showToast(`已添加学生 ${name}`, 'success');
                    setEditStudent(null);
                  } catch (e: any) {
                    showToast(e.message || '添加学生失败', 'error');
                  }
                } else {
                  const stu = storeStudents[editStudent];
                  if (!stu) return;
                  try {
                    const updatedStudent = await studentApi.update(stu.id, {
                      name,
                      studentId: idEl?.value.trim() || '',
                      phone: phoneEl?.value.trim() || '',
                      parentName: parentEl?.value.trim() || '',
                      note: noteEl?.value.trim() || '',
                    });
                    const updated = storeStudents.map((s, i) => i === editStudent ? updatedStudent : s);
                    setStudents(updated);
                    showToast(`已更新学生 ${name}`, 'success');
                    setEditStudent(null);
                  } catch (e: any) {
                    showToast(e.message || '更新学生失败', 'error');
                  }
                }
              }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 班级编辑弹窗（新增/编辑通用） */}
      {showClassEdit && (
        <div className="stu-edit-overlay active" onClick={() => setShowClassEdit(false)}>
          <div className="stu-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="stu-edit-header">
              <h3>{classEditMode === 'add' ? '新增班级' : '编辑班级'}</h3>
              <button className="stu-edit-close" onClick={() => setShowClassEdit(false)}>✕</button>
            </div>

            {/* 班级名称 */}
            <div className="stu-field">
              <label>班级名称 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="请输入班级名称，如：暑假班A班"
              />
            </div>

            {/* 学期选择 */}
            <div className="stu-field">
              <label>学期选择</label>
              <div className="semester-tabs">
                {SEMESTERS.map(sem => (
                  <div
                    key={sem.key}
                    className={`semester-tab ${formSemester === sem.key ? 'active' : ''}`}
                    onClick={() => setFormSemester(sem.key as 'spring' | 'summer' | 'autumn' | 'winter')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="sem-label">{sem.label}</div>
                    <div className="sem-date">{sem.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 上课模式 */}
            <div className="stu-field">
              <label>上课模式</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="m-btn m-btn-block"
                  style={{
                    flex: 1,
                    background: formIsWeekly ? 'var(--primary)' : 'var(--bg)',
                    color: formIsWeekly ? 'white' : 'var(--text-primary)',
                    border: formIsWeekly ? '1px solid var(--primary)' : '1.5px solid var(--border)',
                    fontWeight: 600,
                  }}
                  onClick={() => setFormMode('weekly')}
                >
                  每周重复
                </button>
                <button
                  className="m-btn m-btn-block"
                  style={{
                    flex: 1,
                    background: !formIsWeekly ? 'var(--primary)' : 'var(--bg)',
                    color: !formIsWeekly ? 'white' : 'var(--text-primary)',
                    border: !formIsWeekly ? '1px solid var(--primary)' : '1.5px solid var(--border)',
                    fontWeight: 600,
                  }}
                  onClick={() => setFormMode('continuous')}
                >
                  连续上课
                </button>
              </div>
            </div>

            {/* 每周重复模式 */}
            {formIsWeekly && (
              <div>
                <div className="stu-field">
                  <label>每周上课日</label>
                  <div className="day-grid">
                    {DAYS.map((day, i) => (
                      <div
                        key={i}
                        className={`day-btn ${formDays.includes(i) ? 'active' : ''}`}
                        onClick={() => toggleFormDay(i)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="day-char">{day}</span>
                        <span className="day-name">{DAY_NAMES[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="time-row">
                  <label>上课</label>
                  <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
                </div>
                <div className="time-row">
                  <label>下课</label>
                  <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
              </div>
            )}

            {/* 连续上课模式 */}
            {!formIsWeekly && (
              <div>
                <div className="continuous-section">
                  <h5>连续上课日期</h5>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>设置连续上课的具体日期</p>
                  <div className="continuous-dates">
                    {formContDates.map((d, i) => (
                      <div key={i} className="cont-date-item">
                        <span>{d}</span>
                        <button className="cont-del" onClick={() => removeContDate(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button className="add-date-btn" onClick={addContDate}>+ 添加上课日期</button>
                </div>
                <div className="time-row">
                  <label>上课</label>
                  <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
                </div>
                <div className="time-row">
                  <label>下课</label>
                  <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>快捷设置</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => quickSetContinuous('weekday')}>周一至周五</button>
                    <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => quickSetContinuous('mon-sat')}>周一至周六</button>
                    <button className="m-btn m-btn-sm m-btn-outline" style={{ flex: 1, minWidth: 'auto' }} onClick={() => quickSetContinuous('everyday')}>每天</button>
                  </div>
                </div>
              </div>
            )}

            {/* 总课次 */}
            <div className="stu-field" style={{ marginTop: 16 }}>
              <label>总课次</label>
              <input
                type="number"
                value={formTotalSessions}
                onChange={(e) => setFormTotalSessions(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
            </div>

            {/* 学生人数 */}
            <div className="stu-field">
              <label>学生人数</label>
              <input
                type="number"
                value={formStudentCount}
                onChange={(e) => setFormStudentCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
            </div>

            {/* 底部按钮 */}
            <div className="stu-edit-actions">
              <button className="m-btn m-btn-outline" onClick={() => setShowClassEdit(false)}>取消</button>
              <button className="m-btn m-btn-primary" onClick={saveClass}>
                {classEditMode === 'add' ? '创建班级' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
