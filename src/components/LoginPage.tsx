import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

type Step = 'welcome' | 'login';

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
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ───── 第一步：欢迎页 ───── */}
      {step === 'welcome' && (
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: '0 24px',
          opacity: 1,
          transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {/* 顶部导航 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}>
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#111',
              letterSpacing: '-0.02em',
            }}>
              TA
            </span>
            <button
              onClick={() => setStep('login')}
              style={{
                fontSize: 14,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              跳过
            </button>
          </div>

          {/* 插画区域 */}
          <div style={{
            width: '100%',
            height: 280,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #f0f7e6 0%, #e8f5e9 50%, #c8e6c9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 36,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 装饰圆 */}
            <div style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(76, 175, 80, 0.15)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(76, 175, 80, 0.1)',
            }} />

            {/* 跑步人物插画 */}
            <img src="/illust-running.jpg" alt="" style={{ height: '85%', objectFit: 'contain' }} />
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#111',
            lineHeight: 1.2,
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            高效管理，<br />轻松教学
          </h1>
          <p style={{
            fontSize: 15,
            color: '#888',
            lineHeight: 1.6,
            marginBottom: 40,
          }}>
            智能助教工具，让班级管理、学生评分、照片收集变得简单高效
          </p>

          {/* CTA 按钮 */}
          <button
            onClick={() => setStep('login')}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 16,
              background: '#111',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
            }}
          >
            开始使用
          </button>
        </div>
      )}

      {/* ───── 第二步：登录页 ───── */}
      {step === 'login' && (
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: '0 24px',
          opacity: slideIn ? 1 : 0,
          transform: slideIn ? 'translateX(0)' : 'translateX(60px)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {/* 顶部导航 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#111',
              letterSpacing: '-0.02em',
            }}>
              TA
            </span>
          </div>

          {/* 插画区域 */}
          <div style={{
            width: '100%',
            height: 200,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF3E0 50%, #FFE0B2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: -20,
              left: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255, 193, 7, 0.15)',
            }} />

            {/* 击掌插画 */}
            <img src="/illust-highfive.jpg" alt="" style={{ height: '80%', objectFit: 'contain' }} />
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#111',
            marginBottom: 6,
            letterSpacing: '-0.02em',
          }}>
            {isRegister ? '创建账号' : '欢迎回来！'}
          </h1>
          <p style={{
            fontSize: 14,
            color: '#999',
            marginBottom: 32,
          }}>
            {isRegister ? '开始你的高效教学之旅' : '登录以继续管理工作'}
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isRegister && (
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 18,
                }}>
                  👤
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  style={{
                    width: '100%',
                    height: 52,
                    paddingLeft: 48,
                    paddingRight: 16,
                    borderRadius: 14,
                    border: '2px solid #f0f0f0',
                    background: '#fff',
                    fontSize: 14,
                    color: '#333',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#FFD54F'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; }}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 18,
              }}>
                ✉️
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱地址"
                style={{
                  width: '100%',
                  height: 52,
                  paddingLeft: 48,
                  paddingRight: 16,
                  borderRadius: 14,
                  border: '2px solid #f0f0f0',
                  background: '#fff',
                  fontSize: 14,
                  color: '#333',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FFD54F'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 18,
              }}>
                🔒
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{
                  width: '100%',
                  height: 52,
                  paddingLeft: 48,
                  paddingRight: 16,
                  borderRadius: 14,
                  border: '2px solid #f0f0f0',
                  background: '#fff',
                  fontSize: 14,
                  color: '#333',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FFD54F'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; }}
              />
            </div>

            {/* 底部操作行 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
            }}>
              <span style={{ fontSize: 13, color: '#999' }}>
                忘记密码？
              </span>
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {isRegister ? '去登录' : '注册账号'}
              </button>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 56,
                borderRadius: 16,
                background: '#111',
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginTop: 8,
                letterSpacing: '-0.01em',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
              }}
            >
              {loading ? '处理中...' : (isRegister ? '创建账号' : '登录')}
            </button>
          </form>

          {/* 开发模式 */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <button
              onClick={() => {
                setUser({ id: 'dev', email: 'dev@ta.com', name: '开发测试' });
                localStorage.setItem('ta_token', 'dev.token.placeholder');
                showToast('已进入开发模式', 'info');
                navigate('/mobile');
              }}
              style={{
                fontSize: 11,
                color: '#ccc',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              开发模式（跳过登录）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
