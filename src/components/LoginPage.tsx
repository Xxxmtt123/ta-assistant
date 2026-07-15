import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

/* ─── 粒子背景组件 ─── */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const count = 80;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let raf = 0;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      });

      // 连线
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── 主页面 ─── */
export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { setUser, showToast } = useAppStore();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
      }}
    >
      {/* 电影感背景层 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(139, 90, 43, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(30, 30, 35, 0.8) 0%, #0a0a0a 70%)
          `,
        }}
      />

      {/* 顶部电影光晕 */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: '80%',
          background: 'radial-gradient(ellipse, rgba(212, 175, 55, 0.06) 0%, transparent 60%)',
          filter: 'blur(80px)',
          animation: 'breathe 8s ease-in-out infinite',
        }}
      />

      {/* 底部暗角 vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* 粒子层 */}
      <ParticleBackground />

      {/* 扫描线效果 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 内容区 */}
      <div
        className="w-full max-w-sm px-6 relative z-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* 电影胶片装饰线 */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1,
            height: 60,
            background: 'linear-gradient(to bottom, transparent, rgba(212, 175, 55, 0.4))',
          }}
        />

        {/* 主卡片 */}
        <div
          style={{
            background: 'rgba(15, 15, 18, 0.7)',
            backdropFilter: 'blur(30px) saturate(120%)',
            WebkitBackdropFilter: 'blur(30px) saturate(120%)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            borderRadius: 4,
            padding: '48px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 顶部金色细线 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)',
            }}
          />

          {/* 角落装饰 */}
          <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '1px solid rgba(212, 175, 55, 0.3)', borderLeft: '1px solid rgba(212, 175, 55, 0.3)' }} />
          <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '1px solid rgba(212, 175, 55, 0.3)', borderRight: '1px solid rgba(212, 175, 55, 0.3)' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottom: '1px solid rgba(212, 175, 55, 0.3)', borderLeft: '1px solid rgba(212, 175, 55, 0.3)' }} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottom: '1px solid rgba(212, 175, 55, 0.3)', borderRight: '1px solid rgba(212, 175, 55, 0.3)' }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 4,
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                }}
              />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: '0.3em',
                color: '#e8e0d0',
                marginBottom: 8,
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}
            >
              助教效率助手
            </h1>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: 'rgba(212, 175, 55, 0.6)',
                textTransform: 'uppercase',
              }}
            >
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </p>
          </div>

          {/* 标签切换 */}
          <div
            style={{
              display: 'flex',
              marginBottom: 32,
              borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
            }}
          >
            <button
              onClick={() => setIsRegister(false)}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: !isRegister ? '#d4af37' : 'rgba(255,255,255,0.3)',
                background: 'none',
                border: 'none',
                borderBottom: !isRegister ? '1px solid #d4af37' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                fontWeight: !isRegister ? 400 : 300,
              }}
            >
              登 录
            </button>
            <button
              onClick={() => setIsRegister(true)}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: isRegister ? '#d4af37' : 'rgba(255,255,255,0.3)',
                background: 'none',
                border: 'none',
                borderBottom: isRegister ? '1px solid #d4af37' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                fontWeight: isRegister ? 400 : 300,
              }}
            >
              注 册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isRegister && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'rgba(212, 175, 55, 0.5)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    borderRadius: 0,
                    color: '#e8e0d0',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.05em',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'rgba(212, 175, 55, 0.5)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱地址"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  borderRadius: 0,
                  color: '#e8e0d0',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'rgba(212, 175, 55, 0.5)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  borderRadius: 0,
                  color: '#e8e0d0',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 48,
                marginTop: 8,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(139, 90, 43, 0.2))',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37',
                fontSize: 12,
                letterSpacing: '0.2em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.4s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.35), rgba(139, 90, 43, 0.35))';
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(139, 90, 43, 0.2))';
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  PROCESSING
                </span>
              ) : (
                isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'
              )}
            </button>
          </form>

          {/* 开发模式 */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(212, 175, 55, 0.08)', textAlign: 'center' }}>
            <button
              onClick={() => {
                setUser({ id: 'dev', email: 'dev@ta.com', name: '开发测试' });
                localStorage.setItem('ta_token', 'dev.token.placeholder');
                showToast('已进入开发模式', 'info');
                navigate('/mobile');
              }}
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.2)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(212, 175, 55, 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
            >
              DEV MODE — SKIP LOGIN
            </button>
          </div>
        </div>

        {/* 底部 */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.15)',
            marginTop: 32,
            textTransform: 'uppercase',
          }}
        >
          Teaching Assistant · Efficiency Tool
        </p>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
