import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

type Step = 'welcome' | 'login';

/* 随机算数验证组件 */
function MathCaptcha({ onVerify }: { onVerify: () => void }) {
  const [verified, setVerified] = useState(false);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [op, setOp] = useState('+');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  const generate = () => {
    const ops = ['+', '-', '\u00d7'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number;
    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a);
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
    }
    setA(a);
    setB(b);
    setOp(op);
    setAnswer('');
    setError(false);
    setVerified(false);
  };

  useEffect(() => { generate(); }, []);

  const checkAnswer = () => {
    let correct: number;
    if (op === '+') correct = a + b;
    else if (op === '-') correct = a - b;
    else correct = a * b;
    if (parseInt(answer) === correct) {
      setVerified(true);
      setError(false);
      onVerify();
    } else {
      setError(true);
      setTimeout(() => { setAnswer(''); setError(false); }, 500);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        background: verified ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${verified ? '#4CAF50' : error ? '#e94560' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 8,
        transition: 'all 0.3s',
      }}>
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          color: verified ? '#4CAF50' : '#FFD700',
          fontFamily: "'Courier New', monospace",
          letterSpacing: 1,
        }}>
          {a} {op} {b} = ?
        </span>
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') checkAnswer(); }}
          disabled={verified}
          placeholder="?"
          style={{
            width: 48,
            height: 32,
            padding: '0 8px',
            background: verified ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${verified ? '#4CAF50' : error ? '#e94560' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 4,
            color: '#fff',
            fontSize: 14,
            fontFamily: "'Courier New', monospace",
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={checkAnswer}
          disabled={verified || answer === ''}
          style={{
            padding: '4px 10px',
            background: verified ? '#4CAF50' : '#e94560',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            cursor: verified || answer === '' ? 'default' : 'pointer',
            opacity: verified || answer === '' ? 0.5 : 1,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {verified ? 'OK' : 'GO'}
        </button>
        {!verified && (
          <button
            type="button"
            onClick={generate}
            style={{
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              color: '#666',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
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
    if (!username || !password) return;
    if (!captchaVerified) {
      showToast('请先完成滑块验证', 'error');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        if (!name) { showToast('请输入姓名', 'error'); setLoading(false); return; }
        const data = await authApi.register(username, password, name);
        localStorage.setItem('ta_token', data.token);
        setUser(data.user);
        showToast('注册成功', 'success');
        window.location.href = '/mobile';
        return;
      } else {
        const data = await authApi.login(username, password);
        localStorage.setItem('ta_token', data.token);
        setUser(data.user);
        showToast('登录成功', 'success');
        window.location.href = '/mobile';
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
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
              { icon: '\u2694\uFE0F', text: '一键评分，BOSS速通' },
              { icon: '\uD83D\uDCF7', text: '照片收集，全图鉴达成' },
              { icon: '\uD83E\uDD16', text: 'AI助攻，自动挂机' },
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
            {'\u25B6'} PRESS START
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
            {'\u2190'} BACK
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
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#e94560'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#0f3460'; }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#FFD700', display: 'block', marginBottom: 4 }}>
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                style={inputStyle}
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
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#e94560'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#0f3460'; }}
              />
            </div>

            {/* 滑块验证 */}
            <MathCaptcha onVerify={() => setCaptchaVerified(true)} />

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
              disabled={loading || !captchaVerified}
              style={{
                width: '100%',
                height: 52,
                marginTop: 8,
                background: loading || !captchaVerified ? '#555' : '#e94560',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                border: '4px solid #fff',
                cursor: loading || !captchaVerified ? 'not-allowed' : 'pointer',
                boxShadow: loading || !captchaVerified ? 'none' : '6px 6px 0 #0f3460',
                fontFamily: "'Courier New', monospace",
                letterSpacing: 2,
                transition: 'all 0.1s',
              }}
              onMouseDown={(e) => {
                if (!loading && captchaVerified) {
                  e.currentTarget.style.transform = 'translate(3px, 3px)';
                  e.currentTarget.style.boxShadow = '3px 3px 0 #0f3460';
                }
              }}
              onMouseUp={(e) => {
                if (!loading && captchaVerified) {
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
                setUser({ id: 'dev', username: 'dev', name: '开发测试' });
                localStorage.setItem('ta_token', 'dev.token.placeholder');
                showToast('已进入开发模式', 'info');
                window.location.href = '/mobile';
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
