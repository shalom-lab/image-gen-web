import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KeyRound, Search, Sparkles, RefreshCw, Copy, Check, ExternalLink, Database, LockKeyhole } from 'lucide-react';
import './styles.css';

const DEFAULTS = {
  repo: 'shalom-lab/image-gen',
  path: 'data/data_all_prompts.json',
};
const STORAGE_KEYS = { repo: 'gh_image_gen_repo', token: 'gh_image_gen_token' };

function toRecords(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['prompts', 'data', 'items', 'results', 'records']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value]) =>
      typeof value === 'object' && value !== null ? { _key: key, ...value } : { _key: key, value },
    );
  }
  return [{ value: payload }];
}

function titleOf(item, index) {
  return item?.wechat_title || item?.title || item?.name || item?.prompt_name || item?.prompt_id || item?.id || item?._key || `Prompt ${index + 1}`;
}

function bodyOf(item) {
  if (typeof item === 'string') return item;
  return item?.prompt || item?.content || item?.text || item?.description || item?.value || JSON.stringify(item, null, 2);
}

function App() {
  const [repo, setRepo] = useState(() => localStorage.getItem(STORAGE_KEYS.repo) || DEFAULTS.repo);
  const [filePath, setFilePath] = useState(DEFAULTS.path);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token) || '');
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState('');
  const [copied, setCopied] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }, [records, query]);

  async function loadPrompts(event) {
    event?.preventDefault();
    setError('');
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo.trim())) {
      setError('仓库格式应为 owner/repository。');
      return;
    }
    setLoading(true);
    localStorage.setItem(STORAGE_KEYS.repo, repo.trim());
    localStorage.setItem(STORAGE_KEYS.token, token.trim());
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = new URL(`https://api.github.com/repos/${repo.trim()}/contents/${encodedPath}`);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
        },
      });
      if (!response.ok) {
        let message = `GitHub 返回 HTTP ${response.status}`;
        try { message += `：${(await response.json()).message || ''}`; } catch { /* ignore */ }
        throw new Error(message);
      }
      const payload = await response.json();
      setRecords(toRecords(payload));
      setSourceUrl(`https://github.com/${repo.trim()}/blob/HEAD/${filePath}`);
      setLoadedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
    } catch (requestError) {
      setRecords([]);
      setError(`${requestError.message}。请检查仓库、路径、分支和 Token 权限。`);
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt(text, index) {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 1400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={18} /></span><span>Prompt Atlas</span><span className="pill">BYOK</span></div>
        <a className="top-link" href="https://github.com" target="_blank" rel="noreferrer"><Sparkles size={16} /> GitHub</a>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="status-dot" /> PRIVATE DATA, YOUR KEY</div>
        <h1>把仓库里的提示词，<em>变成可搜索的知识库。</em></h1>
        <p className="hero-copy">浏览 GitHub 上的 prompt 数据。Token 只在你的浏览器中使用，页面不会上传或保存它。</p>
      </section>

      <section className="control-panel">
        <form onSubmit={loadPrompts}>
          <div className="field-grid">
            <label><span>GitHub 仓库</span><div className="input-wrap"><Sparkles size={16} /><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repository" /></div></label>
            <label><span>文件路径</span><div className="input-wrap"><Database size={16} /><input value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder="data/data_all_prompts.json" /></div></label>
            <label><span>GitHub Token <small>BYOK</small></span><div className="input-wrap"><KeyRound size={16} /><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_… / github_pat_…" /></div></label>
          </div>
          <div className="panel-actions"><span className="saved-hint">设置保存在当前浏览器的 localStorage</span><button className="load-button" type="submit" disabled={loading}>{loading ? <><RefreshCw className="spin" size={17} /> 读取中…</> : <><Search size={17} /> 读取提示词</>}</button></div>
        </form>
        <div className="security-note"><LockKeyhole size={15} /> 固定数据文件：<code>{DEFAULTS.path}</code> · 未指定分支，自动跟随源仓库默认分支。</div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="results-head"><div><div className="section-kicker">COLLECTION</div><h2>{records.length ? `${visible.length} 条提示词` : '等待一次读取'}</h2></div>{records.length > 0 && <div className="result-tools"><label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索内容、标签或名称…" /></label><span className="updated">更新于 {loadedAt}</span>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label="在 GitHub 查看源文件"><ExternalLink size={17} /></a>}</div>}</section>

      {records.length === 0 && !error && <div className="empty-state"><div className="empty-icon"><Search size={25} /></div><h3>从你的仓库开始</h3><p>填写仓库和数据文件路径，再点击“读取提示词”。公开仓库无需 Token。</p></div>}
      {records.length > 0 && visible.length === 0 && <div className="empty-state compact"><h3>没有匹配结果</h3><p>试试更短的关键词，或清空搜索框。</p></div>}
      <div className="card-grid">{visible.map((item, index) => { const text = bodyOf(item); const keywords = Array.isArray(item?.keywords) ? item.keywords : []; return <article className="prompt-card" key={`${titleOf(item, index)}-${index}`}><div className="card-top"><span className="card-number">{String(index + 1).padStart(2, '0')}</span><span className="date-label">{item?.savedAt ? new Date(item.savedAt).toLocaleDateString('zh-CN') : 'PROMPT'}</span><button className="copy-button" onClick={() => copyPrompt(text, index)}>{copied === index ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制</>}</button></div><h3>{titleOf(item, index)}</h3><p>{text}</p><div className="card-meta">{keywords.slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}{item?.reply_keyword && <span className="reply-tag">⌁ {item.reply_keyword}</span>}</div></article>; })}</div>
      <footer><span>Prompt Atlas</span><span>数据来自 GitHub · Token 由你掌控</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
