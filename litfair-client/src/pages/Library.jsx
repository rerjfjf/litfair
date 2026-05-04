import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://192.168.0.21:5001/api';
const getToken = () => localStorage.getItem('token');

export default function Library({ onSelect, selectMode = false }) {
  const [items, setItems] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [uploaders, setUploaders] = useState([]);
  const [books, setBooks] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', author: '', work_title: '', uploaded_by: '', sort_by: 'created_at', sort_order: 'desc', search: '' });
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({ allow_library_submissions: 'true' });
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', author: '', work_title: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const fileInput = useRef();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchItems(); }, [filters]);

  async function fetchAll() {
    fetchItems(); fetchSettings(); fetchAuthors(); fetchUploaders(); fetchBooks();
    if (user.role === 'student') { fetchTasks(); fetchSubmissions(); }
  }

  async function fetchItems() {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params.set(k, v); });
      const res = await fetch(`${API}/library?${params}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  }

  async function fetchAuthors() {
    try {
      const res = await fetch(`${API}/library/authors`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setAuthors(await res.json());
    } catch { setAuthors([]); }
  }

  async function fetchUploaders() {
    try {
      const res = await fetch(`${API}/library/uploaders`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setUploaders(await res.json());
    } catch { setUploaders([]); }
  }

  async function fetchBooks() {
    try {
      const res = await fetch(`${API}/books`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setBooks(await res.json());
    } catch { setBooks([]); }
  }

  async function fetchSettings() {
    try {
      const res = await fetch(`${API}/library/settings`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setSettings(await res.json());
    } catch {}
  }

  async function fetchTasks() {
    try {
      const res = await fetch(`${API}/tasks/student`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch { setTasks([]); }
  }

  async function fetchSubmissions() {
    try {
      const res = await fetch(`${API}/submissions/my`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch { setSubmissions([]); }
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadForm.title || uploadFile.name);
      if (uploadForm.author) formData.append('author', uploadForm.author);
      if (uploadForm.work_title) formData.append('work_title', uploadForm.work_title);
      await fetch(`${API}/library/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: formData });
      setUploadFile(null);
      setUploadForm({ title: '', author: '', work_title: '' });
      setShowUploadForm(false);
      await fetchAll();
    } catch (err) { alert('Ошибка: ' + err.message); }
    setUploading(false);
  }

  async function deleteItem(id) {
    await fetch(`${API}/library/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
    await fetchItems();
    setSelected(null);
  }

  async function toggleSetting(key) {
    const newVal = settings[key] === 'true' ? 'false' : 'true';
    await fetch(`${API}/library/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ key, value: newVal })
    });
    setSettings(p => ({ ...p, [key]: newVal }));
  }

  const allowSubmissions = settings.allow_library_submissions === 'true';
  const submittedTaskIds = new Set(submissions.map(s => s.task_id));
  const pendingTasks = tasks.filter(t => !submittedTaskIds.has(t.id));

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!selectMode && <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>}
          <div>
            <h1 style={s.title}>🗂 Медиа-библиотека</h1>
            <p style={s.subtitle}>{items.length} файлов</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user.role === 'admin' && (
            <button
              style={{ ...s.settingBtn, background: allowSubmissions ? '#e8f5e9' : '#fce4ec', color: allowSubmissions ? '#2e7d32' : '#c62828' }}
              onClick={() => toggleSetting('allow_library_submissions')}
            >
              {allowSubmissions ? '✓ Сдача из библиотеки разрешена' : '✗ Сдача из библиотеки запрещена'}
            </button>
          )}
          <button style={s.uploadBtn} onClick={() => setShowUploadForm(!showUploadForm)}>
            {showUploadForm ? 'Отмена' : '+ Загрузить'}
          </button>
        </div>
      </div>

      {showUploadForm && (
        <div style={s.uploadForm}>
          <div style={s.uploadGrid}>
            <div>
              <label style={s.label}>Название</label>
              <input style={s.input} placeholder="Название файла" value={uploadForm.title} onChange={e => setUploadForm(p => ({...p, title: e.target.value}))} />
            </div>
            <div>
              <label style={s.label}>Автор произведения</label>
              <input style={s.input} placeholder="напр. Толстой" list="authors-list" value={uploadForm.author} onChange={e => setUploadForm(p => ({...p, author: e.target.value}))} />
              <datalist id="authors-list">{authors.map(a => <option key={a} value={a} />)}</datalist>
            </div>
            <div>
              <label style={s.label}>Произведение</label>
              <input style={s.input} placeholder="напр. Война и мир" list="books-list" value={uploadForm.work_title} onChange={e => setUploadForm(p => ({...p, work_title: e.target.value}))} />
              <datalist id="books-list">{books.map(b => <option key={b.id} value={b.title} />)}</datalist>
            </div>
            <div>
              <label style={s.label}>Файл</label>
              <input type="file" accept="image/*,video/*,audio/*,application/pdf" onChange={e => setUploadFile(e.target.files[0])} style={{ fontSize: '0.85rem' }} />
            </div>
          </div>
          {uploadFile && <p style={{ color: '#2d9e5f', fontSize: '0.85rem', margin: '8px 0' }}>✓ {uploadFile.name}</p>}
          <button style={{ ...s.uploadBtn, marginTop: '8px' }} onClick={handleUpload} disabled={uploading || !uploadFile}>
            {uploading ? '⏳ Загружаю...' : '📤 Загрузить'}
          </button>
        </div>
      )}

      <div style={s.filtersBar}>
        <input style={{ ...s.input, maxWidth: '180px' }} placeholder="🔍 Поиск..." value={filters.search} onChange={e => setFilters(p => ({...p, search: e.target.value}))} />
        <select style={s.select} value={filters.type} onChange={e => setFilters(p => ({...p, type: e.target.value}))}>
          <option value="all">Все типы</option>
          <option value="photo">📸 Фото</option>
          <option value="video">🎬 Видео</option>
          <option value="audio">🎙 Аудио</option>
        </select>
        <select style={s.select} value={filters.author} onChange={e => setFilters(p => ({...p, author: e.target.value}))}>
          <option value="">Все авторы</option>
          {authors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={s.select} value={filters.work_title} onChange={e => setFilters(p => ({...p, work_title: e.target.value}))}>
          <option value="">Все произведения</option>
          {books.map(b => <option key={b.id} value={b.title}>{b.title}</option>)}
        </select>
        <select style={s.select} value={filters.uploaded_by} onChange={e => setFilters(p => ({...p, uploaded_by: e.target.value}))}>
          <option value="">Все загрузчики</option>
          {uploaders.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <select style={s.select} value={`${filters.sort_by}_${filters.sort_order}`} onChange={e => {
          const [sort_by, sort_order] = e.target.value.split('_');
          setFilters(p => ({...p, sort_by, sort_order}));
        }}>
          <option value="created_at_desc">Сначала новые</option>
          <option value="created_at_asc">Сначала старые</option>
          <option value="size_desc">По размеру ↓</option>
          <option value="size_asc">По размеру ↑</option>
          <option value="author_asc">По автору А-Я</option>
          <option value="uploader_asc">По загрузчику</option>
        </select>
        <button style={{ ...s.uploadBtn, background: '#888', padding: '8px 12px', fontSize: '0.8rem' }}
          onClick={() => setFilters({ type: 'all', author: '', work_title: '', uploaded_by: '', sort_by: 'created_at', sort_order: 'desc', search: '' })}>
          Сбросить
        </button>
      </div>

      <div style={s.gallery}>
        {items.length === 0 && (
          <div style={s.emptyBox}>
            <p style={{ fontSize: '3rem' }}>🗂</p>
            <p style={s.emptyText}>Ничего не найдено</p>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} style={s.card} onClick={() => selectMode && onSelect ? onSelect(item) : setSelected(item)}>
            <MediaThumb item={item} />
            <div style={s.cardInfo}>
              <p style={s.cardName}>{item.title || item.original_name}</p>
              {item.author && <p style={s.cardMeta}>✍️ {item.author}</p>}
              {item.work_title && <p style={s.cardMeta}>📖 {item.work_title}</p>}
              <p style={s.cardMeta}>{item.uploader_name} · {formatSize(item.size_bytes)}</p>
              <p style={s.cardMeta}>{new Date(item.created_at).toLocaleDateString('ru')}</p>
            </div>
            {selectMode && <div style={s.selectOverlay}>Выбрать</div>}
          </div>
        ))}
      </div>

      {selected && (
        <MediaModal
          item={selected}
          user={user}
          books={books}
          allowSubmissions={allowSubmissions}
          pendingTasks={pendingTasks}
          onClose={() => setSelected(null)}
          onDelete={() => deleteItem(selected.id)}
          onSubmitted={() => { setSelected(null); fetchSubmissions(); }}
          onRefresh={fetchItems}
          formatSize={formatSize}
        />
      )}
    </div>
  );
}

function MediaThumb({ item }) {
  const url = `http://192.168.0.21:5001${item.file_url}`;
  if (item.file_type === 'photo') return <img src={url} alt={item.title} style={s.thumb} onError={e => { e.target.style.display='none'; }} />;
  const icons = { video: '🎬', audio: '🎙', other: '📄' };
  const bgs = { video: '#1a1a2e', audio: '#1a2e1a', other: '#f5f0e8' };
  return (
    <div style={{ ...s.thumb, background: bgs[item.file_type] || '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '2.5rem' }}>{icons[item.file_type] || '📄'}</span>
    </div>
  );
}

function EditableMetadata({ item, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: item.title || '', author: item.author || '', work_title: item.work_title || '' });

  async function save() {
    await fetch(`${API}/library/${item.id}/meta`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(form)
    });
    onUpdate(form);
    setEditing(false);
  }

  if (!editing) return (
    <div style={{ marginBottom: '12px' }}>
      <h3 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{item.title || item.original_name}</h3>
      {item.author && <span style={s.metaTag}>✍️ {item.author}</span>}
      {item.work_title && <span style={{ ...s.metaTag, marginLeft: '6px' }}>📖 {item.work_title}</span>}
      <button style={{ ...s.btn, padding: '4px 10px', fontSize: '0.8rem', marginLeft: '8px', background: '#888' }} onClick={() => setEditing(true)}>✏️</button>
    </div>
  );

  return (
    <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input style={s.input} placeholder="Название" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      <input style={s.input} placeholder="Автор" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
      <input style={s.input} placeholder="Произведение" value={form.work_title} onChange={e => setForm(p => ({ ...p, work_title: e.target.value }))} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={s.btn} onClick={save}>💾 Сохранить</button>
        <button style={{ ...s.btn, background: '#888' }} onClick={() => setEditing(false)}>Отмена</button>
      </div>
    </div>
  );
}

function AssignWorkPanel({ item, books, onUpdate }) {
  const [bookId, setBookId] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const book = books.find(b => b.id === Number(bookId));
    if (!book) return;
    setSaving(true);
    try {
      await fetch(`${API}/library/${item.id}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ title: item.title, author: book.author, work_title: book.title })
      });
      onUpdate({ author: book.author, work_title: book.title });
    } catch { alert('Ошибка сохранения'); }
    setSaving(false);
  }

  async function clear() {
    setSaving(true);
    try {
      await fetch(`${API}/library/${item.id}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ title: item.title, author: null, work_title: null })
      });
      onUpdate({ author: null, work_title: null });
    } catch { alert('Ошибка'); }
    setSaving(false);
  }

  return (
    <div style={{ background: '#f0ebe0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        📎 Привязать к произведению
      </p>
      {item.work_title && (
        <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#2d9e5f' }}>
          Сейчас: <b>{item.work_title}</b> — {item.author}
        </p>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <select
          style={{ flex: 1, minWidth: '160px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', fontFamily: 'Georgia, serif' }}
          value={bookId}
          onChange={e => setBookId(e.target.value)}
        >
          <option value="">Выбрать произведение...</option>
          {books.map(b => (
            <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
          ))}
        </select>
        <button
          style={{ background: '#7a4a27', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', opacity: saving || !bookId ? 0.6 : 1 }}
          onClick={save}
          disabled={saving || !bookId}
        >
          {saving ? '...' : 'Привязать'}
        </button>
        {item.work_title && (
          <button
            style={{ background: '#e53935', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
            onClick={clear}
            disabled={saving}
          >
            Отвязать
          </button>
        )}
      </div>
    </div>
  );
}

function MediaModal({ item, user, books, allowSubmissions, pendingTasks, onClose, onDelete, onSubmitted, onRefresh, formatSize }) {
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const url = `http://192.168.0.21:5001${item.file_url}`;

  async function handleCheck() {
    setLoading(true);
    setError('');
    try {
      const body = allowSubmissions && taskId ? { task_id: taskId } : {};
      const res = await fetch(`${API}/library/${item.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.mode === 'submission') { onSubmitted(); }
      else { pollFreeCheck(data.check_id); }
    } catch (err) { setError(err.message); setLoading(false); }
  }

  async function pollFreeCheck(checkId) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/library/check/${checkId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
        const data = await res.json();
        if (data.ai_score != null) { clearInterval(interval); setResult(data); setLoading(false); }
      } catch {}
    }, 3000);
  }

  const canSubmit = user.role === 'student';
  const btnLabel = allowSubmissions ? '📤 Отправить на задание' : '🤖 Проверить работу';

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.closeBtn} onClick={onClose}>✕</button>
        <div style={s.preview}>
          {item.file_type === 'photo' && <img src={url} alt={item.title} style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '8px' }} />}
          {item.file_type === 'video' && <video src={url} controls style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '8px' }} />}
          {item.file_type === 'audio' && <audio src={url} controls style={{ width: '100%' }} />}
        </div>

        <EditableMetadata item={item} onUpdate={(updated) => Object.assign(item, updated)} />

        {user.role === 'admin' && (
          <AssignWorkPanel item={item} books={books} onUpdate={(updated) => {
            Object.assign(item, updated);
            onRefresh();
          }} />
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {item.author && <span style={s.metaTag}>✍️ {item.author}</span>}
          {item.work_title && <span style={s.metaTag}>📖 {item.work_title}</span>}
          <span style={s.metaTag}>👤 {item.uploader_name}</span>
          <span style={s.metaTag}>{formatSize(item.size_bytes)}</span>
          <span style={s.metaTag}>{new Date(item.created_at).toLocaleDateString('ru')}</span>
        </div>

        {result && (
          <div style={{ background: '#f0f7f2', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontWeight: 'bold', color: '#2d9e5f', margin: '0 0 8px' }}>
              🤖 Оценка ИИ: <span style={{ fontSize: '1.5rem' }}>{result.ai_score}</span> / 100
            </p>
            {result.ai_comment && <p style={{ margin: 0, lineHeight: '1.7', color: '#444' }}>{result.ai_comment}</p>}
            {result.ai_feedback?.strengths && <p style={{ margin: '8px 0 0', color: '#2d9e5f', fontSize: '0.9rem' }}>✅ {result.ai_feedback.strengths}</p>}
            {result.ai_feedback?.improvements && <p style={{ margin: '4px 0 0', color: '#e07b39', fontSize: '0.9rem' }}>💡 {result.ai_feedback.improvements}</p>}
          </div>
        )}

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {canSubmit && allowSubmissions && pendingTasks.length > 0 && (
              <div>
                <label style={s.label}>Привязать к заданию</label>
                <select style={s.selectInput} value={taskId} onChange={e => setTaskId(e.target.value)}>
                  <option value="">Без привязки (свободная проверка)</option>
                  {pendingTasks.map(t => <option key={t.id} value={t.id}>{t.topic} — {t.book_title}</option>)}
                </select>
              </div>
            )}
            {error && <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href={url} download={item.original_name} style={{ ...s.btn, background: '#5b8dd9', textDecoration: 'none', textAlign: 'center' }}>
                ⬇ Скачать
              </a>
              {canSubmit && (
                <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={handleCheck} disabled={loading}>
                  {loading ? '⏳ Отправляю...' : btnLabel}
                </button>
              )}
              {(user.role === 'admin' || item.uploaded_by === user.id) && (
                <button style={{ ...s.btn, background: '#e53935' }} onClick={onDelete}>🗑 Удалить</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f5f0e8', fontFamily: 'Georgia, serif' },
  header: { background: '#222220', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  backBtn: { background: 'transparent', border: 'none', color: '#888', fontSize: '1.3rem', cursor: 'pointer' },
  title: { color: '#fff', margin: 0, fontSize: '1.4rem' },
  subtitle: { color: '#888', margin: '2px 0 0', fontSize: '0.85rem' },
  uploadBtn: { background: '#7a4a27', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  settingBtn: { padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' },
  uploadForm: { background: '#fff', padding: '20px 32px', borderBottom: '1px solid #dcd7c9' },
  uploadGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '8px' },
  filtersBar: { background: '#fff', padding: '12px 32px', borderBottom: '1px solid #dcd7c9', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  gallery: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '24px 32px' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #dcd7c9', cursor: 'pointer', transition: 'transform 0.15s', position: 'relative' },
  thumb: { width: '100%', height: '150px', objectFit: 'cover', display: 'block' },
  cardInfo: { padding: '10px 12px' },
  cardName: { margin: '0 0 4px', fontSize: '0.85rem', fontWeight: '500', color: '#2c2c2c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardMeta: { margin: '2px 0', fontSize: '0.75rem', color: '#aaa' },
  selectOverlay: { position: 'absolute', inset: 0, background: 'rgba(122,74,39,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#7a4a27', opacity: 0, transition: 'opacity 0.2s' },
  emptyBox: { gridColumn: '1/-1', textAlign: 'center', padding: '80px 0' },
  emptyText: { color: '#aaa', fontStyle: 'italic', fontSize: '1.1rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' },
  preview: { display: 'flex', justifyContent: 'center', background: '#f5f0e8', borderRadius: '8px', padding: '16px', minHeight: '80px' },
  metaTag: { background: '#f0ebe0', color: '#7a4a27', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '99px' },
  label: { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' },
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', fontFamily: 'Georgia, serif', width: '100%', boxSizing: 'border-box' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', fontFamily: 'Georgia, serif', background: '#fff' },
  selectInput: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontFamily: 'Georgia, serif' },
  btn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', background: '#7a4a27', color: '#fff' },
};