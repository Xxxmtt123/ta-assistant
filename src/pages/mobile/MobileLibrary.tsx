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

export default function MobileLibrary() {
  const { resources, setResources, showToast } = useAppStore();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const allResources = resources.length > 0 ? resources : DEMO_RESOURCES;

  const filtered = allResources.filter(r => {
    if (activeCategory !== '全部' && r.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q) && !r.tags?.some(t => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const openAdd = () => { setEditId(null); setShowModal(true); };
  const openEdit = (r: Resource) => { setEditId(r.id); setShowModal(true); };

  const handleDelete = (r: Resource) => {
    if (!window.confirm(`确定要删除「${r.title}」吗？`)) return;
    setResources(allResources.filter(x => x.id !== r.id));
    showToast(`已删除 ${r.title}`, 'success');
  };

  const handleSave = (data: Partial<Resource>) => {
    if (!data.title?.trim()) { showToast('请输入资源名称', 'error'); return; }
    if (!data.url?.trim()) { showToast('请输入链接地址', 'error'); return; }

    if (editId) {
      setResources(allResources.map(r =>
        r.id === editId ? { ...r, ...data, updatedAt: new Date().toISOString().slice(0, 10) } : r
      ));
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

  const editingResource = editId ? allResources.find(r => r.id === editId) : null;

  return (
    <div style={{ padding: '12px 12px 80px 12px' }}>
      {/* 头部 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        borderRadius: 16, padding: '16px 16px 20px', color: 'white', marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>资料库</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>快捷查找资料</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 10,
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="搜索资源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'white', fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={openAdd}
            style={{
              width: 36, height: 36, borderRadius: 10, background: 'white',
              color: 'var(--primary)', border: 'none', fontSize: 18, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* 分类横向滚动 */}
      <div className="student-scroll" style={{ marginBottom: 12 }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500,
              background: activeCategory === cat ? 'var(--primary)' : 'var(--bg-white)',
              color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: activeCategory === cat ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* 资源列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(r => {
          const meta = TYPE_META[r.type];
          return (
            <div
              key={r.id}
              className="m-card"
              style={{ margin: 0, cursor: 'pointer' }}
              onClick={() => handleOpen(r)}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, background: meta.bg,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{r.title}</div>
                  {r.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="m-tag m-tag-primary" style={{ fontSize: 10 }}>{meta.label}</span>
                    <span className="m-tag" style={{ fontSize: 10, background: 'var(--bg)', color: 'var(--text-muted)' }}>{r.category}</span>
                    {r.tags?.slice(0, 1).map(tag => (
                      <span key={tag} className="m-tag" style={{ fontSize: 10, background: 'var(--bg)', color: 'var(--text-muted)' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'var(--primary-lighter)', color: 'var(--primary)',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
            <p>暂无匹配的资源</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>点击右上角 + 添加</p>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div
          className="stu-edit-overlay active"
          onClick={() => setShowModal(false)}
        >
          <div className="stu-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="stu-edit-header">
              <h3>{editingResource ? '编辑资源' : '新增资源'}</h3>
              <button className="stu-edit-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="stu-field">
              <label>资源名称 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="lib-name-input"
                type="text"
                defaultValue={editingResource?.title || ''}
                placeholder="请输入资源名称"
              />
            </div>

            <div className="stu-field">
              <label>资源类型</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <button
                    key={key}
                    className={`type-chip ${editingResource?.type === key ? 'active' : ''}`}
                    style={{
                      padding: '8px 4px', flexDirection: 'column', gap: 2,
                      border: editingResource?.type === key ? '2px solid var(--primary)' : '1px solid var(--border)',
                    }}
                    onClick={() => {
                      const el = document.getElementById('lib-type-hidden') as HTMLInputElement;
                      if (el) el.value = key;
                      document.querySelectorAll('.type-chip').forEach((chip) => {
                        chip.classList.remove('active');
                      });
                      (event?.target as HTMLElement)?.closest('.type-chip')?.classList.add('active');
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{ fontSize: 10 }}>{meta.label}</span>
                  </button>
                ))}
                <input id="lib-type-hidden" type="hidden" defaultValue={editingResource?.type || 'link'} />
              </div>
            </div>

            <div className="stu-field">
              <label>分类</label>
              <select
                id="lib-category-input"
                defaultValue={editingResource?.category || '答案库'}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', fontSize: 13, outline: 'none',
                  background: 'var(--bg-white)',
                }}
              >
                {CATEGORIES.filter(c => c !== '全部').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="stu-field">
              <label>链接地址 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="lib-url-input"
                type="text"
                defaultValue={editingResource?.url || ''}
                placeholder="https:// 或 文件路径"
              />
            </div>

            <div className="stu-field">
              <label>描述</label>
              <textarea
                id="lib-desc-input"
                defaultValue={editingResource?.description || ''}
                placeholder="简要描述资源内容（可选）"
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', fontSize: 13, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>

            <div className="stu-field">
              <label>标签</label>
              <input
                id="lib-tags-input"
                type="text"
                defaultValue={editingResource?.tags?.join(', ') || ''}
                placeholder="多个标签用逗号分隔"
              />
            </div>

            <div className="stu-edit-actions">
              <button className="m-btn m-btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="m-btn m-btn-primary" onClick={() => {
                const nameEl = document.getElementById('lib-name-input') as HTMLInputElement;
                const typeEl = document.getElementById('lib-type-hidden') as HTMLInputElement;
                const catEl = document.getElementById('lib-category-input') as HTMLSelectElement;
                const urlEl = document.getElementById('lib-url-input') as HTMLInputElement;
                const descEl = document.getElementById('lib-desc-input') as HTMLTextAreaElement;
                const tagsEl = document.getElementById('lib-tags-input') as HTMLInputElement;

                const title = nameEl?.value.trim();
                if (!title) { showToast('请输入资源名称', 'error'); return; }
                const url = urlEl?.value.trim();
                if (!url) { showToast('请输入链接地址', 'error'); return; }

                const tags = tagsEl?.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) || [];

                handleSave({
                  title,
                  type: (typeEl?.value as ResourceType) || 'link',
                  category: catEl?.value || '其他',
                  url,
                  description: descEl?.value || '',
                  tags,
                });
              }}>
                {editingResource ? '保存修改' : '添加资源'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 资源详情预览 */}
      {previewId && (
        <MobileDetailPreview
          resource={allResources.find(r => r.id === previewId)!}
          onClose={() => setPreviewId(null)}
          onEdit={() => { setPreviewId(null); openEdit(allResources.find(r => r.id === previewId)!); }}
        />
      )}
    </div>
  );
}

function MobileDetailPreview({ resource, onClose, onEdit }: {
  resource: Resource;
  onClose: () => void;
  onEdit: () => void;
}) {
  const meta = TYPE_META[resource.type];
  const hasLink = resource.url && resource.url !== '#';

  return (
    <div
      className="stu-edit-overlay active"
      onClick={onClose}
    >
      <div className="stu-edit-panel" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="stu-edit-header">
          <h3>📋 资源详情</h3>
          <button className="stu-edit-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, background: meta.bg,
            }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{resource.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{meta.label} · {resource.category}</div>
            </div>
          </div>

          {resource.description && (
            <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg)', borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {resource.description}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: 8, background: 'var(--bg)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>类型</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{meta.label}</div>
            </div>
            <div style={{ padding: 8, background: 'var(--bg)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>分类</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{resource.category}</div>
            </div>
            {resource.fileSize && (
              <div style={{ padding: 8, background: 'var(--bg)', borderRadius: 8, fontSize: 11 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>文件大小</div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{resource.fileSize}</div>
              </div>
            )}
            <div style={{ padding: 8, background: 'var(--bg)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>更新时间</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{resource.updatedAt}</div>
            </div>
          </div>

          {resource.tags && resource.tags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {resource.tags.map(tag => (
                  <span key={tag} className="m-tag m-tag-primary" style={{ fontSize: 10 }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {hasLink && (
            <div style={{ padding: 10, background: 'var(--primary-lighter)', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>链接地址</div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}
              >
                {resource.url} ↗
              </a>
            </div>
          )}
        </div>

        <div className="stu-edit-actions">
          <button className="m-btn m-btn-outline" onClick={onClose}>关闭</button>
          {hasLink && (
            <button className="m-btn m-btn-primary" onClick={() => window.open(resource.url, '_blank')}>
              打开链接 ↗
            </button>
          )}
          <button className="m-btn m-btn-outline" onClick={onEdit}>编辑</button>
        </div>
      </div>
    </div>
  );
}
