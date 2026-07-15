import { useState, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { useAppStore } from '@/stores/useAppStore';
import { photoApi } from '@/services/api';
import type { Photo } from '@/types';

export default function DesktopPhotos() {
  const { photos, setPhotos, students, currentClass, currentSession, showToast } = useAppStore();
  const [filterType, setFilterType] = useState<'all' | 'homework' | 'quiz'>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 组件挂载时从 API 获取照片列表
  useEffect(() => {
    const sessionId = currentSession?.id || 'current';
    photoApi
      .getBySession(sessionId)
      .then((apiPhotos) => {
        const currentPhotos = useAppStore.getState().photos;
        const existingIds = new Set(currentPhotos.map((p) => p.id));
        const newPhotos = apiPhotos.filter((p) => !existingIds.has(p.id));
        if (newPhotos.length > 0) {
          setPhotos([...currentPhotos, ...newPhotos]);
        }
      })
      .catch(() => {
        showToast('获取照片列表失败', 'error');
      });
  }, [currentSession?.id, setPhotos, showToast]);

  // 学生姓名从 store.students 匹配获取
  const getStudentName = (studentId: string) => {
    return students.find((s) => s.id === studentId)?.name || '未知学生';
  };

  // 构造照片显示文件名
  const getFileName = (photo: Photo) => {
    const typeName = photo.type === 'homework' ? '作业' : '小测';
    const studentName = getStudentName(photo.studentId);
    return `${typeName}_${studentName}_${photo.createdAt}`;
  };

  // 筛选器从真实数据生成
  const filtered = photos.filter((p) => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterStudent !== 'all' && p.studentId !== filterStudent) return false;
    return true;
  });

  // 学生筛选列表：仅显示有照片的学生
  const uniqueStudents = students.filter((s) => photos.some((p) => p.studentId === s.id));

  const typeIcon = (type: string) => (type === 'homework' ? '📝' : '📋');

  // 推送到网站：将照片信息复制到剪贴板（记录文件名和学生信息）
  const handlePushToWebsite = async (photo: Photo) => {
    const studentName = getStudentName(photo.studentId);
    const typeName = photo.type === 'homework' ? '作业' : '小测';
    const info = [
      `文件名: ${getFileName(photo)}`,
      `学生: ${studentName}`,
      `类型: ${typeName}`,
      `尺寸: ${photo.width}x${photo.height}`,
      `上传时间: ${photo.createdAt}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(info);
      showToast(`已复制 ${studentName} 的${typeName}照片信息到剪贴板`, 'success');
    } catch {
      showToast('复制失败，请检查剪贴板权限', 'error');
    }
  };

  // 处理上传文件
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (filterStudent === 'all') {
      showToast('请先在上方的学生筛选器中选择一位学生', 'info');
      return;
    }
    const studentId = filterStudent;
    const sessionId = currentSession?.id || 'current';
    const uploadType = filterType === 'all' ? 'homework' : filterType;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const result = await photoApi.upload(compressedFile, studentId, sessionId, uploadType);
        const newPhoto: Photo = {
          id: result.id,
          studentId,
          sessionId,
          type: uploadType,
          thumbnailUrl: result.thumbnailUrl || `/api/photos/view/${result.id}`,
          url: result.thumbnailUrl || `/api/photos/view/${result.id}`,
          width: 0,
          height: 0,
          createdAt: new Date().toISOString(),
          synced: true,
        };
        setPhotos([...useAppStore.getState().photos, newPhoto]);
      } catch {
        showToast(`${file.name} 上传失败`, 'error');
      }
    }
  };

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleUploadFiles(e.dataTransfer.files);
  };

  // 打包下载全部照片
  const handlePackDownload = async () => {
    if (isPacking) return;
    setIsPacking(true);
    try {
      const photoData = await photoApi.getDataForDownload(currentSession?.id || 'current');
      if (!photoData || photoData.length === 0) {
        showToast('没有可下载的照片', 'info');
        return;
      }

      const zip = new JSZip();
      const currentClassName = currentClass?.name || '未命名班级';
      const folderName = `${currentSession?.date || new Date().toISOString().slice(0, 10)}_${currentClassName}`;
      const folder = zip.folder(folderName)!;

      for (const photo of photoData) {
        const studentFolder = folder.folder(photo.studentName || '未知学生')!;
        const ext = photo.mimeType === 'image/png' ? 'png' : 'jpg';
        const fileName = `${photo.type === 'homework' ? '作业批改' : '小测批改'}_${photo.id.slice(0, 6)}.${ext}`;
        // 从 URL 下载图片二进制数据
        const imgRes = await fetch(photo.url);
        const imgBlob = await imgRes.blob();
        studentFolder.file(fileName, imgBlob);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('打包下载完成', 'success');
    } catch {
      showToast('打包下载失败，请重试', 'error');
    } finally {
      setIsPacking(false);
    }
  };

  // store 中无数据时显示空状态提示
  if (photos.length === 0) {
    return (
      <div>
        {/* 面包屑 */}
        <div className="page-breadcrumb">首页 / <span>照片管理</span></div>

        {/* 页面标题 */}
        <div className="page-title-bar">
          <h2>照片管理</h2>
          <div className="actions">
            <span className="tag tag-primary">0 张照片</span>
          </div>
        </div>

        <div className="d-panel">
          <div className="d-panel-body" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>暂无照片，请使用手机端拍照上传</p>
            {currentClass && (
              <p style={{ fontSize: '12px' }}>当前班级：{currentClass.name}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 面包屑 */}
      <div className="page-breadcrumb">首页 / <span>照片管理</span></div>

      {/* 页面标题 */}
      <div className="page-title-bar">
        <h2>照片管理</h2>
        <div className="actions">
          <span className="tag tag-primary">{filtered.length} 张照片</span>
          <button
            onClick={() => showToast('导出功能将在后续完善', 'info')}
            className="d-btn d-btn-ghost"
          >
            批量导出
          </button>
          <button
            onClick={() => showToast('批量推送功能将在 Phase 2 完善', 'info')}
            className="d-btn d-btn-primary"
          >
            批量推送到网站
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="d-toolbar">
        <select className="d-select" value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
          <option value="all">全部类型</option>
          <option value="homework">作业</option>
          <option value="quiz">小测</option>
        </select>
        <select className="d-select" value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
          <option value="all">全部学生</option>
          {uniqueStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button className="d-btn d-btn-primary" onClick={() => fileInputRef.current?.click()}>
          上传照片
        </button>
        <button
          className="d-btn d-btn-ghost"
          onClick={handlePackDownload}
          disabled={isPacking}
        >
          {isPacking ? '正在打包...' : '📦 打包下载全部'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUploadFiles(e.target.files)}
        />
      </div>

      {/* 拖拽上传区 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginBottom: '16px',
          background: isDragging ? 'var(--primary-lighter)' : 'var(--bg)',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {isDragging ? '释放以上传照片' : '拖拽照片到此处上传，或点击选择文件'}
      </div>

      {/* 照片网格 4列 */}
      <div className="photo-grid">
        {filtered.map((photo) => (
          <div
            key={photo.id}
            className="photo-item"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="photo-placeholder">
              {photo.thumbnailUrl || photo.url ? (
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={getFileName(photo)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '24px' }}>{typeIcon(photo.type)}</span>
                  <span>{getFileName(photo)}</span>
                </>
              )}
            </div>
            <div className="photo-label">
              {getStudentName(photo.studentId)} · {photo.createdAt}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="d-panel">
          <div className="d-panel-body" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
            <p style={{ fontSize: '14px' }}>暂无匹配的照片</p>
          </div>
        </div>
      )}

      {/* 照片详情弹窗 */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)',
              width: '600px', maxHeight: '80vh', overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 预览区 */}
            <div className="camera-area" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', margin: 0, height: '300px' }}>
              {selectedPhoto.url || selectedPhoto.thumbnailUrl ? (
                <img
                  src={selectedPhoto.url || selectedPhoto.thumbnailUrl}
                  alt={getFileName(selectedPhoto)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '48px' }}>{typeIcon(selectedPhoto.type)}</span>
                  <span className="camera-label">{getFileName(selectedPhoto)}</span>
                </>
              )}
            </div>
            {/* 信息区 */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '16px',
                  }}
                >
                  {getStudentName(selectedPhoto.studentId).charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{getStudentName(selectedPhoto.studentId)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedPhoto.createdAt} · {selectedPhoto.width}x{selectedPhoto.height}
                  </div>
                </div>
                <span className={`tag ${selectedPhoto.type === 'homework' ? 'tag-primary' : 'tag-warning'}`} style={{ marginLeft: 'auto' }}>
                  {selectedPhoto.type === 'homework' ? '作业' : '小测'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', wordBreak: 'break-all' }}>
                ID: {selectedPhoto.id}
                {selectedPhoto.synced === false && (
                  <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>(本地未同步)</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getFileName(selectedPhoto)).then(
                      () => showToast('文件名已复制到剪贴板', 'success'),
                      () => showToast('复制失败，请检查剪贴板权限', 'error')
                    );
                  }}
                  className="d-btn d-btn-ghost"
                  style={{ flex: 1 }}
                >
                  复制文件名
                </button>
                <button
                  onClick={() => {
                    handlePushToWebsite(selectedPhoto);
                    setSelectedPhoto(null);
                  }}
                  className="d-btn d-btn-primary"
                  style={{ flex: 1 }}
                >
                  推送到网站
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
