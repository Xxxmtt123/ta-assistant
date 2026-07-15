import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { Resource, ResourceType } from '@/types';

const TYPE_META: Record<ResourceType, { label: string; icon: string; color: string; bg: string }> = {
  link:  { label: '链接', icon: '🔗', color: 'var(--primary)',   bg: 'var(--primary-lighter)' },
  doc:   { label: '文档', icon: '📄', color: 'var(--info)',      bg: 'var(--info-light)' },
  word:  { label: 'Word', icon: '📝', color: '#185ABD',          bg: '#D6E4F7' },
  ppt:   { label: 'PPT',  icon: '📊', color: '#D24726',          bg: '#F7DDD6' },
  pdf:   { label: 'PDF',  icon: '📕', color: '#E53935',          bg: '#FADAD9' },
  excel: { label: 'Excel', icon: '📈', color: '#217346',         bg: '#D6EAD6' },
  image: { label: '图片', icon: '🖼️', color: 'var(--warning)',   bg: 'var(--warning-light)' },
  other: { label: '其他', icon: '📦', color: 'var(--text-muted)', bg: 'var(--bg)' },
};

const CATEGORIES = ['全部', '答案库', '模板资料', '常用网站', '教材课件', '教研资料', '其他'];

const DEMO_RESOURCES: Resource[] = [
  { id: 'r1', userId: 'dev', title: '剑桥少儿英语二级答案（全册）', type: 'doc', category: '答案库', url: '#', description: 'Starters/Movers/FLyers 全套答案汇总', tags: ['剑桥', '答案'], createdAt: '2024-07-01', updatedAt: '2024-07-10' },
  { id: 'r2', userId: 'dev', title: '新概念一册课文录音', type: 'link', category: '教材课件', url: 'https://example.com', description: '第一册全部课文音频，可在线播放', tags: ['新概念', '音频'], createdAt: '2024-06-20', updatedAt: '2024-06-20' },
  { id: 'r3', userId: 'dev', title: '2024暑假班课程表模板', type: 'excel', category: '模板资料', url: '#', fileSize: '45 KB', tags: ['暑假班', '模板'], createdAt: '2024-07-05', updatedAt: '2024-07-05' },
  { id: 'r4', userId: 'dev', title: '家长沟通话术模板', type: 'word', category: '模板资料', url: '#', fileSize: '32 KB', description: '课后反馈、期中沟通、假期安排等常用模板', tags: ['沟通', '模板'], createdAt: '2024-05-15', updatedAt: '2024-07-01' },
  { id: 'r5', userId: 'dev', title: '某英语在线平台登录', type: 'link', category: '常用网站', url: 'https://example.com', tags: ['平台', '作业'], createdAt: '2024-03-01', updatedAt: '2024-03-01' },
  { id: 'r6', userId: 'dev', title: '小升初真题汇总（近5年）', type: 'pdf', category: '教研资料', url: '#', fileSize: '2.8 MB', description: '2019-2024 小升初英语真题及解析', tags: ['真题', '小升初'], createdAt: '2024-06-01', updatedAt: '2024-06-15' },
  { id: 'r7', userId: 'dev', title: '课堂奖励PPT模板', type: 'ppt', category: '模板资料', url: '#', fileSize: '1.2 MB', tags: ['PPT', '奖励'], createdAt: '2024-04-10', updatedAt: '2024-05-20' },
  { id: 'r8', userId: 'dev', title: '音标教学挂图', type: 'image', category: '教材课件', url: '#', fileSize: '890 KB', tags: ['音标', '教学'], createdAt: '2024-02-28', updatedAt: '2024-02-28' },
];

export default function DesktopLibrary() {
  const { resources, setResources, showToast } = useAppStore();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [activeType, setActiveType] = useState<ResourceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // 首次加载时填充 demo 数据
  const allResources = resources.length > 0 ? resources : DEMO_RESOURCES;

  const filtered = allResources.filter(r => {
    if (activeCategory !== '全部' && r.category !== activeCategory) return false;
    if (activeType !== 'all' && r.type !== activeType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q) && !r.tags?.some(t => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const openAdd = () => {
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (r: Resource) => {
    setEditId(r.id);
    setShowModal(true);
  };

  const handleDelete = (r: Resource) => {
    if (!window.confirm(`确定要删除「${r.title}」吗？`)) return;
    const updated = allResources.filter(x => x.id !== r.id);
    setResources(updated);
    showToast(`已删除 ${r.title}`, 'success');
  };

  const handleSave = (data: Partial<Resource>) => {
    if (!data.title?.trim()) {
      showToast('请输入资源名称', 'error');
      return;
    }
    if (!data.url?.trim()) {
      showToast('请输入链接地址', 'error');
      return;
    }

    if (editId) {
      const updated = allResources.map(r =>
        r.id === editId ? { ...r, ...data, updatedAt: new Date().toISOString().slice(0, 10) } : r
      );
      setResources(updated);
      showToast('资源已更新', 'success');
    } else {
      const newResource: Resource = {
        id: 'res_' + Date.now(),
        userId: 'dev',
        title: data.title.trim(),
        type: (data.type as ResourceType) || 'link',
        category: data.category || '其他',
        url: data.url.trim(),
        description: data.description || '',
        tags: data.tags || [],
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      setResources([newResource, ...allResources]);
      showToast(`已添加 ${newResource.title}`, 'success');
    }
    setShowModal(false);
  };

  const handleOpen = (r: Resource) => {
    if (r.url && r.url !== '#') {
      window.open(r.url, '_blank');
    } else {
      setPreviewId(r.id);
    }
  };

  // 统计分类数量
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === '全部' ? allResources.length : allResources.filter(r => r.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const editingResource = editId ? allResources.find(r => r.id === editId) : null;

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>资料库</span></div>

      {/* 标题栏 */}
      <div className="page-title-bar">
        <h2>资料库</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="d-btn d-btn-outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '☰ 列表视图' : '▦ 网格视图'}
          </button>
          <button className="d-btn d-btn-primary" onClick={openAdd}>+ 新增资源</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* 左侧分类 */}
        <div className="d-panel">
          <div className="d-panel-header"><h3>分类</h3></div>
          <div className="d-panel-body" style={{ padding: 8 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontWeight: activeCategory === cat ? 600 : 400,
                  color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: activeCategory === cat ? 'var(--primary-lighter)' : 'transparent',
                  transition: 'all 0.15s',
                  marginBottom: 2,
                }}
              >
                <span>{cat}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{categoryCounts[cat] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div>
          {/* 工具栏 */}
          <div className="d-toolbar" style={{ marginBottom: 16 }}>
            <input
              type="text"
              className="d-search"
              placeholder="搜索资源名称、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="d-select"
              value={activeType}
              onChange={(e) => setActiveType(e.target.value as any)}
            >
              <option value="all">全部类型</option>
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>

          {/* 资源网格 */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map(r => {
                const meta = TYPE_META[r.type];
                return (
                  <div
                    key={r.id}
                    className="d-panel"
                    style={{
                      cursor: 'pointer', transition: 'all 0.2s', margin: 0,
                      border: '1.5px solid transparent',
                    }}
                    onClick={() => handleOpen(r)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.12)';
                      e.currentTarget.style.borderColor = 'var(--primary-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div className="d-panel-body" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div
                          style={{
                            width: 40, height: 40, borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20, background: meta.bg,
                          }}
                        >
                          {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.label} · {r.category}</div>
                        </div>
                      </div>
                      {r.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.description}
                        </div>
                      )}
                      {r.tags && r.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {r.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="tag tag-primary" style={{ fontSize: 10, padding: '2px 6px' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.updatedAt}</span>
                        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="d-btn d-btn-ghost d-btn-sm"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            style={{ padding: '4px 8px', fontSize: 11 }}
                          >
                            编辑
                          </button>
                          <button
                            className="d-btn d-btn-ghost d-btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                            style={{ padding: '4px 8px', fontSize: 11, color: 'var(--danger)' }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-white)', borderRadius: 12 }}>
                  暂无匹配的资源，点击「新增资源」添加吧
                </div>
              )}
            </div>
          ) : (
            <div className="d-panel">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>资源名称</th>
                    <th>类型</th>
                    <th>分类</th>
                    <th>标签</th>
                    <th>更新时间</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const meta = TYPE_META[r.type];
                    return (
                      <tr key={r.id} onClick={() => handleOpen(r)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, background: meta.bg,
                              }}
                            >
                              {meta.icon}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                              {r.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="tag tag-primary">{meta.label}</span></td>
                        <td style={{ fontSize: 12 }}>{r.category}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {r.tags?.slice(0, 2).map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg)', borderRadius: 4, color: 'var(--text-muted)' }}>{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.updatedAt}</td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => openEdit(r)}>编辑</button>
                          <button className="d-btn d-btn-ghost d-btn-sm" onClick={() => handleDelete(r)} style={{ color: 'var(--danger)' }}>删除</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                        暂无匹配的资源
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <ResourceModal
          resource={editingResource}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* 资源详情预览 */}
      {previewId && (
        <DetailPreview
          resource={allResources.find(r => r.id === previewId)!}
          onClose={() => setPreviewId(null)}
          onEdit={() => { setPreviewId(null); openEdit(allResources.find(r => r.id === previewId)!); }}
        />
      )}
    </div>
  );
}

function DetailPreview({ resource, onClose, onEdit }: {
  resource: Resource;
  onClose: () => void;
  onEdit: () => void;
}) {
  const meta = TYPE_META[resource.type];
  const hasLink = resource.url && resource.url !== '#';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="d-panel"
        style={{ width: 520, maxHeight: '85vh', overflowY: 'auto', margin: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-panel-header">
          <h3>📋 资源详情</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="d-panel-body" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, background: meta.bg,
            }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{resource.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{meta.label} · {resource.category}</div>
            </div>
          </div>

          {resource.description && (
            <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg)', borderRadius: 10, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {resource.description}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>类型</div>
              <div style={{ fontWeight: 600 }}>{meta.label}</div>
            </div>
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>分类</div>
              <div style={{ fontWeight: 600 }}>{resource.category}</div>
            </div>
            {resource.fileSize && (
              <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>文件大小</div>
                <div style={{ fontWeight: 600 }}>{resource.fileSize}</div>
              </div>
            )}
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>更新时间</div>
              <div style={{ fontWeight: 600 }}>{resource.updatedAt}</div>
            </div>
          </div>

          {resource.tags && resource.tags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {resource.tags.map(tag => (
                  <span key={tag} className="tag tag-primary" style={{ fontSize: 11, padding: '3px 8px' }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {hasLink && (
            <div style={{ padding: 12, background: 'var(--primary-lighter)', borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>链接地址</div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}
              >
                {resource.url} ↗
              </a>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="d-btn d-btn-outline" onClick={onClose}>关闭</button>
          {hasLink && (
            <button className="d-btn d-btn-primary" onClick={() => window.open(resource.url, '_blank')}>
              打开链接 ↗
            </button>
          )}
          <button className="d-btn d-btn-outline" onClick={onEdit}>编辑</button>
        </div>
      </div>
    </div>
  );
}

function ResourceModal({ resource, onSave, onClose }: {
  resource: Resource | null | undefined;
  onSave: (data: Partial<Resource>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(resource?.title || '');
  const [type, setType] = useState<ResourceType>(resource?.type || 'link');
  const [category, setCategory] = useState(resource?.category || '答案库');
  const [url, setUrl] = useState(resource?.url || '');
  const [description, setDescription] = useState(resource?.description || '');
  const [tagInput, setTagInput] = useState(resource?.tags?.join(', ') || '');

  const handleSave = () => {
    const tags = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    onSave({ title, type, category, url, description, tags });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="d-panel"
        style={{ width: 480, maxHeight: '85vh', overflowY: 'auto', margin: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-panel-header">
          <h3>{resource ? '编辑资源' : '新增资源'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="d-panel-body">
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              资源名称 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="d-search"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入资源名称"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              资源类型
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setType(key as ResourceType)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: type === key ? `2px solid var(--primary)` : '1px solid var(--border)',
                    background: type === key ? 'var(--primary-lighter)' : 'var(--bg-white)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: type === key ? 600 : 400,
                    color: type === key ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              分类
            </label>
            <select
              className="d-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%' }}
            >
              {CATEGORIES.filter(c => c !== '全部').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              链接地址 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="d-search"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https:// 或 文件路径"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述资源内容（可选）"
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              标签
            </label>
            <input
              type="text"
              className="d-search"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="多个标签用逗号分隔，如：剑桥, 答案"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="d-btn d-btn-outline" onClick={onClose}>取消</button>
          <button className="d-btn d-btn-primary" onClick={handleSave}>
            {resource ? '保存修改' : '添加资源'}
          </button>
        </div>
      </div>
    </div>
  );
}
