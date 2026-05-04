import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const API = 'http://192.168.0.21:5001/api';
function getToken() { return localStorage.getItem('token'); }

export default function Admin() {
  const [tab, setTab] = useState('users');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  function logout() { localStorage.clear(); navigate('/login'); }

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <h2 style={s.logo}>📚 ЛитЯрмарка</h2>
        <p style={s.role}>Админ — {user?.full_name}</p>
        <nav style={s.nav}>
          <button style={{...s.navBtn, ...(tab==='users' ? s.navActive : {})}} onClick={() => setTab('users')}>👤 Пользователи</button>
          <button style={{...s.navBtn, ...(tab==='books' ? s.navActive : {})}} onClick={() => setTab('books')}>📖 Книги</button>
          <button style={{...s.navBtn, ...(tab==='heroes' ? s.navActive : {})}} onClick={() => setTab('heroes')}>🦸 Герои</button>
          <button style={{...s.navBtn, ...(tab==='poems' ? s.navActive : {})}} onClick={() => setTab('poems')}>🎭 Стихи</button>
          <button style={{...s.navBtn, ...(tab==='monitoring' ? s.navActive : {})}} onClick={() => setTab('monitoring')}>🛰 Мониторинг</button>
          <button style={{...s.navBtn, ...(tab==='aiTests' ? s.navActive : {})}} onClick={() => setTab('aiTests')}>🧪 До/После AI</button>
          <button style={{...s.navBtn, ...(tab==='mediaLibrary' ? s.navActive : {})}} onClick={() => setTab('mediaLibrary')}>🗂 Медиа</button>
          <button style={s.navBtn} onClick={() => navigate('/library')}>🗂 Библиотека</button>
        </nav>
        <button style={s.logout} onClick={logout}>Выйти</button>
      </aside>
      <main style={s.main}>
        {tab === 'users' && <UsersTab />}
        {tab === 'books' && <BooksTab />}
        {tab === 'heroes' && <HeroesTab />}
        {tab === 'poems' && <PoemsTab />}
        {tab === 'monitoring' && <MonitoringTab />}
        {tab === 'aiTests' && <AiTestsTab />}
        {tab === 'mediaLibrary' && <MediaLibraryTab />}
      </main>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'student', group_id: '' });
  const [loading, setLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // userId being edited

  useEffect(() => { fetchUsers(); fetchGroups(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API}/admin/users`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  }

  async function fetchGroups() {
    try {
      const res = await fetch(`${API}/admin/groups`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
  }

  async function createUser() {
    if (!form.full_name || !form.email || !form.password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) { alert('Ошибка: ' + data.error); }
      else { setForm({ full_name: '', email: '', password: '', role: 'student', group_id: '' }); await fetchUsers(); }
    } catch (e) { alert('Ошибка создания'); }
    setLoading(false);
  }

  async function changeGroup(userId, groupId) {
    try {
      await fetch(`${API}/admin/users/${userId}/group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ group_id: groupId || null })
      });
      setEditingGroup(null);
      await fetchUsers();
    } catch { alert('Ошибка изменения группы'); }
  }

  const roleLabel = { student: '🎓 Студент', teacher: '👨‍🏫 Преподаватель', admin: '🔧 Админ' };
  const roleColor = { student: '#5b8dd9', teacher: '#2d9e5f', admin: '#7a4a27' };
  const byRole = { admin: [], teacher: [], student: [] };
  users.forEach(u => { if (byRole[u.role]) byRole[u.role].push(u); });

  return (
    <div>
      <h2 style={s.title}>👤 Пользователи</h2>

      {/* Форма создания */}
      <div style={s.formBox}>
        <h3 style={s.formTitle}>Создать аккаунт</h3>
        <div style={s.grid2}>
          <div>
            <label style={s.label}>ФИО</label>
            <input style={s.input} placeholder="Иванов Иван Иванович" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
          </div>
          <div>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="ivanov@school.ru" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label style={s.label}>Пароль</label>
            <input style={s.input} type="password" placeholder="Минимум 6 символов" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div>
            <label style={s.label}>Роль</label>
            <select style={s.input} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="student">🎓 Студент</option>
              <option value="teacher">👨‍🏫 Преподаватель</option>
              <option value="admin">🔧 Администратор</option>
            </select>
          </div>
          {form.role === 'student' && (
            <div>
              <label style={s.label}>Группа (для студента)</label>
              <select style={s.input} value={form.group_id} onChange={e => setForm({...form, group_id: e.target.value})}>
                <option value="">Без группы</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <button style={s.btn} onClick={createUser} disabled={loading || !form.full_name || !form.email || !form.password}>
          {loading ? 'Создаю...' : '+ Создать аккаунт'}
        </button>
      </div>

      {/* Список пользователей по ролям */}
      {['admin','teacher','student'].map(role => (
        byRole[role].length > 0 && (
          <div key={role} style={{marginBottom: '24px'}}>
            <h3 style={{color: roleColor[role], fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px'}}>
              {roleLabel[role]} ({byRole[role].length})
            </h3>
            <div style={s.list}>
              {byRole[role].map(u => (
                <div key={u.id} style={s.card}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                      <strong style={s.cardTitle}>{u.full_name}</strong>
                      <span style={{...s.tag, background: roleColor[u.role]+'22', color: roleColor[u.role]}}>
                        {roleLabel[u.role]}
                      </span>
                    </div>
                    <p style={s.cardDesc}>{u.email}</p>
                    {u.role === 'student' && (
                      <div style={{marginTop:'8px'}}>
                        {editingGroup === u.id ? (
                          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                            <select
                              style={{...s.input, maxWidth:'200px'}}
                              defaultValue={u.group_id || ''}
                              onChange={e => changeGroup(u.id, e.target.value)}
                            >
                              <option value="">Без группы</option>
                              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button style={{...s.delBtn, opacity:1}} onClick={() => setEditingGroup(null)}>✕</button>
                          </div>
                        ) : (
                          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                            <span style={s.cardDesc}>
                              Группа: <b>{u.group_name || 'не назначена'}</b>
                            </span>
                            <button
                              style={{...s.btn, padding:'4px 12px', fontSize:'0.8rem'}}
                              onClick={() => setEditingGroup(u.id)}
                            >
                              Изменить
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {users.length === 0 && <p style={s.empty}>Пользователей пока нет</p>}
    </div>
  );
}

function AiTestsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => { fetchSubmissions(); }, []);
  async function fetchSubmissions() {
    try {
      const res = await fetch(`${API}/admin/submissions`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch { setSubmissions([]); }
  }
  async function loadAnalysis(id) {
    setSelectedId(id);
    const res = await fetch(`${API}/admin/submission-analysis/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    setAnalysis(await res.json());
  }
  return (
    <div>
      <h2 style={s.title}>🧪 Разбор до/после AI</h2>
      <div style={s.formBox}>
        <label style={s.formTitle}>Выбрать работу</label>
        <select style={s.input} value={selectedId} onChange={e => loadAnalysis(e.target.value)}>
          <option value="">Выберите работу...</option>
          {submissions.map(su => <option key={su.id} value={su.id}>{su.topic} · {su.student_name} · {su.type}</option>)}
        </select>
      </div>
      {analysis?.submission && (
        <>
          <div style={s.formBox}>
            <h3 style={s.formTitle}>До отправки в AI (pre-AI artifact)</h3>
            <pre style={s.pre}>{JSON.stringify(analysis.pre_ai_artifact || {}, null, 2)}</pre>
          </div>
          <div style={s.formBox}>
            <h3 style={s.formTitle}>Ответы AI</h3>
            {(analysis.ai_dialogs || []).map(dialog => (
              <div key={dialog.id} style={s.card}>
                <div style={{ width: '100%' }}>
                  <p style={s.cardDesc}>Stage: {dialog.stage} · Model: {dialog.model}</p>
                  <details><summary style={s.cardDesc}>Запрос</summary><pre style={s.pre}>{JSON.stringify(dialog.request_payload || {}, null, 2)}</pre></details>
                  <details><summary style={s.cardDesc}>Ответ</summary><pre style={s.pre}>{JSON.stringify(dialog.response_payload || {}, null, 2)}</pre></details>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MediaLibraryTab() {
  const [items, setItems] = useState([]);
  const [runs, setRuns] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [section, setSection] = useState('tests');
  const [author, setAuthor] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => { fetchFolders(); fetchItems(); }, []);

  async function fetchFolders() {
    try { const res = await fetch(`${API}/admin/library/folders`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); setFolders(await res.json()); } catch { setFolders([]); }
  }
  async function fetchItems(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.section) query.set('section', params.section);
      if (params.author) query.set('author', params.author);
      if (params.work_title) query.set('work_title', params.work_title);
      if (params.q) query.set('q', params.q);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await fetch(`${API}/admin/library/items${suffix}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setItems(await res.json());
    } catch { setItems([]); }
  }
  async function fetchRuns(itemId) {
    try {
      const suffix = itemId ? `?item_id=${itemId}` : '';
      const res = await fetch(`${API}/admin/library/runs${suffix}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      setRuns(await res.json());
    } catch { setRuns([]); }
  }
  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append('file', file); form.append('section', section); form.append('author', author);
    form.append('work_title', workTitle); form.append('label', label); form.append('tags', tags);
    await fetch(`${API}/admin/library/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: form });
    setFile(null); setAuthor(''); setWorkTitle(''); setLabel(''); setTags('');
    await fetchFolders(); await fetchItems();
  }
  async function runProcess(mode) {
    if (!selectedItemId) return;
    await fetch(`${API}/admin/library/items/${selectedItemId}/process`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ mode }) });
    await fetchRuns(selectedItemId);
  }
  function toggleSelected(id) { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }

  return (
    <div>
      <h2 style={s.title}>🗂 Медиа-библиотека</h2>
      <div style={s.formBox}>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Раздел" value={section} onChange={e => setSection(e.target.value)} />
          <input style={s.input} placeholder="Автор" value={author} onChange={e => setAuthor(e.target.value)} />
          <input style={s.input} placeholder="Произведение" value={workTitle} onChange={e => setWorkTitle(e.target.value)} />
          <input style={s.input} placeholder="Название файла" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <input style={{...s.input, marginBottom:'12px'}} placeholder="Теги через запятую" value={tags} onChange={e => setTags(e.target.value)} />
        <input type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button style={{...s.btn, marginTop:'12px'}} onClick={upload} disabled={!file}>Загрузить</button>
      </div>
      <div style={s.formBox}>
        <h3 style={s.formTitle}>Запуск обработки</h3>
        <select style={s.input} value={selectedItemId} onChange={e => { setSelectedItemId(e.target.value); fetchRuns(e.target.value); }}>
          <option value="">Выберите файл...</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.section}/{item.author}/{item.work_title} · {item.label}</option>)}
        </select>
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <button style={s.btn} onClick={() => runProcess('preprocess_only')} disabled={!selectedItemId}>Прогнать обработку</button>
          <button style={s.btn} onClick={() => runProcess('ai_test')} disabled={!selectedItemId}>AI тест</button>
        </div>
      </div>
      <div style={s.formBox}>
        <h3 style={s.formTitle}>История прогонов</h3>
        {runs.length === 0 && <p style={s.empty}>Прогонов пока нет</p>}
        {runs.map(run => (
          <div key={run.id} style={s.card}>
            <div style={{width:'100%'}}>
              <strong style={s.cardTitle}>{run.mode} · {run.status}</strong>
              <p style={s.cardDesc}>Запущено: {new Date(run.created_at).toLocaleString('ru')}</p>
              {run.result_summary && <p style={s.cardDesc}>Итог: {run.result_summary}</p>}
              {run.pre_ai_artifact && <details><summary style={s.cardDesc}>Артефакт</summary><pre style={s.pre}>{JSON.stringify(run.pre_ai_artifact, null, 2)}</pre></details>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitoringTab() {
  const [events, setEvents] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    const headers = { 'Authorization': `Bearer ${getToken()}` };
    try {
      const [eventsRes, dialogsRes, submissionsRes] = await Promise.all([
        fetch(`${API}/admin/audit-events?limit=200`, { headers }),
        fetch(`${API}/admin/ai-dialogs?limit=200`, { headers }),
        fetch(`${API}/admin/submissions`, { headers }),
      ]);
      setEvents(await eventsRes.json());
      setDialogs(await dialogsRes.json());
      setSubmissions(await submissionsRes.json());
    } catch {}
  }
  return (
    <div>
      <h2 style={s.title}>🛰 Мониторинг</h2>
      <button style={{...s.btn, marginBottom:'16px'}} onClick={fetchAll}>Обновить</button>
      <div style={s.formBox}>
        <h3 style={s.formTitle}>Работы и оценки</h3>
        {(Array.isArray(submissions) ? submissions : []).slice(0,100).map(item => (
          <div key={item.id} style={s.card}>
            <div>
              <strong style={s.cardTitle}>{item.topic}</strong>
              <p style={s.cardDesc}>Студент: {item.student_name} · Преподаватель: {item.teacher_name}</p>
              <p style={s.cardDesc}>Статус: {item.status} · AI: {item.ai_score ?? '—'} · Финал: {item.final_score ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={s.formBox}>
        <h3 style={s.formTitle}>Аудит действий</h3>
        {(Array.isArray(events) ? events : []).slice(0,100).map(e => (
          <div key={e.id} style={s.card}>
            <div>
              <strong style={s.cardTitle}>{e.action}</strong>
              <p style={s.cardDesc}>Actor: {e.actor_name || e.actor_email || 'system'} · {new Date(e.created_at).toLocaleString('ru')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BooksTab() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ title: '', author: '', year: '', era: '', summary: '', description: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchBooks(); }, []);
  async function fetchBooks() { try { const res = await fetch(`${API}/books`); const d = await res.json(); setBooks(Array.isArray(d) ? d : []); } catch { setBooks([]); } }
  async function addBook() {
    setLoading(true);
    await fetch(`${API}/books`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ ...form, year: parseInt(form.year) || null }) });
    setForm({ title: '', author: '', year: '', era: '', summary: '', description: '' });
    await fetchBooks(); setLoading(false);
  }
  async function deleteBook(id) { await fetch(`${API}/books/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); await fetchBooks(); }
  return (
    <div>
      <h2 style={s.title}>📖 Книги</h2>
      <div style={s.formBox}>
        <h3 style={s.formTitle}>Добавить книгу</h3>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Название" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <input style={s.input} placeholder="Автор" value={form.author} onChange={e => setForm({...form, author: e.target.value})} />
          <input style={s.input} placeholder="Год" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
          <input style={s.input} placeholder="Эпоха (напр. ВОВ)" value={form.era} onChange={e => setForm({...form, era: e.target.value})} />
        </div>
        <textarea style={s.textarea} placeholder="Краткое содержание" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} rows={3} />
        <textarea style={s.textarea} placeholder="Описание для ИИ" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
        <button style={s.btn} onClick={addBook} disabled={loading || !form.title || !form.author}>{loading ? 'Добавляю...' : '+ Добавить'}</button>
      </div>
      <div style={s.list}>
        {books.length === 0 && <p style={s.empty}>Книг пока нет</p>}
        {books.map(b => (
          <div key={b.id} style={s.card}>
            <div><strong style={s.cardTitle}>{b.title}</strong><span style={s.cardSub}> — {b.author}{b.year ? `, ${b.year}` : ''}</span>{b.era && <span style={s.tag}>{b.era}</span>}{b.summary && <p style={s.cardDesc}>{b.summary}</p>}</div>
            <button style={s.delBtn} onClick={() => deleteBook(b.id)}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroesTab() {
  const [heroes, setHeroes] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ book_id: '', name: '', speech_style: '', character_traits: '', key_phrases: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchHeroes(); fetchBooks(); }, []);
  async function fetchHeroes() { try { const res = await fetch(`${API}/heroes`); const d = await res.json(); setHeroes(Array.isArray(d) ? d : []); } catch { setHeroes([]); } }
  async function fetchBooks() { try { const res = await fetch(`${API}/books`); const d = await res.json(); setBooks(Array.isArray(d) ? d : []); } catch { setBooks([]); } }
  async function addHero() {
    setLoading(true);
    await fetch(`${API}/heroes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ ...form, character_traits: { description: form.character_traits }, key_phrases: form.key_phrases.split('\n').filter(Boolean) }) });
    setForm({ book_id: '', name: '', speech_style: '', character_traits: '', key_phrases: '' });
    await fetchHeroes(); setLoading(false);
  }
  async function deleteHero(id) { await fetch(`${API}/heroes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); await fetchHeroes(); }
  return (
    <div>
      <h2 style={s.title}>🦸 Герои</h2>
      <div style={s.formBox}>
        <div style={s.grid2}>
          <select style={s.input} value={form.book_id} onChange={e => setForm({...form, book_id: e.target.value})}><option value="">Выберите книгу...</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
          <input style={s.input} placeholder="Имя героя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <textarea style={s.textarea} placeholder="Стиль речи" value={form.speech_style} onChange={e => setForm({...form, speech_style: e.target.value})} rows={2} />
        <textarea style={s.textarea} placeholder="Черты характера" value={form.character_traits} onChange={e => setForm({...form, character_traits: e.target.value})} rows={2} />
        <button style={s.btn} onClick={addHero} disabled={loading || !form.name || !form.book_id}>{loading ? 'Добавляю...' : '+ Добавить'}</button>
      </div>
      <div style={s.list}>
        {heroes.length === 0 && <p style={s.empty}>Героев пока нет</p>}
        {heroes.map(h => (<div key={h.id} style={s.card}><div><strong style={s.cardTitle}>{h.name}</strong><span style={s.cardSub}> — {h.book_title}</span>{h.speech_style && <p style={s.cardDesc}>{h.speech_style}</p>}</div><button style={s.delBtn} onClick={() => deleteHero(h.id)}>🗑</button></div>))}
      </div>
    </div>
  );
}

function PoemsTab() {
  const [poems, setPoems] = useState([]);
  const [form, setForm] = useState({ title: '', author: '', year: '', full_text: '', themes: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchPoems(); }, []);
  async function fetchPoems() { try { const res = await fetch(`${API}/poems`); const d = await res.json(); setPoems(Array.isArray(d) ? d : []); } catch { setPoems([]); } }
  async function addPoem() {
    setLoading(true);
    await fetch(`${API}/poems`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ ...form, year: parseInt(form.year) || null, themes: form.themes.split(',').map(t => t.trim()).filter(Boolean) }) });
    setForm({ title: '', author: '', year: '', full_text: '', themes: '' });
    await fetchPoems(); setLoading(false);
  }
  async function deletePoem(id) { await fetch(`${API}/poems/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); await fetchPoems(); }
  return (
    <div>
      <h2 style={s.title}>🎭 Стихотворения</h2>
      <div style={s.formBox}>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Название" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <input style={s.input} placeholder="Автор" value={form.author} onChange={e => setForm({...form, author: e.target.value})} />
          <input style={s.input} placeholder="Год" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
          <input style={s.input} placeholder="Темы (через запятую)" value={form.themes} onChange={e => setForm({...form, themes: e.target.value})} />
        </div>
        <textarea style={s.textarea} placeholder="Полный текст" value={form.full_text} onChange={e => setForm({...form, full_text: e.target.value})} rows={6} />
        <button style={s.btn} onClick={addPoem} disabled={loading || !form.title || !form.full_text}>{loading ? 'Добавляю...' : '+ Добавить'}</button>
      </div>
      <div style={s.list}>
        {poems.length === 0 && <p style={s.empty}>Стихов пока нет</p>}
        {poems.map(p => (<div key={p.id} style={s.card}><div><strong style={s.cardTitle}>{p.title}</strong><span style={s.cardSub}> — {p.author}</span></div><button style={s.delBtn} onClick={() => deletePoem(p.id)}>🗑</button></div>))}
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'Georgia, serif', background: '#f5f0e8' },
  sidebar: { width: '240px', background: '#222220', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 },
  logo: { color: '#fff', fontSize: '1.3rem', marginBottom: '4px' },
  role: { color: '#888', fontSize: '0.85rem', marginBottom: '24px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  navBtn: { background: 'transparent', border: 'none', color: '#aaa', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem' },
  navActive: { background: '#7a4a27', color: '#fff' },
  logout: { background: 'transparent', border: '1px solid #444', color: '#888', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginTop: 'auto' },
  main: { flex: 1, padding: '40px', maxWidth: '900px', overflowY: 'auto' },
  title: { fontSize: '1.8rem', color: '#7a4a27', margin: '0 0 24px' },
  formBox: { background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #dcd7c9' },
  formTitle: { fontSize: '1rem', color: '#555', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  label: { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontFamily: 'Georgia, serif', width: '100%', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontFamily: 'Georgia, serif', marginBottom: '12px', resize: 'vertical', boxSizing: 'border-box' },
  btn: { background: '#7a4a27', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '16px 20px', border: '1px solid #dcd7c9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: '1.05rem', color: '#2c2c2c' },
  cardSub: { color: '#888', fontSize: '0.9rem' },
  cardDesc: { color: '#666', fontSize: '0.85rem', marginTop: '4px', lineHeight: '1.5' },
  pre: { background: '#f6f1e7', border: '1px solid #e5dcc8', borderRadius: '8px', padding: '12px', fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: '280px', overflow: 'auto' },
  tag: { background: '#f0ebe0', color: '#7a4a27', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '99px', marginLeft: '8px' },
  delBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: '0.5', flexShrink: 0 },
  empty: { color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: '40px' }
};