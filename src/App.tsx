import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import Toast from '@/components/Toast';
import LoginPage from '@/components/LoginPage';
import MobileLayout from '@/components/MobileLayout';
import DesktopLayout from '@/components/DesktopLayout';
import MobileHome from '@/pages/mobile/MobileHome';
import MobileCamera from '@/pages/mobile/MobileCamera';
import MobileScores from '@/pages/mobile/MobileScores';
import MobileFeedback from '@/pages/mobile/MobileFeedback';
import MobilePush from '@/pages/mobile/MobilePush';
import MobileClasses from '@/pages/mobile/MobileClasses';
import MobileLibrary from '@/pages/mobile/MobileLibrary';
import MobileAttendance from '@/pages/mobile/MobileAttendance';
import DesktopDashboard from '@/pages/desktop/DesktopDashboard';
import DesktopClasses from '@/pages/desktop/DesktopClasses';
import DesktopStudents from '@/pages/desktop/DesktopStudents';
import DesktopScores from '@/pages/desktop/DesktopScores';
import DesktopFeedback from '@/pages/desktop/DesktopFeedback';
import DesktopPhotos from '@/pages/desktop/DesktopPhotos';
import DesktopPush from '@/pages/desktop/DesktopPush';
import DesktopLibrary from '@/pages/desktop/DesktopLibrary';
import DesktopSettings from '@/pages/desktop/DesktopSettings';
import DesktopAttendance from '@/pages/desktop/DesktopAttendance';

export default function App() {
  const { user, setUser, isMobile } = useAppStore();

  // 检查已登录状态
  useEffect(() => {
    const token = localStorage.getItem('ta_token');
    if (token && !user) {
      // 解析 JWT 获取用户信息（简化版，直接从 localStorage 读取）
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.userId, email: payload.email, name: payload.name });
      } catch {
        localStorage.removeItem('ta_token');
      }
    }
  }, [user, setUser]);

  // 未登录 → 登录页
  if (!user) {
    return (
      <>
        <Toast />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <Toast />
      <Routes>
        {/* 手机端路由 */}
        <Route path="/mobile" element={<MobileLayout><MobileHome /></MobileLayout>} />
        <Route path="/mobile/classes" element={<MobileLayout><MobileClasses /></MobileLayout>} />
        <Route path="/mobile/camera" element={<MobileLayout><MobileCamera /></MobileLayout>} />
        <Route path="/mobile/scores" element={<MobileLayout><MobileScores /></MobileLayout>} />
        <Route path="/mobile/feedback" element={<MobileLayout><MobileFeedback /></MobileLayout>} />
        <Route path="/mobile/push" element={<MobileLayout><MobilePush /></MobileLayout>} />
        <Route path="/mobile/library" element={<MobileLayout><MobileLibrary /></MobileLayout>} />
        <Route path="/mobile/attendance" element={<MobileLayout><MobileAttendance /></MobileLayout>} />

        {/* 电脑端路由 */}
        <Route path="/desktop" element={<DesktopLayout><DesktopDashboard /></DesktopLayout>} />
        <Route path="/desktop/classes" element={<DesktopLayout><DesktopClasses /></DesktopLayout>} />
        <Route path="/desktop/students" element={<DesktopLayout><DesktopStudents /></DesktopLayout>} />
        <Route path="/desktop/scores" element={<DesktopLayout><DesktopScores /></DesktopLayout>} />
        <Route path="/desktop/feedback" element={<DesktopLayout><DesktopFeedback /></DesktopLayout>} />
        <Route path="/desktop/photos" element={<DesktopLayout><DesktopPhotos /></DesktopLayout>} />
        <Route path="/desktop/push" element={<DesktopLayout><DesktopPush /></DesktopLayout>} />
        <Route path="/desktop/library" element={<DesktopLayout><DesktopLibrary /></DesktopLayout>} />
        <Route path="/desktop/attendance" element={<DesktopLayout><DesktopAttendance /></DesktopLayout>} />
        <Route path="/desktop/settings" element={<DesktopLayout><DesktopSettings /></DesktopLayout>} />

        {/* 默认跳转 */}
        <Route path="/" element={<Navigate to={isMobile ? '/mobile' : '/desktop'} replace />} />
        <Route path="*" element={<Navigate to={isMobile ? '/mobile' : '/desktop'} replace />} />
      </Routes>
    </>
  );
}
