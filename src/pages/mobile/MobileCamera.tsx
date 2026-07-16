import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { useAppStore } from '@/stores/useAppStore';
import { useStudents } from '@/hooks/useStudents';
import StudentSelector from '@/components/StudentSelector';
import { photoApi } from '@/services/api';
import type { Photo } from '@/types';

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

export default function MobileCamera() {
  const { students } = useStudents();
  const {
    photos,
    setPhotos,
    currentStudentIndex,
    setCurrentStudentIndex,
    currentSession,
    showToast,
  } = useAppStore();

  const [type, setType] = useState<'homework' | 'quiz'>('homework');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStudent = students[currentStudentIndex];
  const sessionId = currentSession?.id || 'session-current';

  // 今日已拍数量：按当天日期筛选
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPhotos = photos.filter((p) => p.createdAt.slice(0, 10) === todayStr);
  const todayCount = todayPhotos.length;

  const handleRefreshPhotos = async () => {
    const sessionId = currentSession?.id;
    if (!sessionId) return;
    try {
      const apiPhotos = await photoApi.getBySession(sessionId);
      setPhotos(apiPhotos || []);
      showToast('照片已刷新', 'success');
    } catch {
      showToast('刷新失败', 'error');
    }
  };

  const handlePrev = () => {
    if (currentStudentIndex > 0) setCurrentStudentIndex(currentStudentIndex - 1);
  };

  const handleNext = () => {
    if (currentStudentIndex < students.length - 1) setCurrentStudentIndex(currentStudentIndex + 1);
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentStudent) {
      showToast('请先选择学生', 'error');
      e.target.value = '';
      return;
    }

    const capturedStudentId = currentStudent.id;
    const capturedType = type;
    const objectUrl = URL.createObjectURL(file);

    // 读取图片尺寸
    let width = 0;
    let height = 0;
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          width = img.naturalWidth;
          height = img.naturalHeight;
          resolve();
        };
        img.onerror = reject;
        img.src = objectUrl;
      });
    } catch {
      // 尺寸读取失败，保持 0
    }

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const localPhoto: Photo = {
      id: photoId,
      studentId: capturedStudentId,
      sessionId,
      type: capturedType,
      thumbnailUrl: objectUrl,
      width,
      height,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // 先保存到 store，保证即时显示
    setPhotos([...useAppStore.getState().photos, localPhoto]);

    // 压缩并上传
    try {
      const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const result = await photoApi.upload(compressedFile, capturedStudentId, sessionId, capturedType, width, height);

      const updatedPhoto: Photo = {
        ...localPhoto,
        id: result.id,
        thumbnailUrl: result.thumbnailUrl || `/api/photos/view/${result.id}`,
        url: result.thumbnailUrl || `/api/photos/view/${result.id}`,
        synced: true,
      };
      setPhotos(useAppStore.getState().photos.map((p) => (p.id === photoId ? updatedPhoto : p)));
    } catch {
      showToast('照片上传失败，已保存到本地', 'error');
    }

    setShowSuccess(true);
    showToast('拍照成功！', 'success');

    // 自动跳转下一个学生
    setTimeout(() => {
      setShowSuccess(false);
      if (currentStudentIndex < students.length - 1) {
        setCurrentStudentIndex(currentStudentIndex + 1);
      }
    }, 1200);

    // 重置 input 以便重复拍摄同一文件
    e.target.value = '';
  };

  const typeLabel = (t: string) => (t === 'homework' ? '作业' : '小测');
  const photoStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || '未知';

  return (
    <>
      {/* 当前学生信息卡片 + 上一个/下一个 */}
      <div className="m-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StudentAvatar student={currentStudent} size={40} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{currentStudent?.name || '无学生'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {currentStudent ? `${currentStudentIndex + 1} / ${students.length}` : '-'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="m-btn m-btn-sm m-btn-outline" onClick={handlePrev} disabled={currentStudentIndex <= 0}>
              ◀ 上一个
            </button>
            <button className="m-btn m-btn-sm m-btn-outline" onClick={handleNext} disabled={currentStudentIndex >= students.length - 1}>
              下一个 ▶
            </button>
          </div>
        </div>
      </div>

      {/* 学生横向选择器 */}
      {students.length > 0 && <StudentSelector students={students} />}

      {/* 类型选择 */}
      <div className="type-selector">
        <div
          className={`type-chip ${type === 'homework' ? 'active' : ''}`}
          onClick={() => setType('homework')}
        >
          📄 作业
        </div>
        <div
          className={`type-chip ${type === 'quiz' ? 'active' : ''}`}
          onClick={() => setType('quiz')}
        >
          📋 小测
        </div>
      </div>

      {/* 拍照区域 */}
      <div
        className="camera-area"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="camera-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div className="camera-label">点击拍照按钮拍摄批改内容</div>
        <div className={`camera-success ${showSuccess ? 'show' : ''}`}>
          <div className="check-icon">✓</div>
          <div className="success-text">拍照成功！自动跳转下一位...</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          style={{ display: 'none' }}
        />
      </div>

      {/* 已拍照片计数 + 查看照片 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          今日已拍：<strong style={{ color: 'var(--primary)' }}>{todayCount}</strong> 张
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="m-btn m-btn-sm m-btn-outline"
            onClick={handleRefreshPhotos}
          >
            🔄 刷新
          </button>
          <button
            className="m-btn m-btn-sm m-btn-outline"
            onClick={() => setShowPhotos(true)}
            disabled={todayCount === 0}
          >
            查看照片
          </button>
        </div>
      </div>

      {/* 照片缩略图列表弹层 */}
      {showPhotos && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowPhotos(false)}
        >
          <div
            style={{
              background: 'var(--bg-white)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              width: '100%',
              maxWidth: '430px',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>今日照片（{todayCount} 张）</h3>
              <button
                onClick={() => setShowPhotos(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'var(--bg)', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {todayPhotos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--bg-dark)',
                    aspectRatio: '1',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm('确定删除这张照片？')) return;
                      photoApi.delete(photo.id).then(() => {
                        setPhotos(useAppStore.getState().photos.filter(p => p.id !== photo.id));
                        showToast('已删除', 'success');
                      }).catch(() => showToast('删除失败', 'error'));
                    }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none',
                      color: 'white', fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    ×
                  </button>
                  {photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt={photoStudentName(photo.studentId)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: 0.6, fontSize: 24 }}>
                      {typeLabel(photo.type) === '作业' ? '📄' : '📋'}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      color: 'white', padding: '16px 6px 6px', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {photoStudentName(photo.studentId)} · {typeLabel(photo.type)}
                  </div>
                </div>
              ))}
            </div>
            {todayCount === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>
                今日暂无照片
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
