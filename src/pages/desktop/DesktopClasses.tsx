import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { classApi, studentApi } from '@/services/api';
import type { Class, Student } from '@/types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];

const SEMESTERS = [
  { key: 'spring', label: '春学期', date: '3月 - 6月' },
  { key: 'summer', label: '暑假班', date: '7月 - 8月' },
  { key: 'autumn', label: '秋学期', date: '9月 - 12月' },
  { key: 'winter', label: '寒假期', date: '1月 - 2月' },
];

const DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const DEFAULT_CONTINUOUS_DATES = [
  '7月7日 周一', '7月8日 周二', '7月9日 周三', '7月10日 周四',
  '7月11日 周五', '7月14日 周一', '7月15日 周二', '7月16日 周三',
];

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];
const API_BASE = import.meta.env.PROD ? '' : 'https://ta-assistant-api.2144961248.workers.dev';

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

function StudentAvatar({ student, size = 32 }: { student: any; size?: number }) {
  if (student.avatarUrl || student.avatar_url) {
    return (
      <img
        src={student.avatarUrl || student.avatar_url}
        alt={student.name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: getAvatarColor(student.name), color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.375, fontWeight: 700, flexShrink: 0,
      }}
    >
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

export default function DesktopClasses() {
  const { classes, setClasses, currentClass, setCurrentClass, students, setStudents, showToast } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 班级详情视图
  const [showDetail, setShowDetail] = useState(false);
  const [detailClass, setDetailClass] = useState<Class | null>(null);

  // 学生编辑
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null); // null = 新增

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
  const [formMode, setFormMode] = useState<'weekly' | 'continuous'>('continuous');
  const [formDays, setFormDays] = useState<number[]>([5]);
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formTotalSessions, setFormTotalSessions] = useState(20);
  const [formStudentCount, setFormStudentCount] = useState(8);
  const [formDates, setFormDates] = useState<string[]>(DEFAULT_CONTINUOUS_DATES);

  // 日期选择器 ref（连续上课模式用）
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 挂载时从后端加载班级列表
  useEffect(() => {
    (async () => {
      try {
        const list = await classApi.list();
        setClasses(list || []);
      } catch (err: any) {
        showToast(err.message || '加载班级列表失败', 'error');
      }
    })();
  }, []);

  // 进入班级详情时加载该班学生
  useEffect(() => {
    if (!detailClass?.id) return;
    (async () => {
      try {
        const list = await studentApi.getByClass(detailClass.id);
        setStudents(list);
      } catch (err: any) {
        showToast(err.message || '加载学生列表失败', 'error');
      }
    })();
  }, [detailClass?.id]);

  const filtered = classes.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterSemester !== 'all' && c.semester !== filterSemester) return false;
    if (filterStatus !== 'all') {
      const done = Math.floor((c.totalSessions || 20) * 0.6);
      if (filterStatus === 'active' && done >= (c.totalSessions || 20)) return false;
      if (filterStatus === 'completed' && done < (c.totalSessions || 20)) return false;
    }
    return true;
  });

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormName('');
    setFormSemester('summer');
    setFormMode('continuous');
    setFormDays([5]);
    setFormStartTime('09:00');
    setFormEndTime('11:30');
    setFormTotalSessions(20);
    setFormStudentCount(8);
    setFormDates(DEFAULT_CONTINUOUS_DATES);
    setShowModal(true);
  };

  const openEditModal = (cls: Class) => {
    setModalMode('edit');
    setEditingId(cls.id);
    setFormName(cls.name);
    setFormSemester((cls.semester as any) || 'summer');
    setFormMode(cls.scheduleMode || 'continuous');
    setFormDays([5]);
    setFormStartTime('14:00');
    setFormEndTime('16:00');
    setFormTotalSessions(cls.totalSessions || 20);
    setFormStudentCount(cls.studentCount || 8);
    setFormDates(DEFAULT_CONTINUOUS_DATES);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('请输入班级名称', 'error');
      return;
    }
    if (formTotalSessions < 1) {
      showToast('总课次不能小于1', 'error');
      return;
    }
    if (formStudentCount < 1) {
      showToast('学生人数不能小于1', 'error');
      return;
    }

    const payload = {
      name: formName.trim(),
      semester: formSemester,
      scheduleMode: formMode,
      scheduleConfig: {
        days: formDays,
        startTime: formStartTime,
        endTime: formEndTime,
      },
      totalSessions: formTotalSessions,
      studentCount: formStudentCount,
    };

    try {
      if (modalMode === 'add') {
        const newClass = await classApi.create(payload);
        setClasses([...classes, newClass]);
        setCurrentClass(newClass);
        showToast(`班级「${formName}」创建成功`, 'success');
      } else if (editingId) {
        const updatedClass = await classApi.update(editingId, payload);
        const updated = classes.map(c =>
          c.id === editingId ? updatedClass : c
        );
        setClasses(updated);
        if (currentClass?.id === editingId) {
          setCurrentClass(updatedClass);
        }
        showToast('班级信息已更新', 'success');
      }
      closeModal();
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (cls: Class) => {
    const confirmed = window.confirm(`确定要删除班级「${cls.name}」吗？此操作不可恢复。`);
    if (!confirmed) return;
    try {
      await classApi.delete(cls.id);
      setClasses(classes.filter(c => c.id !== cls.id));
      if (currentClass?.id === cls.id) {
        setCurrentClass(null);
      }
      showToast(`班级「${cls.name}」已删除`, 'success');
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const toggleDay = (index: number) => {
    setFormDays(prev =>
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    );
  };

  const removeDate = (idx: number) => {
    setFormDates(formDates.filter((_, i) => i !== idx));
  };

  const addDate = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
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

  const handleDesktopDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
    if (formDates.includes(label)) {
      showToast('该日期已添加', 'error');
      e.target.value = '';
      return;
    }
    setFormDates([...formDates, label]);
    e.target.value = '';
  };

  const quickSetDates = (pattern: string) => {
    showToast(`已设置为${pattern}连续上课`, 'success');
  };

  const getProgress = (cls: Class) => {
    const total = cls.totalSessions || 20;
    const done = Math.floor(total * 0.6);
    const pct = Math.round((done / total) * 100);
    return { done, total, pct };
  };

  const getSemLabel = (sem?: string) => {
    const s = SEMESTERS.find(s => s.key === sem);
    return s ? s.label : '春学期';
  };

  const openDetail = (cls: Class) => {
    setDetailClass(cls);
    setCurrentClass(cls);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailClass(null);
  };

  const openAddStudent = () => {
    setEditingStudentId(null);
    setShowStudentModal(true);
  };

  const openEditStudent = (stu: Student) => {
    setEditingStudentId(stu.id);
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (stu: Student) => {
    if (!window.confirm(`确定要删除学生「${stu.name}」吗？`)) return;
    try {
      await studentApi.delete(stu.id);
      setStudents(students.filter(s => s.id !== stu.id));
      showToast(`已删除 ${stu.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || '删除学生失败', 'error');
    }
  };

  const isWeekly = formMode === 'weekly';

  return (
    <div>
      {/* 隐藏的原生日期选择器（连续上课模式用） */}
      <input
        ref={dateInputRef}
        type="date"
        onChange={handleDesktopDateSelect}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />

      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>班级管理</span></div>

      {/* 标题栏 */}
      <div className="page-title-bar">
        <h2>班级管理</h2>
        <button className="d-btn d-btn-primary" onClick={openAddModal}>+ 新建班级</button>
      </div>

      {/* 统计卡片 */}
      <div className="d-stats-grid" style={{ marginBottom: 20 }}>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--primary-lighter)', color: 'var(--primary)' }}>📚</div>
          <div className="d-stat-info">
            <div className="stat-value">{classes.length}</div>
            <div className="stat-label">总班级数</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>✓</div>
          <div className="d-stat-info">
            <div className="stat-value">{classes.filter(c => getProgress(c).pct < 100).length}</div>
            <div className="stat-label">进行中</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>👥</div>
          <div className="d-stat-info">
            <div className="stat-value">{classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}</div>
            <div className="stat-label">总学生数</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>📊</div>
          <div className="d-stat-info">
            <div className="stat-value">{classes.reduce((sum, c) => sum + (c.totalSessions || 0), 0)}</div>
            <div className="stat-label">总课次数</div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="d-toolbar">
        <input
          type="text"
          className="d-search"
          placeholder="搜索班级名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="d-select"
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
        >
          <option value="all">全部学期</option>
          {SEMESTERS.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select
          className="d-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="active">进行中</option>
          <option value="completed">已结课</option>
        </select>
      </div>

      {/* 班级表格 */}
      <div className="d-panel">
        <div className="d-panel-header">
          <h3>今日有课</h3>
        </div>
        <div className="d-panel-body" style={{ padding: 0 }}>
          <table className="d-table">
            <thead>
              <tr>
                <th>班级</th>
                <th>学期</th>
                <th>上课模式</th>
                <th>学生人数</th>
                <th>课程进度</th>
                <th>状态</th>
                <th style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.filter(c => c.id === currentClass?.id || c.scheduleMode === 'weekly').map((cls, idx) => {
                const prog = getProgress(cls);
                const isActive = prog.pct < 100;
                return (
                  <tr key={cls.id} onClick={() => openDetail(cls)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 32, borderRadius: 2, background: COLORS[idx % COLORS.length] }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{cls.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="tag tag-primary">{getSemLabel(cls.semester)}</span></td>
                    <td style={{ fontSize: 12 }}>{cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{cls.studentCount || 8} 人</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{prog.pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${isActive ? 'status-present' : 'status-absent'}`}>
                        {isActive ? '进行中' : '已结课'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="d-btn d-btn-ghost d-btn-sm"
                        onClick={(e) => { e.stopPropagation(); openEditModal(cls); }}
                      >
                        编辑
                      </button>
                      <button
                        className="d-btn d-btn-ghost d-btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                        style={{ color: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.filter(c => c.id === currentClass?.id || c.scheduleMode === 'weekly').length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                    今日没有课程安排
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 全部班级 */}
      <div className="d-panel" style={{ marginTop: 16 }}>
        <div className="d-panel-header">
          <h3>全部班级</h3>
          <span className="d-select" style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }}>共 {filtered.length} 个班级</span>
        </div>
        <div className="d-panel-body" style={{ padding: 0 }}>
          <table className="d-table">
            <thead>
              <tr>
                <th>班级</th>
                <th>学期</th>
                <th>上课模式</th>
                <th>学生人数</th>
                <th>课程进度</th>
                <th>状态</th>
                <th style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls, idx) => {
                const prog = getProgress(cls);
                const isActive = prog.pct < 100;
                return (
                  <tr key={cls.id} onClick={() => openDetail(cls)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 32, borderRadius: 2, background: COLORS[idx % COLORS.length] }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{cls.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="tag tag-primary">{getSemLabel(cls.semester)}</span></td>
                    <td style={{ fontSize: 12 }}>{cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{cls.studentCount || 8} 人</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{prog.pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${isActive ? 'status-present' : 'status-absent'}`}>
                        {isActive ? '进行中' : '已结课'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="d-btn d-btn-ghost d-btn-sm"
                        onClick={(e) => { e.stopPropagation(); openEditModal(cls); }}
                      >
                        编辑
                      </button>
                      <button
                        className="d-btn d-btn-ghost d-btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                        style={{ color: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                    {classes.length === 0 ? '暂无班级，点击右上角「新建班级」开始创建' : '没有匹配的班级'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新建/编辑班级弹窗 */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            className="d-panel"
            style={{ width: 680, maxHeight: '85vh', overflowY: 'auto', margin: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-panel-header">
              <h3>{modalMode === 'add' ? '新建班级' : '编辑班级'}</h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>
            <div className="d-panel-body">
              {/* 班级名称 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  班级名称 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="d-search"
                  placeholder="例如：初二英语A班"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 学期选择 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  学期/假期
                </label>
                <div className="semester-tabs">
                  {SEMESTERS.map(sem => (
                    <div
                      key={sem.key}
                      className={`semester-tab ${formSemester === sem.key ? 'active' : ''}`}
                      onClick={() => setFormSemester(sem.key as any)}
                    >
                      <div className="sem-label">{sem.label}</div>
                      <div className="sem-date">{sem.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 上课模式 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  上课模式
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`d-btn ${isWeekly ? 'd-btn-primary' : 'd-btn-outline'}`}
                    onClick={() => setFormMode('weekly')}
                    style={{ flex: 1 }}
                  >
                    每周重复
                  </button>
                  <button
                    className={`d-btn ${!isWeekly ? 'd-btn-primary' : 'd-btn-outline'}`}
                    onClick={() => setFormMode('continuous')}
                    style={{ flex: 1 }}
                  >
                    连续上课
                  </button>
                </div>
              </div>

              {/* 每周重复模式 */}
              {isWeekly && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                    每周上课日
                  </label>
                  <div className="day-grid">
                    {DAYS.map((day, i) => (
                      <div
                        key={i}
                        className={`day-btn ${formDays.includes(i) ? 'active' : ''}`}
                        onClick={() => toggleDay(i)}
                      >
                        <span className="day-char">{day}</span>
                        <span className="day-name">{DAY_NAMES[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 连续上课模式 */}
              {!isWeekly && (
                <div style={{ marginBottom: 16 }}>
                  <div className="continuous-section">
                    <h5>连续上课日期</h5>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      设置连续上课的具体日期
                    </p>
                    <div className="continuous-dates">
                      {formDates.map((d, i) => (
                        <div key={i} className="cont-date-item">
                          <span>{d}</span>
                          <button className="cont-del" onClick={() => removeDate(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button className="add-date-btn" onClick={addDate}>+ 添加上课日期</button>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>快捷设置</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="d-btn d-btn-outline d-btn-sm" style={{ flex: 1 }} onClick={() => quickSetDates('周一至周五')}>周一至周五</button>
                      <button className="d-btn d-btn-outline d-btn-sm" style={{ flex: 1 }} onClick={() => quickSetDates('周一至周六')}>周一至周六</button>
                      <button className="d-btn d-btn-outline d-btn-sm" style={{ flex: 1 }} onClick={() => quickSetDates('每天')}>每天</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 时间设置 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="time-row" style={{ margin: 0 }}>
                  <label>上课时间</label>
                  <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
                </div>
                <div className="time-row" style={{ margin: 0 }}>
                  <label>下课时间</label>
                  <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
              </div>

              {/* 课次与人数 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    总课次
                  </label>
                  <input
                    type="number"
                    className="d-search"
                    value={formTotalSessions}
                    onChange={(e) => setFormTotalSessions(Number(e.target.value))}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    学生人数
                  </label>
                  <input
                    type="number"
                    className="d-search"
                    value={formStudentCount}
                    onChange={(e) => setFormStudentCount(Number(e.target.value))}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="d-btn d-btn-outline" onClick={closeModal}>取消</button>
              <button className="d-btn d-btn-primary" onClick={handleSave}>
                {modalMode === 'add' ? '创建班级' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 班级详情视图 */}
      {showDetail && detailClass && (
        <ClassDetail
          cls={detailClass}
          students={students}
          onBack={closeDetail}
          onEditClass={() => { closeDetail(); openEditModal(detailClass); }}
          onAddStudent={openAddStudent}
          onEditStudent={openEditStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      )}

      {/* 学生编辑弹窗 */}
      {showStudentModal && (
        <StudentEditModal
          student={editingStudentId ? students.find(s => s.id === editingStudentId) || null : null}
          classId={detailClass?.id || currentClass?.id || ''}
          onSave={async (data) => {
            try {
              if (editingStudentId) {
                const updatedStudent = await studentApi.update(editingStudentId, data);
                setStudents(students.map(s => s.id === editingStudentId ? updatedStudent : s));
                showToast(`已更新 ${data.name}`, 'success');
              } else {
                const cid = detailClass?.id || currentClass?.id || '';
                const newStudent = await studentApi.create({ classId: cid, ...data });
                setStudents([...students, newStudent]);
                showToast(`已添加学生 ${data.name}`, 'success');
              }
              setShowStudentModal(false);
            } catch (err: any) {
              showToast(err.message || '学生操作失败', 'error');
            }
          }}
          onClose={() => setShowStudentModal(false)}
        />
      )}
    </div>
  );
}

// ====== 班级详情视图 ======
function ClassDetail({
  cls,
  students,
  onBack,
  onEditClass,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
}: {
  cls: Class;
  students: Student[];
  onBack: () => void;
  onEditClass: () => void;
  onAddStudent: () => void;
  onEditStudent: (stu: Student) => void;
  onDeleteStudent: (stu: Student) => void;
}) {
  const { showToast } = useAppStore();
  const [detailTab, setDetailTab] = useState<'info' | 'students'>('students');

  const prog = getProgressStatic(cls);

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / 班级管理 / <span>{cls.name}</span></div>

      {/* 标题栏 */}
      <div className="page-title-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="d-btn d-btn-outline d-btn-sm" onClick={onBack}>← 返回</button>
          <div>
            <h2 style={{ margin: 0 }}>{cls.name}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {getSemLabelStatic(cls.semester)} · {cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复'} · {cls.studentCount || 0}人 · {cls.totalSessions || 0}次课
            </div>
          </div>
        </div>
        <button className="d-btn d-btn-primary" onClick={onEditClass}>编辑班级</button>
      </div>

      {/* 统计卡片 */}
      <div className="d-stats-grid" style={{ marginBottom: 20 }}>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--primary-lighter)', color: 'var(--primary)' }}>📖</div>
          <div className="d-stat-info">
            <div className="stat-value">{prog.done}</div>
            <div className="stat-label">已上课次</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>📅</div>
          <div className="d-stat-info">
            <div className="stat-value">{prog.total - prog.done}</div>
            <div className="stat-label">剩余课次</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>👥</div>
          <div className="d-stat-info">
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">学生数</div>
          </div>
        </div>
        <div className="d-stat-card">
          <div className="d-stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>📊</div>
          <div className="d-stat-info">
            <div className="stat-value">{prog.pct}%</div>
            <div className="stat-label">完成进度</div>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="d-panel" style={{ marginBottom: 20 }}>
        <div className="d-panel-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>课程进度</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{prog.done} / {prog.total}</span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${prog.pct}%`, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
        {[
          { key: 'students' as const, label: `学生管理 (${students.length})` },
          { key: 'info' as const, label: '课程信息' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setDetailTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontSize: 13, fontWeight: detailTab === tab.key ? 700 : 400,
              color: detailTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: detailTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 学生管理 Tab */}
      {detailTab === 'students' && (
        <div className="d-panel">
          <div className="d-panel-header">
            <h3>学生列表</h3>
            <button className="d-btn d-btn-primary d-btn-sm" onClick={onAddStudent}>+ 添加学生</button>
          </div>
          <div className="d-panel-body" style={{ padding: 0 }}>
            <table className="d-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>学号</th>
                  <th>联系电话</th>
                  <th>家长</th>
                  <th>备注</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu) => (
                  <tr key={stu.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <StudentAvatar student={stu} size={32} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{stu.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stu.studentId || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stu.phone || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stu.parentName || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.note || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => onEditStudent(stu)}>编辑</button>
                      <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => onDeleteStudent(stu)} style={{ color: 'var(--danger)' }}>删除</button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                      暂无学生，点击「添加学生」开始添加
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 课程信息 Tab */}
      {detailTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="d-panel">
            <div className="d-panel-header"><h3>班级信息</h3></div>
            <div className="d-panel-body">
              {[
                { label: '班级名称', value: cls.name },
                { label: '学期', value: getSemLabelStatic(cls.semester) },
                { label: '上课模式', value: cls.scheduleMode === 'continuous' ? '连续上课' : '每周重复' },
                { label: '总课次', value: `${cls.totalSessions || 0} 次` },
                { label: '学生人数', value: `${cls.studentCount || 0} 人` },
                { label: '创建时间', value: cls.createdAt ? new Date(cls.createdAt).toLocaleDateString('zh-CN') : '-' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="d-panel">
            <div className="d-panel-header"><h3>排课详情</h3></div>
            <div className="d-panel-body">
              {cls.scheduleConfig?.startTime && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>上课时间</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cls.scheduleConfig.startTime} - {cls.scheduleConfig.endTime || '--:--'}</span>
                </div>
              )}
              {cls.scheduleConfig?.days && cls.scheduleConfig.days.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>上课日</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cls.scheduleConfig.days.map(d => DAY_NAMES[d]).join('、')}</span>
                </div>
              )}
              {cls.scheduleConfig?.continuousDates && cls.scheduleConfig.continuousDates.filter((d: string) => /^\d+月\d+日/.test(d)).length > 0 && (
                <div style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>连续上课日期</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cls.scheduleConfig.continuousDates.filter((d: string) => /^\d+月\d+日/.test(d)).map((d, i) => (
                      <span key={i} className="tag tag-primary" style={{ fontSize: 11 }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {(!cls.scheduleConfig?.days || cls.scheduleConfig.days.length === 0) && (!cls.scheduleConfig?.continuousDates || cls.scheduleConfig.continuousDates.length === 0) && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  暂未设置排课详情
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== 学生编辑弹窗 ======
function StudentEditModal({
  student,
  classId,
  onSave,
  onClose,
}: {
  student: Student | null;
  classId: string;
  onSave: (data: { name: string; studentId: string; phone: string; parentName: string; note: string }) => void;
  onClose: () => void;
}) {
  const { showToast, students, setStudents } = useAppStore();
  const [name, setName] = useState(student?.name || '');
  const [stuId, setStuId] = useState(student?.studentId || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [parentName, setParentName] = useState(student?.parentName || '');
  const [note, setNote] = useState(student?.note || '');
  const [avatarUrl, setAvatarUrl] = useState(student?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }
    onSave({
      name: name.trim(),
      studentId: stuId.trim(),
      phone: phone.trim(),
      parentName: parentName.trim(),
      note: note.trim(),
    });
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!student?.id) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(file, student.id);
      setAvatarUrl(url);
      setStudents(students.map((s) => (s.id === student.id ? { ...s, avatarUrl: url, avatar_url: url } : s)));
      showToast('头像上传成功', 'success');
    } catch (err: any) {
      showToast(err.message || '头像上传失败', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="d-panel"
        style={{ width: 460, maxHeight: '85vh', overflowY: 'auto', margin: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-panel-header">
          <h3>{student ? '编辑学生' : '添加学生'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="d-panel-body">
          {/* 头像区域（编辑模式显示） */}
          {student && (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <StudentAvatar student={{ ...student, avatar_url: avatarUrl }} size={48} />
                {uploading && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: 'white', fontSize: 10 }}>...</span>
                  </div>
                )}
              </div>
              <div>
                <button
                  className="d-btn d-btn-outline d-btn-sm"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  style={{ marginBottom: 4 }}
                >
                  {uploading ? '上传中...' : '设置头像'}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>支持 JPG、PNG 格式</div>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              学生姓名 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="d-search"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入学生姓名"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              学号
            </label>
            <input
              type="text"
              className="d-search"
              value={stuId}
              onChange={(e) => setStuId(e.target.value)}
              placeholder="请输入学号（可选）"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              联系电话
            </label>
            <input
              type="tel"
              className="d-search"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入联系电话"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              家长姓名
            </label>
            <input
              type="text"
              className="d-search"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="请输入家长姓名"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              备注
            </label>
            <input
              type="text"
              className="d-search"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选备注信息"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="d-btn d-btn-outline" onClick={onClose}>取消</button>
          <button
            className="d-btn d-btn-primary"
            onClick={handleSave}
            disabled={!name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            {student ? '保存修改' : '添加学生'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 辅助函数（提取为组件级别）
function getProgressStatic(cls: Class) {
  const total = cls.totalSessions || 20;
  const done = Math.floor(total * 0.6);
  const pct = Math.round((done / total) * 100);
  return { done, total, pct, remain: total - done };
}

function getSemLabelStatic(sem?: string) {
  const s = SEMESTERS.find(s => s.key === sem);
  return s ? s.label : '春学期';
}
