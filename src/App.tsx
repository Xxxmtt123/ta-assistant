import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { classApi, studentApi } from '@/services/api';
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

const API_BASE = import.meta.env.PROD ? '' : 'https://ta-assistant-api.2144961248.workers.dev';

export default function App() {
  const { user, setUser, isMobile, setClasses, setStudents } = useAppStore();

  // 检查已登录状态 + 加载数据
  useEffect(() => {
    const token = localStorage.getItem('ta_token');
    if (token && !user) {
      try {
        // 从后端获取完整用户信息
        fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => {
            if (!r.ok) throw new Error('Token expired');
            return r.json();
          })
          .then(u => {
            if (u.id) setUser(u);
            else throw new Error('Invalid user');
          })
          .catch(() => {
            localStorage.removeItem('ta_token');
          });
      } catch {
        localStorage.removeItem('ta_token');
      }
    }
  }, [user, setUser]);

  // 登录后自动加载班级数据
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  async function loadInitialData() {
    try {
      const classList = await classApi.list();
      setClasses(classList || []);
      // 如果有班级，加载第一个班级的学生
      if (classList && classList.length > 0) {
        try {
          const studentList = await studentApi.getByClass(classList[0].id);
          setStudents(studentList);
        } catch (e) {
          console.error('Failed to load students:', e);
        }
      }
    } catch (e) {
      console.error('Failed to load classes:', e);
    }
  }

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
