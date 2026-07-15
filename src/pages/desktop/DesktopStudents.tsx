import { useState, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { exportToCsv, parseCsv } from '@/utils/csv';
import type { Student } from '@/types';

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

export default function DesktopStudents() {
  const { students, setStudents, classes, currentClass, setCurrentClass, showToast } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredStudents = students.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterClassId !== 'all' && s.classId !== filterClassId) return false;
    return true;
  });

  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : '-';
  };

  // 班级筛选：选中具体班级时同步到 currentClass，便于「添加学生」时关联
  const handleFilterClassChange = (value: string) => {
    setFilterClassId(value);
    if (value !== 'all') {
      const cls = classes.find((c) => c.id === value);
      if (cls) setCurrentClass(cls);
    }
  };

  const openAddModal = () => {
    if (!currentClass) {
      showToast('请先选择班级（可在上方班级筛选中选择一个班级）', 'error');
      return;
    }
    setEditingStudentId(null);
    setShowModal(true);
  };

  const openEditModal = (stu: Student) => {
    setEditingStudentId(stu.id);
    setShowModal(true);
  };

  const handleDelete = (stu: Student) => {
    if (!window.confirm(`确定要删除学生「${stu.name}」吗？`)) return;
    setStudents(students.filter((s) => s.id !== stu.id));
    showToast(`已删除 ${stu.name}`, 'success');
  };

  const handleSave = (data: { name: string; studentId: string; phone: string; parentName: string; note: string }) => {
    if (editingStudentId) {
      setStudents(students.map((s) => (s.id === editingStudentId ? { ...s, ...data } : s)));
      showToast(`已更新 ${data.name}`, 'success');
    } else {
      const newStudent: Student = {
        id: 'stu_' + Date.now(),
        classId: currentClass!.id,
        ...data,
        createdAt: new Date().toISOString(),
      };
      setStudents([...students, newStudent]);
      showToast(`已添加学生 ${data.name}`, 'success');
    }
    setShowModal(false);
    setEditingStudentId(null);
  };

  const editingStudent = editingStudentId ? students.find((s) => s.id === editingStudentId) || null : null;

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      showToast('没有可导出的学生', 'error');
      return;
    }
    const headers = ['姓名', '学号', '联系电话', '家长姓名', '备注'];
    const rows = filteredStudents.map((s) => [
      s.name,
      s.studentId,
      s.phone,
      s.parentName,
      s.note,
    ]);
    exportToCsv('学生名单.csv', headers, rows);
    showToast(`已导出 ${filteredStudents.length} 名学生`, 'success');
  };

  const handleImportClick = () => {
    if (!currentClass) {
      showToast('请先选择班级（可在上方班级筛选中选择一个班级）', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const { rows } = parseCsv(text);
      if (rows.length === 0) {
        showToast('CSV 文件为空或格式不正确', 'error');
        return;
      }
      const toImport = rows
        .map((row) => ({
          name: row[0]?.trim() || '',
          studentId: row[1]?.trim() || '',
          phone: row[2]?.trim() || '',
          parentName: row[3]?.trim() || '',
          note: row[4]?.trim() || '',
        }))
        .filter((r) => r.name.length > 0);
      if (toImport.length === 0) {
        showToast('未找到有效的学生数据，请检查 CSV 格式', 'error');
        return;
      }
      const ok = window.confirm(`即将导入 ${toImport.length} 名学生，是否继续？`);
      if (!ok) return;
      const newStudents: Student[] = toImport.map((r) => ({
        id: 'stu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        classId: currentClass!.id,
        name: r.name,
        studentId: r.studentId,
        phone: r.phone,
        parentName: r.parentName,
        note: r.note,
        createdAt: new Date().toISOString(),
      }));
      setStudents([...students, ...newStudents]);
      showToast(`成功导入 ${newStudents.length} 名学生`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>学生管理</span></div>

      {/* 页面标题 */}
      <div className="page-title-bar">
        <h2>学生管理</h2>
        <div className="actions">
          <button onClick={openAddModal} className="d-btn d-btn-primary">+ 添加学生</button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="d-toolbar">
        <button onClick={handleImportClick} className="d-btn d-btn-outline">导入学生名单</button>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索学生姓名..."
          className="d-search"
        />
        <button onClick={handleExport} className="d-btn d-btn-outline">导出学生名单</button>
        <select
          className="d-select"
          value={filterClassId}
          onChange={(e) => handleFilterClassChange(e.target.value)}
        >
          <option value="all">全部班级</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* 学生表格 */}
      <div className="d-panel">
        <div className="d-panel-body" style={{ padding: 0 }}>
          <table className="d-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>班级</th>
                <th>学号</th>
                <th>电话</th>
                <th>家长</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={student.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: AVATAR_COLORS[index % AVATAR_COLORS.length], color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{student.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{getClassName(student.classId)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{student.studentId || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{student.phone || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{student.parentName || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.note || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(student)}
                        className="d-btn d-btn-sm d-btn-ghost"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="d-btn d-btn-sm d-btn-ghost"
                        style={{ color: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              {students.length === 0 ? '暂无学生数据，点击右上角「添加学生」开始添加' : '没有匹配的学生'}
            </div>
          )}
        </div>
      </div>

      {/* 学生新增/编辑弹窗 */}
      {showModal && (
        <StudentEditModal
          student={editingStudent}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingStudentId(null); }}
        />
      )}
    </div>
  );
}

// ====== 学生编辑弹窗 ======
function StudentEditModal({
  student,
  onSave,
  onClose,
}: {
  student: Student | null;
  onSave: (data: { name: string; studentId: string; phone: string; parentName: string; note: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(student?.name || '');
  const [stuId, setStuId] = useState(student?.studentId || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [parentName, setParentName] = useState(student?.parentName || '');
  const [note, setNote] = useState(student?.note || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      studentId: stuId.trim(),
      phone: phone.trim(),
      parentName: parentName.trim(),
      note: note.trim(),
    });
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
