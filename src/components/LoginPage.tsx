import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, showToast } = useAppStore();

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}>
      <div className="w-full max-w-sm bg-[var(--bg-white)] rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>助教效率助手</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isRegister ? '创建账号，开始使用' : '登录账号，继续工作'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
                className="w-full h-11 px-3 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="w-full h-11 px-3 rounded-lg border text-sm outline-none transition-colors"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full h-11 px-3 rounded-lg border text-sm outline-none transition-colors"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="font-semibold ml-1"
            style={{ color: 'var(--primary)' }}
          >
            {isRegister ? '立即登录' : '立即注册'}
          </button>
        </div>

        {/* 开发模式：跳过登录 */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
          <button
            onClick={() => {
              setUser({ id: 'dev', email: 'dev@ta.com', name: '开发测试' });
              localStorage.setItem('ta_token', 'dev.token.placeholder');
              showToast('已进入开发模式', 'info');
              navigate('/mobile');
            }}
            className="text-xs px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            开发模式（跳过登录）
          </button>
        </div>
      </div>
    </div>
  );
}