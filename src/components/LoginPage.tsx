import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

type Step = 'welcome' | 'login';

/* 像素老师组件 - 纯CSS绘制 */
function PixelTeacher() {
  return (
    <div style={{
      width: 96,
      height: 96,
      position: 'relative',
      imageRendering: 'pixelated',
    }}>
      {/* 帽子 */}
      <div style={{ position:'absolute', left:32, top:8, width:32, height:8, background:'#2D5016' }} />
      <div style={{ position:'absolute', left:28, top:16, width:40, height:4, background:'#2D5016' }} />
      {/* 脸 */}
      <div style={{ position:'absolute', left:32, top:20, width:32, height:24, background:'#F5D0A9' }} />
      {/* 眼睛 */}
      <div style={{ position:'absolute', left:38, top:28, width:4, height:4, background:'#1a1a2e' }} />
      <div style={{ position:'absolute', left:54, top:28, width:4, height:4, background:'#1a1a2e' }} />
      {/* 嘴巴（微笑） */}
      <div style={{ position:'absolute', left:42, top:36, width:12, height:4, background:'#C0392B' }} />
      {/* 身体 */}
      <div style={{ position:'absolute', left:28, top:44, width:40, height:32, background:'#3498DB' }} />
      {/* 领带 */}
      <div style={{ position:'absolute', left:44, top:48, width:8, height:16, background:'#E74C3C' }} />
      {/* 手臂 */}
      <div style={{ position:'absolute', left:16, top:48, width:12, height:24, background:'#F5D0A9' }} />
      <div style={{ position:'absolute', left:68, top:48, width:12, height:24, background:'#F5D0A9' }} />
      {/* 书 */}
      <div style={{ position:'absolute', left:8, top:64, width:20, height:16, background:'#8E44AD' }} />
      <div style={{ position:'absolute', left:10, top:66, width:16, height:2, background:'#fff' }} />
      <div style={{ position:'absolute', left:10, top:70, width:12, height:2, background:'#fff' }} />
      <div style={{ position:'absolute', left:10, top:74, width:14, height:2, background:'#fff' }} />
      {/* 腿 */}
      <div style={{ position:'absolute', left:32, top:76, width:12, height:16, background:'#2C3E50' }} />
      <div style={{ position:'absolute', left:52, top:76, width:12, height:16, background:'#2C3E50' }} />
      {/* 鞋子 */}
      <div style={{ position:'absolute', left:30, top:90, width:16, height:6, background:'#7F8C8D' }} />
      <div style={{ position:'absolute', left:50, top:90, width:16, height:6, background:'#7F8C8D' }} />
    </div>
  );
}

/* 像素锁/欢迎组件 */
function PixelLock() {
  return (
    <div style={{ width: 80, height: 80, position: 'relative' }}>
      {/* 锁体 */}
      <div style={{ position:'absolute', left:16, top:32, width:48, height:40, background:'#F39C12', border:'4px solid #D68910' }} />
      {/* 锁扣 */}
      <div style={{ position:'absolute', left:24, top:8, width:32, height:28, border:'4px solid #D68910', borderRadius:'16px 16px 0 0', background:'transparent' }} />
      {/* 钥匙孔 */}
      <div style={{ position:'absolute', left:36, top:44, width:8, height:8, background:'#2C3E50', borderRadius:'50%' }} />
      <div style={{ position:'absolute', left:38, top:50, width:4, height:10, background:'#2C3E50' }} />
      {/* 星星装饰 */}
      <div style={{ position:'absolute', left:4, top:4, width:6, height:6, background:'#FFD700' }} />
      <div style={{ position:'absolute', left:70, top:12, width:4, height:4, background:'#FFD700' }} />
    </div>
  );
}

/* 像素爱心 */
function PixelHeart() {
  return (
    <div style={{ width: 48, height: 40, position: 'relative' }}>
      <div style={{ position:'absolute', left:8, top:0, width:12, height:12, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:28, top:0, width:12, height:12, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:4, top:8, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:20, top:8, width:8, height:16, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:36, top:8, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:0, top:16, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:12, top:16, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:28, top:16, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:40, top:16, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:8, top:24, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:20, top:24, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:32, top:24, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:16, top:32, width:8, height:8, background:'#E74C3C' }} />
      <div style={{ position:'absolute', left:24, top:32, width:8, height:8, background:'#E74C3C' }} />
    </div>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const navigate = useNavigate();
  const { setUser, showToast } = useAppStore();

  useEffect(() => {
    if (step === 'login') {
      const t = setTimeout(() => setSlideIn(true), 50);
      return () => clearTimeout(t);
    } else {
      setSlideIn(false);
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isRegister) {
        if (!name) { showToast('请输入姓名', 'error'); setLoading(false); return; }
        const data = await authApi.register(email, password, name);
        localStorage.setItem('ta_token', data.token);
        setUser(data.user);
        showToast('注册成功', 'success');
        navigate('/mobile');
      } else {
        const data = await authApi.login(email, password);
        localStorage.setItem('ta_token', data.token);
        setUser(data.user);
        showToast('登录成功', 'success');
        navigate('/mobile');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Courier New', 'Monaco', monospace",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 像素星星背景 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 2,
            height: 2 + Math.random() * 2,
            background: Math.random() > 0.5 ? '#fff' : '#FFD700',
            opacity: 0.3 + Math.random() * 0.5,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
          }} />
        ))}
      </div>

      {/* ───── 欢迎页 ───── */}
      {step === 'welcome' && (
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: '0 24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* 版本标签 */}
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: '#e94560',
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
            marginBottom: 24,
            border: '2px solid #fff',
            boxShadow: '4px 4px 0 #0f3460',
          }}>
            v1.0 正式版
          </div>

          {/* 像素老师 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 24,
            animation: 'bounce 2s ease-in-out infinite',
          }}>
            <PixelTeacher />
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: 8,
            textShadow: '3px 3px 0 #e94560',
            letterSpacing: 2,
          }}>
            助教大冒险
          </h1>
          {/* 特性列表 - 像素风格 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 32,
            alignItems: 'center',
          }}>
            {[
              { icon: '⚔️', text: '一键评分，BOSS速通' },
              { icon: '📷', text: '照片收集，全图鉴达成' },
              { icon: '🤖', text: 'AI助攻，自动挂机' },
            ].map((item) => (
              <div key={item.text} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: '#16213e',
                border: '2px solid #0f3460',
                width: 'fit-content',
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: '#e0e0e0' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* START 按钮 - 像素风格 */}
          <button
            onClick={() => setStep('login')}
            style={{
              width: '100%',
              maxWidth: 280,
              height: 56,
              background: '#e94560',
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
              border: '4px solid #fff',
              cursor: 'pointer',
              boxShadow: '6px 6px 0 #0f3460',
              transition: 'all 0.1s',
              fontFamily: "'Courier New', monospace",
              letterSpacing: 2,
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translate(3px, 3px)';
              e.currentTarget.style.boxShadow = '3px 3px 0 #0f3460';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '6px 6px 0 #0f3460';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '6px 6px 0 #0f3460';
            }}
          >
            ▶ PRESS START
          </button>

        </div>
      )}

      {/* ───── 登录页 ───── */}
      {step === 'login' && (
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: '0 24px',
          position: 'relative',
          zIndex: 10,
          opacity: slideIn ? 1 : 0,
          transform: slideIn ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.4s ease',
        }}>
          {/* 返回 */}
          <button
            onClick={() => setStep('welcome')}
            style={{
              fontSize: 13,
              color: '#888',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 16,
              fontFamily: "'Courier New', monospace",
            }}
          >
            ← BACK
          </button>

          {/* 像素锁 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 20,
            animation: 'bounce 2s ease-in-out infinite',
          }}>
            {isRegister ? <PixelHeart /> : <PixelLock />}
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFD700',
            textAlign: 'center',
            marginBottom: 4,
            textShadow: '2px 2px 0 #e94560',
          }}>
            {isRegister ? 'NEW PLAYER' : 'CONTINUE?'}
          </h1>
          <p style={{
            fontSize: 13,
            color: '#888',
            textAlign: 'center',
            marginBottom: 28,
          }}>
            {isRegister ? '输入玩家信息加入游戏' : '输入账号密码继续冒险'}
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isRegister && (
              <div>
                <label style={{ fontSize: 12, color: '#FFD700', display: 'block', marginBottom: 4 }}>
                  PLAYER NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入昵称"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 16px',
                    background: '#16213e',
                    border: '3px solid #0f3460',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: "'Courier New', monospace",
                    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#e94560'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#0f3460'; }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#FFD700', display: 'block', marginBottom: 4 }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px',
                  background: '#16213e',
                  border: '3px solid #0f3460',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: "'Courier New', monospace",
                  boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#e94560'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#0f3460'; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#FFD700', display: 'block', marginBottom: 4 }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px',
                  background: '#16213e',
                  border: '3px solid #0f3460',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: "'Courier New', monospace",
                  boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#e94560'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#0f3460'; }}
              />
            </div>

            {/* 切换 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
            }}>
              <span style={{ fontSize: 11, color: '#666' }}>忘记密码?</span>
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                style={{
                  fontSize: 12,
                  color: '#FFD700',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  textDecoration: 'underline',
                }}
              >
                {isRegister ? '已有账号? 登录' : '新玩家? 注册'}
              </button>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                marginTop: 8,
                background: loading ? '#555' : '#e94560',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                border: '4px solid #fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '6px 6px 0 #0f3460',
                fontFamily: "'Courier New', monospace",
                letterSpacing: 2,
                transition: 'all 0.1s',
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translate(3px, 3px)';
                  e.currentTarget.style.boxShadow = '3px 3px 0 #0f3460';
                }
              }}
              onMouseUp={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0 #0f3460';
                }
              }}
            >
              {loading ? 'LOADING...' : (isRegister ? 'CREATE PLAYER' : 'ENTER GAME')}
            </button>
          </form>

          {/* 开发模式 */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => {
                setUser({ id: 'dev', email: 'dev@ta.com', name: '开发测试' });
                localStorage.setItem('ta_token', 'dev.token.placeholder');
                showToast('已进入开发模式', 'info');
                navigate('/mobile');
              }}
              style={{
                fontSize: 11,
                color: '#444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
              }}
            >
              [DEBUG] 开发者模式
            </button>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
