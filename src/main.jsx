import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KeyRound, Search, Sparkles, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
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
  const filePath = DEFAULTS.path;
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token) || '');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedReply, setSelectedReply] = useState('');
  const [replyQuery, setReplyQuery] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const [records, setRecords] = useState([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.token)) loadPrompts();
  }, []);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setSettingsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((item) => {
      if (selectedReply && item?.reply_keyword !== selectedReply) return false;
      return !needle || JSON.stringify(item).toLowerCase().includes(needle);
    });
  }, [records, query, selectedReply]);

  const replyKeywords = useMemo(() => {
    const seen = new Set();
    return records.reduce((keywords, item) => {
      const keyword = item?.reply_keyword?.trim();
      if (keyword && !seen.has(keyword)) {
        seen.add(keyword);
        keywords.push(keyword);
      }
      return keywords;
    }, []);
  }, [records]);

  const visibleReplyKeywords = useMemo(() => {
    const needle = replyQuery.trim().toLowerCase();
    return needle ? replyKeywords.filter((keyword) => keyword.toLowerCase().includes(needle)) : replyKeywords;
  }, [replyKeywords, replyQuery]);

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
      setSelectedReply('');
      setSourceUrl(`https://github.com/${repo.trim()}/blob/HEAD/${filePath}`);
      setLoadedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
      setSettingsOpen(false);
      if (event) {
        setNotice('设置已保存，数据已更新');
        window.setTimeout(() => setNotice(''), 2200);
      }
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

  function clearToken() {
    localStorage.removeItem(STORAGE_KEYS.token);
    setToken('');
    setNotice('本地 Token 已清除');
    window.setTimeout(() => setNotice(''), 2200);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={18} /></span><span>Prompt Atlas</span><span className="pill">BYOK</span></div>
        <div className="top-actions"><a className="repo-link" href="https://github.com/shalom-lab/image-gen-web" target="_blank" rel="noreferrer">GitHub</a><button className="settings-button" onClick={() => setSettingsOpen(true)}>设置</button></div>
      </header>

      {settingsOpen && <div className="panel-backdrop" onMouseDown={() => setSettingsOpen(false)}><aside className="settings-panel" onMouseDown={(event) => event.stopPropagation()}><div className="panel-heading"><div><span>设置</span><small>保存在当前浏览器 · Esc 关闭</small></div><button onClick={() => setSettingsOpen(false)} aria-label="关闭">×</button></div><form onSubmit={loadPrompts}><label><span>GitHub 仓库</span><div className="input-wrap"><Sparkles size={16} /><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repository" /></div></label><label><span>GitHub Token</span><div className="input-wrap"><KeyRound size={16} /><input type={tokenVisible ? 'text' : 'password'} value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_…" /><button className="token-toggle" type="button" onClick={() => setTokenVisible((visible) => !visible)}>{tokenVisible ? '隐藏' : '显示'}</button></div></label><div className="fixed-path"><span>数据文件</span><code>{DEFAULTS.path}</code></div><button className="load-button" type="submit" disabled={loading}>{loading ? <><RefreshCw className="spin" size={17} /> 读取中…</> : '保存并读取'}</button><button className="clear-token" type="button" onClick={clearToken}>清除本地 Token</button></form></aside></div>}

      {notice && <div className="toast" role="status">{notice}</div>}

      {error && <div className="error-box">{error}</div>}

      <section className="results-head"><div><div className="section-kicker">COLLECTION</div><h2>{records.length ? `${visible.length} 条提示词` : '提示词库'}</h2></div>{records.length > 0 && <div className="result-tools"><label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索内容、标签或名称…" /></label><span className="updated">更新于 {loadedAt}</span>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label="在 GitHub 查看源文件"><ExternalLink size={17} /></a>}</div>}</section>

      {replyKeywords.length > 0 && <section className="keyword-cloud"><div className="keyword-cloud-head"><span>回复关键词</span><small>{replyKeywords.length} 个</small><label className="keyword-search"><Search size={14} /><input value={replyQuery} onChange={(event) => setReplyQuery(event.target.value)} placeholder="查找关键词" /></label>{selectedReply && <button onClick={() => setSelectedReply('')}>清除筛选</button>}<button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>回到顶部</button></div><div className="keyword-chips">{visibleReplyKeywords.map((keyword) => { const index = replyKeywords.indexOf(keyword); return <button key={keyword} className={`keyword-chip tone-${index % 8}${selectedReply === keyword ? ' active' : ''}`} onClick={() => setSelectedReply(selectedReply === keyword ? '' : keyword)}>{keyword}</button>; })}</div></section>}

      {records.length === 0 && !error && <div className="empty-state"><div className="empty-icon"><Search size={25} /></div><h3>{loading ? '正在读取…' : '还没有数据'}</h3><p>{loading ? '正在从 GitHub 获取提示词。' : '打开右上角设置，填写仓库和 Token。'}</p></div>}
      {records.length > 0 && visible.length === 0 && <div className="empty-state compact"><h3>没有匹配结果</h3><p>试试更短的关键词，或清空搜索框。</p></div>}
      <div className="card-grid">{visible.map((item, index) => { const text = bodyOf(item); const keywords = Array.isArray(item?.keywords) ? item.keywords : []; return <article className="prompt-card" key={`${titleOf(item, index)}-${index}`}><div className="card-top"><span className="date-label">{item?.savedAt ? new Date(item.savedAt).toLocaleDateString('zh-CN') : 'PROMPT'}</span><button className="copy-button" onClick={() => copyPrompt(text, index)}>{copied === index ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制</>}</button></div><h3>{titleOf(item, index)}</h3><p>{text}</p><div className="card-meta">{keywords.slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}{item?.reply_keyword && <span className="reply-tag">⌁ {item.reply_keyword}</span>}</div></article>; })}</div>
      <footer><span>Prompt Atlas</span><span>数据来自 GitHub · Token 由你掌控</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
