import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '@/services/api';

const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3', desc: '最新通用模型，性价比极高，适合反馈撰写' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', desc: '推理增强模型，理解力更强，速度稍慢' },
];

export default function DesktopSettings() {
  const { user, setUser, showToast, aiModelId, setAiModelId } = useAppStore();
  const navigate = useNavigate();
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('ta_ai_api_key') || ''
  );

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('ta_ai_api_key', key);
  };

  const handleLogout = () => {
    localStorage.removeItem('ta_token');
    setUser(null);
    showToast('已退出登录', 'success');
    navigate('/login');
  };

  const handleTestAi = async () => {
    if (!apiKey.trim()) {
      showToast('请先填入 API Key', 'error');
      return;
    }
    setTestStatus('loading');
    try {
      const result = await aiApi.chat([
        { role: 'system', content: '你是一位助教。' },
        { role: 'user', content: '请用一句话回复"连接成功"' },
      ], { model: aiModelId });
      if (result.content) {
        setTestStatus('success');
        showToast('AI 连接测试成功', 'success');
      } else {
        setTestStatus('error');
        showToast('AI 返回了空内容', 'error');
      }
    } catch (err) {
      setTestStatus('error');
      const msg = err instanceof Error ? err.message : '连接失败';
      showToast(`AI 连接失败：${msg}`, 'error');
    }
  };

  return (
    <div>
      {/* 个人信息 */}
      <div className="d-panel" style={{ marginBottom: 20 }}>
        <div className="d-panel-header"><h3>👤 个人信息</h3></div>
        <div className="d-panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || '-'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>姓名</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.username || '-'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>用户名</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>退出登录</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>清除登录状态</div>
            </div>
            <button
              onClick={handleLogout}
              className="d-btn d-btn-outline"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              退出
            </button>
          </div>
        </div>
      </div>

      {/* AI 配置 */}
      <div className="d-panel" style={{ marginBottom: 20 }}>
        <div className="d-panel-header">
          <h3>🤖 AI 反馈配置（DeepSeek）</h3>
        </div>
        <div className="d-panel-body">
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--primary-lighter)', borderRadius: 10, fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>使用说明</div>
            <div>1. 前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>DeepSeek 开放平台</a> 注册并创建 API Key</div>
            <div>2. 将 API Key 填入下方输入框</div>
            <div>3. 选择模型后点击「测试 AI 连接」验证是否配置正确</div>
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>DeepSeek V3 价格极低：约 ¥1/百万 token，生成一条反馈不到 ¥0.01</div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              API Key <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="password"
              className="d-search"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ fontSize: 11, color: apiKey ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>
              {apiKey ? '✓ API Key 已配置' : '✕ API Key 未配置，AI 功能无法使用'}
            </div>
          </div>

          {/* 模型选择 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
              选择模型
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEEPSEEK_MODELS.map(m => (
                <div
                  key={m.id}
                  onClick={() => setAiModelId(m.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${aiModelId === m.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: aiModelId === m.id ? 'var(--primary-lighter)' : 'var(--bg)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    {aiModelId === m.id && (
                      <span className="tag tag-primary" style={{ fontSize: 10 }}>当前</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 自定义模型 ID */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              自定义模型 ID（可选）
            </label>
            <input
              type="text"
              className="d-search"
              value={DEEPSEEK_MODELS.some(m => m.id === aiModelId) ? '' : aiModelId}
              onChange={(e) => setAiModelId(e.target.value)}
              placeholder="输入自定义模型 ID"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              留空则使用上方选择的模型
            </div>
          </div>

          {/* 测试连接 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="d-btn d-btn-primary"
              onClick={handleTestAi}
              disabled={testStatus === 'loading'}
              style={{ opacity: testStatus === 'loading' ? 0.6 : 1 }}
            >
              {testStatus === 'loading' ? '测试中...' : '🔌 测试 AI 连接'}
            </button>
            {testStatus === 'success' && (
              <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ 连接成功</span>
            )}
            {testStatus === 'error' && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>✕ 连接失败（请检查 API Key）</span>
            )}
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="d-panel">
        <div className="d-panel-header"><h3>ℹ️ 关于</h3></div>
        <div className="d-panel-body" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>版本</span>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Phase 2 (2026.07)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>技术栈</span>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>React 19 + Cloudflare Workers + DeepSeek AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
