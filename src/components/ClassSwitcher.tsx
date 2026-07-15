import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { ScheduleConfig } from '@/types';

const CLASS_COLORS = [
  { gradient: 'linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%)', light: '#ede9fe' }, // 紫色
  { gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', light: '#ecfeff' }, // 青色
  { gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', light: '#ecfdf5' }, // 绿色
  { gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', light: '#fffbeb' }, // 橙色
  { gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', light: '#fef2f2' }, // 红色
  { gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', light: '#f5f3ff' }, // 靛色
  { gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', light: '#fdf2f8' }, // 粉色
  { gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', light: '#eff6ff' }, // 蓝色
];

function parseScheduleConfig(raw: ScheduleConfig | string | undefined | null): ScheduleConfig {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function getClassColorIndex(classes: { id: string }[], classId: string): number {
  const idx = classes.findIndex(c => c.id === classId);
  return idx >= 0 ? idx % CLASS_COLORS.length : 0;
}

interface ClassSwitcherProps {
  mode: 'mobile' | 'desktop';
}

export default function ClassSwitcher({ mode }: ClassSwitcherProps) {
  const { classes, currentClass, setCurrentClass } = useAppStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 智能默认匹配
  useEffect(() => {
    if (classes.length > 0 && !currentClass) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const todayClass = classes.find(c => {
        if (c.scheduleMode === 'weekly') {
          const config = parseScheduleConfig(c.scheduleConfig);
          const days = config?.days || [];
          if (days.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
            const [sh, sm] = (config?.startTime || '09:00').split(':').map(Number);
            const [eh, em] = (config?.endTime || '18:00').split(':').map(Number);
            return currentTime >= (sh * 60 + sm) - 60 && currentTime <= (eh * 60 + em);
          }
        }
        return false;
      });

      setCurrentClass(todayClass || classes[0] || null);
    }
  }, [classes, currentClass, setCurrentClass]);

  // 点击外部关闭下拉
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // 只有一个班级时不显示
  if (classes.length <= 1) return null;

  const colorIndex = currentClass ? getClassColorIndex(classes, currentClass.id) : 0;
  const currentColor = CLASS_COLORS[colorIndex];

  const handleSelect = (cls: typeof classes[0]) => {
    setCurrentClass(cls);
    setShowDropdown(false);
  };

  if (mode === 'mobile') {
    return (
      <div ref={containerRef} style={{ position: 'relative', zIndex: 40, flexShrink: 0 }}>
        {/* 触发按钮 */}
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            height: 40,
            background: currentColor.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80%',
          }}>
            {currentClass?.name || '选择班级'}
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14,
            transform: showDropdown ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>
            ▾
          </span>
        </div>

        {/* 下拉菜单 */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 100,
          }}>
            {classes.map((cls, index) => {
              const ci = index % CLASS_COLORS.length;
              const isActive = cls.id === currentClass?.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleSelect(cls)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: isActive ? CLASS_COLORS[ci].light : 'transparent',
                    color: isActive ? '#374151' : '#1f2937',
                    textAlign: 'left',
                    fontSize: 14,
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: CLASS_COLORS[ci].gradient,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {cls.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Desktop 模式
  return (
    <div ref={containerRef} style={{ position: 'relative', zIndex: 40, flexShrink: 0, padding: '0 12px', marginBottom: 8 }}>
      {/* 触发卡片 */}
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 8,
          background: currentColor.gradient,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 14px',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        }}
      >
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {currentClass?.name || '选择班级'}
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.8)',
          marginTop: 2,
        }}>
          {currentClass
            ? `${currentClass.totalSessions || 0}次课 · ${currentClass.studentCount || 0}人`
            : '点击选择'}
          <span style={{
            marginLeft: 8,
            display: 'inline-block',
            transform: showDropdown ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▾</span>
        </div>
      </div>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 12,
          right: 12,
          marginTop: 4,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          maxHeight: 240,
          overflowY: 'auto',
          zIndex: 100,
          minWidth: 196,
        }}>
          {classes.map((cls, index) => {
            const ci = index % CLASS_COLORS.length;
            const isActive = cls.id === currentClass?.id;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelect(cls)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  background: isActive ? CLASS_COLORS[ci].light : 'transparent',
                  color: isActive ? '#374151' : '#1f2937',
                  textAlign: 'left',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.15s',
                  borderBottom: index < classes.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <span style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: CLASS_COLORS[ci].gradient,
                  flexShrink: 0,
                }} />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {cls.name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#9ca3af',
                    marginTop: 1,
                  }}>
                    {cls.totalSessions || 0}次课 · {cls.studentCount || 0}人
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}