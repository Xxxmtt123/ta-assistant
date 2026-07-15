import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface Tab {
  icon: ReactNode;
  label: string;
  path: string;
}

const tabs: Tab[] = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    label: '班级',
    path: '/mobile/classes',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    label: '首页',
    path: '/mobile',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    label: '拍照',
    path: '/mobile/camera',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    label: '成绩',
    path: '/mobile/scores',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    label: '反馈',
    path: '/mobile/feedback',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
    label: '推送',
    path: '/mobile/push',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    label: '资料',
    path: '/mobile/library',
  },
];

interface Props {
  children: ReactNode;
}

export default function MobileLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { classes, currentClass, setCurrentClass } = useAppStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.findIndex(
    (tab) => tab.path === location.pathname || location.pathname.startsWith(tab.path + '/')
  );

  // 智能匹配当前班级
  useEffect(() => {
    if (classes.length > 0 && !currentClass) {
      autoSelectClass();
    }
  }, [classes]);

  function autoSelectClass() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // 尝试匹配今天上课的班级
    const todayClass = classes.find(c => {
      if (c.scheduleMode === 'weekly') {
        const config = typeof c.scheduleConfig === 'string' ? JSON.parse(c.scheduleConfig) : c.scheduleConfig;
        const days = config?.days || []; // [1,3,5] 表示周一三五
        if (days.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
          // 检查时间是否在上课时段内
          const [sh, sm] = (config?.startTime || '09:00').split(':').map(Number);
          const [eh, em] = (config?.endTime || '18:00').split(':').map(Number);
          const startTime = sh * 60 + sm;
          const endTime = eh * 60 + em;
          // 如果当前时间在上课前1小时内也算匹配
          return currentTime >= startTime - 60 && currentTime <= endTime;
        }
      }
      return false;
    });

    setCurrentClass(todayClass || classes[0] || null);
  }

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', maxWidth: '430px', margin: '0 auto', position: 'relative' }}>
      {/* 班级切换栏 */}
      {classes.length > 1 && (
        <div style={{
          height: 40, background: 'var(--bg-white)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0,
          position: 'relative', zIndex: 40,
        }} ref={dropdownRef}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '70%',
          }}>
            {currentClass?.name || '选择班级'}
          </span>
          <button onClick={() => setShowDropdown(!showDropdown)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, padding: '4px 8px',
            transform: showDropdown ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>
            ▾
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--bg-white)', borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: 200, overflowY: 'auto', zIndex: 100,
            }}>
              {classes.map(cls => (
                <button key={cls.id}
                  onClick={() => { setCurrentClass(cls); setShowDropdown(false); }}
                  style={{
                    width: '100%', padding: '10px 16px', border: 'none',
                    background: cls.id === currentClass?.id ? 'var(--primary-light)' : 'transparent',
                    color: cls.id === currentClass?.id ? 'var(--primary)' : 'var(--text-primary)',
                    textAlign: 'left', fontSize: 14, cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                  }}>
                  {cls.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '70px' }}>
        {children}
      </div>

      {/* 底部 Tab 导航 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        maxWidth: '430px', width: '100%',
        background: 'var(--bg-white)',
        borderTop: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'flex-start',
        paddingTop: '8px', zIndex: 50,
      }}>
        {tabs.map((tab, index) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', padding: '4px 0', cursor: 'pointer', border: 'none',
              background: 'transparent', transition: 'var(--transition)',
            }}
          >
            <span style={{
              width: '22px', height: '22px',
              color: index === activeTab ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'var(--transition)', display: 'flex',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: index === activeTab ? 600 : 500,
              color: index === activeTab ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
