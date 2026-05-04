import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://192.168.0.21:5001/api';
const getToken = () => localStorage.getItem('token');

const TYPE_LABELS = {
  letter: '📸 Письмо', poem: '🎙 Стих', booktrailer: '🎬 Буктрейлер',
  pdf: '📄 Буклет', episode: '🖼 Эпизод', collage: '🎨 Коллаж', poem_video: '🎬 Стих/видео'
};

export default function Teacher() {
  const [tab, setTab] = useState('review');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  function logout() { localStorage.clear(); navigate('/login'); }

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <h2 style={s.logo}>📚 ЛитЯрмарка</h2>
        <p style={s.role}>Преподаватель — {user?.full_name}</p>
        <nav style={s.nav}>
          <button style={{...s.navBtn, ...(tab==='review' ? s.navActive : {})}} onClick={() => setTab('review')}>✅ Проверка</button>
          <button style={{...s.navBtn, ...(tab==='diary' ? s.navActive : {})}} onClick={() => setTab('diary')}>📓 Дневник</button>
          <button style={{...s.navBtn, ...(tab==='tasks' ? s.navActive : {})}} onClick={() => setTab('tasks')}>📋 Задания</button>
          <button style={{...s.navBtn, ...(tab==='groups' ? s.navActive : {})}} onClick={() => setTab('groups')}>👥 Группы</button>
          <button style={s.navBtn} onClick={() => navigate('/library')}>🗂 Библиотека</button>
        </nav>
        <button style={s.logout} onClick={logout}>Выйти</button>
      </aside>
      <main style={s.main}>
        {tab === 'review' && <ReviewTab />}
        {tab === 'diary' && <DiaryTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'groups' && <GroupsTab />}
      </main>
    </div>
  );
}

function ReviewTab() {
  const [submissions, setSubmissions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => { fetchSubmissions(); }, []);

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/submissions/teacher`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch { setSubmissions([]); }
    setLoading(false);
  }

  async function review(id, agreeWithAi) {
    const draft = drafts[id] || {};
    setSaving(p => ({...p, [id]: true}));
    try {
      await fetch(`${API}/submissions/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          agree_with_ai: agreeWithAi,
          teacher_score: agreeWithAi ? undefined : Number(draft.score),
          teacher_comment: draft.comment || ''
        })
      });
      await fetchSubmissions();
    } catch {}
    setSaving(p => ({...p, [id]: false}));
  }

  const aiDone = submissions.filter(s => s.status === 'ai_done');
  const processing = submissions.filter(s => ['submitted','processing','preprocessed'].includes(s.status));
  const posted = submissions.filter(s => s.status === 'posted_to_diary');

  if (loading) return <p style={s.empty}>Загрузка...</p>;

  return (
    <div>
      <h2 style={s.title}>✅ Проверка работ</h2>

      {processing.length > 0 && (
        <div style={{marginBottom:'24px'}}>
          <h3 style={s.sectionLabel}>В обработке ({processing.length})</h3>
          {processing.map(item => (
            <div key={item.id} style={{...s.card, opacity:0.7, marginBottom:'10px'}}>
              <div>
                <strong>{item.topic}</strong>
                <p style={s.cardDesc}>👤 {item.student_name} · ⏳ обрабатывается...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {aiDone.length > 0 && (
        <div style={{marginBottom:'24px'}}>
          <h3 style={{...s.sectionLabel, color:'#2d9e5f'}}>Требуют проверки ({aiDone.length})</h3>
          {aiDone.map(item => {
            const feedback = item.ai_feedback
              ? (typeof item.ai_feedback === 'string' ? JSON.parse(item.ai_feedback) : item.ai_feedback)
              : {};
            const d = drafts[item.id] || {};
            return (
              <div key={item.id} style={{...s.card, borderLeft:'4px solid #2d9e5f', marginBottom:'16px', flexDirection:'column'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', width:'100%'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'6px'}}>
                      <span style={s.tag}>{TYPE_LABELS[item.type]}</span>
                      <strong style={s.cardTitle}>{item.topic}</strong>
                    </div>
                    <p style={s.cardDesc}>👤 <b>{item.student_name}</b> · 📖 {item.book_title}</p>
                  </div>
                </div>

                {/* AI оценка */}
                <div style={{background:'#f0f7f2', borderRadius:'8px', padding:'14px', margin:'10px 0', width:'100%', boxSizing:'border-box'}}>
                  <p style={{margin:'0 0 8px', fontWeight:'bold', color:'#2d9e5f'}}>
                    🤖 ИИ оценка: <span style={{fontSize:'1.3rem'}}>{item.ai_score}</span> / {item.max_score}
                  </p>
                  {Object.keys(feedback).length > 0 && (
                    <div style={{display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'8px'}}>
                      {Object.entries(feedback).map(([k,v]) => (
                        <span key={k} style={{background:'#fff', border:'1px solid #c8e6c9', borderRadius:'6px', padding:'2px 8px', fontSize:'0.8rem'}}>
                          <b>{k}:</b> {v}/10
                        </span>
                      ))}
                    </div>
                  )}
                  {item.ai_raw_response && (
                    <p style={{color:'#444', fontSize:'0.85rem', lineHeight:'1.6', fontStyle:'italic', margin:0}}>
                      💬 {item.ai_raw_response}
                    </p>
                  )}
                </div>

                {/* Действия */}
                <div style={{display:'flex', gap:'10px', alignItems:'flex-end', flexWrap:'wrap', width:'100%'}}>
                  <div>
                    <label style={s.label}>Своя оценка</label>
                    <input
                      style={{...s.input, width:'100px'}}
                      type="number" min="0" max={item.max_score}
                      placeholder={item.ai_score}
                      value={d.score || ''}
                      onChange={e => setDrafts(p => ({...p, [item.id]: {...(p[item.id]||{}), score: e.target.value}}))}
                    />
                  </div>
                  <div style={{flex:1, minWidth:'200px'}}>
                    <label style={s.label}>Комментарий студенту</label>
                    <textarea
                      style={{...s.textarea, marginBottom:0, minHeight:'60px'}}
                      placeholder="Ваш комментарий..."
                      value={d.comment || ''}
                      onChange={e => setDrafts(p => ({...p, [item.id]: {...(p[item.id]||{}), comment: e.target.value}}))}
                    />
                  </div>
                </div>
                <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
                  <button
                    style={{...s.btn, background:'#2d9e5f'}}
                    disabled={saving[item.id]}
                    onClick={() => review(item.id, true)}
                  >
                    ✓ Согласен с ИИ ({item.ai_score})
                  </button>
                  <button
                    style={{...s.btn, background:'#5b8dd9'}}
                    disabled={saving[item.id] || !d.score}
                    onClick={() => review(item.id, false)}
                  >
                    💾 Поставить {d.score || '...'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {posted.length > 0 && (
        <div>
          <h3 style={{...s.sectionLabel, color:'#aaa'}}>Проверено ({posted.length})</h3>
          {posted.map(item => (
            <div key={item.id} style={{...s.card, opacity:0.8, marginBottom:'10px'}}>
              <div style={{flex:1}}>
                <strong style={s.cardTitle}>{item.topic}</strong>
                <p style={s.cardDesc}>👤 {item.student_name} · Итог: <b>{item.final_score}</b> / {item.max_score}</p>
                {item.teacher_comment && <p style={{...s.cardDesc, fontStyle:'italic'}}>💬 {item.teacher_comment}</p>}
              </div>
              <span style={{...s.tag, background:'#e8f5e9', color:'#2e7d32'}}>✅ В дневнике</span>
            </div>
          ))}
        </div>
      )}

      {submissions.length === 0 && <p style={s.empty}>Работ пока нет</p>}
    </div>
  );
}

function DiaryTab() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [diary, setDiary] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    try {
      const res = await fetch(`${API}/groups`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
  }

  async function selectGroup(group) {
    setSelectedGroup(group);
    setSelectedStudent(null);
    setDiary([]);
    try {
      const res = await fetch(`${API}/diary/group/${group.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      // Получаем уникальных студентов
      const studentMap = {};
      (Array.isArray(data) ? data : []).forEach(e => {
        if (!studentMap[e.student_id]) {
          studentMap[e.student_id] = { id: e.student_id, name: e.student_name, entries: [] };
        }
        studentMap[e.student_id].entries.push(e);
      });
      setStudents(Object.values(studentMap));
    } catch { setStudents([]); }
  }

  async function selectStudent(student) {
    setSelectedStudent(student);
    setLoading(true);
    try {
      const res = await fetch(`${API}/diary/student/${student.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setDiary(Array.isArray(data) ? data : []);
    } catch { setDiary([]); }
    setLoading(false);
  }

  // Таблица дневника
  if (selectedStudent) {
    const avg = diary.length ? Math.round(diary.reduce((a,e) => a + (e.final_score||0), 0) / diary.length) : 0;
    return (
      <div>
        <button style={s.backBtn} onClick={() => { setSelectedStudent(null); setDiary([]); }}>← Назад к группе</button>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h2 style={{...s.title, margin:0}}>📓 {selectedStudent.name}</h2>
          <div style={{background:'#7a4a27', color:'#fff', padding:'6px 16px', borderRadius:'99px'}}>
            Средний: <b>{avg}</b>
          </div>
        </div>
        {loading ? <p style={s.empty}>Загрузка...</p> : (
          <div style={s.list}>
            {diary.length === 0 && <p style={s.empty}>Оценок нет</p>}
            {diary.map(e => (
              <div key={e.id} style={s.card}>
                <div style={{flex:1}}>
                  <strong style={s.cardTitle}>{e.task_topic || e.topic}</strong>
                  <p style={s.cardDesc}>📖 {e.book_title} · {new Date(e.posted_at).toLocaleDateString('ru', {day:'numeric', month:'long'})}</p>
                  <p style={s.cardDesc}>🤖 ИИ: {e.ai_score ?? '—'} · 👨‍🏫 Преподаватель: {e.teacher_score ?? '—'}</p>
                  {e.teacher_comment && <p style={{...s.cardDesc, fontStyle:'italic'}}>💬 {e.teacher_comment}</p>}
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <span style={{fontSize:'2rem', fontFamily:'Georgia, serif', color:'#7a4a27', fontWeight:'bold'}}>{e.final_score}</span>
                  <p style={{margin:0, fontSize:'0.75rem', color:'#aaa'}}>/ {e.max_score || 100}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedGroup) {
    return (
      <div>
        <button style={s.backBtn} onClick={() => { setSelectedGroup(null); setStudents([]); }}>← Назад к группам</button>
        <h2 style={s.title}>👥 Группа {selectedGroup.name}</h2>
        {students.length === 0 && <p style={s.empty}>Студентов с оценками нет</p>}
        <div style={s.list}>
          {students.map(st => {
            const avg = st.entries.length ? Math.round(st.entries.reduce((a,e) => a+(e.final_score||0),0)/st.entries.length) : null;
            return (
              <div key={st.id} style={{...s.card, cursor:'pointer'}} onClick={() => selectStudent(st)}>
                <div style={{flex:1}}>
                  <strong style={s.cardTitle}>👤 {st.name}</strong>
                  <p style={s.cardDesc}>Работ сдано: {st.entries.length}</p>
                </div>
                {avg != null && (
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:'1.5rem', color:'#7a4a27', fontWeight:'bold'}}>{avg}</span>
                    <p style={{margin:0, fontSize:'0.75rem', color:'#aaa'}}>средний</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={s.title}>📓 Дневник</h2>
      <p style={{...s.cardDesc, marginBottom:'20px'}}>Выберите группу чтобы посмотреть успеваемость студентов</p>
      {groups.length === 0 && <p style={s.empty}>Групп нет — создайте во вкладке «Группы»</p>}
      <div style={s.list}>
        {groups.map(g => (
          <div key={g.id} style={{...s.card, cursor:'pointer'}} onClick={() => selectGroup(g)}>
            <div>
              <strong style={s.cardTitle}>👥 {g.name}</strong>
              {g.code && <span style={s.tag}>{g.code}</span>}
              <p style={s.cardDesc}>Студентов: {g.student_count || 0}</p>
            </div>
            <span style={{color:'#aaa', fontSize:'1.2rem'}}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    try {
      const res = await fetch(`${API}/groups`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
  }

  async function addGroup() {
    setLoading(true);
    await fetch(`${API}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(form)
    });
    setForm({ name: '', code: '' });
    await fetchGroups();
    setLoading(false);
  }

  return (
    <div>
      <h2 style={s.title}>👥 Группы</h2>
      <div style={s.formBox}>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Название (напр. ИС-21)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input style={s.input} placeholder="Код группы" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        </div>
        <button style={s.btn} onClick={addGroup} disabled={loading || !form.name}>
          {loading ? 'Добавляю...' : '+ Добавить группу'}
        </button>
      </div>
      <div style={s.list}>
        {groups.length === 0 && <p style={s.empty}>Групп пока нет</p>}
        {groups.map(g => (
          <div key={g.id} style={s.card}>
            <div>
              <strong style={s.cardTitle}>{g.name}</strong>
              {g.code && <span style={s.tag}>{g.code}</span>}
              <p style={s.cardDesc}>Студентов: {g.student_count || 0}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [books, setBooks] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [poems, setPoems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'letter', group_id: '', book_id: '', hero_id: '',
    poem_id: '', topic: '', description: '', max_score: '100', deadline: ''
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const h = { 'Authorization': `Bearer ${getToken()}` };
    try {
      const [t, g, b, he, p] = await Promise.all([
        fetch(`${API}/tasks`, {headers:h}).then(r=>r.json()),
        fetch(`${API}/groups`, {headers:h}).then(r=>r.json()),
        fetch(`${API}/books`).then(r=>r.json()),
        fetch(`${API}/heroes`).then(r=>r.json()),
        fetch(`${API}/poems`).then(r=>r.json()),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setGroups(Array.isArray(g) ? g : []);
      setBooks(Array.isArray(b) ? b : []);
      setHeroes(Array.isArray(he) ? he : []);
      setPoems(Array.isArray(p) ? p : []);
    } catch {}
  }

  async function addTask() {
    setLoading(true);
    const criteria = form.type === 'letter' ? {items:['Характер героя','События книги','Грамотность','Оформление','Соответствие теме']}
      : form.type === 'poem' ? {items:['Точность текста','Выразительность','Темп']}
      : {items:['Соответствие книге','Творческая подача','Раскрытие темы']};
    await fetch(`${API}/tasks`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
      body:JSON.stringify({...form, max_score:parseInt(form.max_score)||100, criteria, hero_id:form.hero_id||null, poem_id:form.poem_id||null})
    });
    setForm({type:'letter',group_id:'',book_id:'',hero_id:'',poem_id:'',topic:'',description:'',max_score:'100',deadline:''});
    setShowForm(false);
    await fetchAll();
    setLoading(false);
  }

  async function deleteTask(id) {
    await fetch(`${API}/tasks/${id}`, {method:'DELETE', headers:{'Authorization':`Bearer ${getToken()}`}});
    await fetchAll();
  }

  const filteredHeroes = heroes.filter(h => h.book_id === form.book_id);

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
        <h2 style={{...s.title, margin:0}}>📋 Задания</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>{showForm ? 'Отмена' : '+ Новое задание'}</button>
      </div>

      {showForm && (
        <div style={s.formBox}>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Тип задания</label>
              <select style={s.input} value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value="letter">📸 Письмо (фото)</option>
                <option value="poem">🎙 Стихотворение (аудио)</option>
                <option value="booktrailer">🎬 Буктрейлер (видео)</option>
                <option value="pdf">📄 Буклет (PDF)</option>
                <option value="episode">🖼 Эпизод (фото)</option>
                <option value="collage">🎨 Коллаж (фото)</option>
                <option value="poem_video">🎬 Стих в видео</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Группа</label>
              <select style={s.input} value={form.group_id} onChange={e => setForm({...form, group_id:e.target.value})}>
                <option value="">Выберите группу...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Книга</label>
              <select style={s.input} value={form.book_id} onChange={e => setForm({...form, book_id:e.target.value, hero_id:'', poem_id:''})}>
                <option value="">Выберите книгу...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
              </select>
            </div>
            {(form.type === 'letter' || form.type === 'episode' || form.type === 'collage') && (
              <div>
                <label style={s.label}>Герой</label>
                <select style={s.input} value={form.hero_id} onChange={e => setForm({...form, hero_id:e.target.value})}>
                  <option value="">Выберите героя...</option>
                  {filteredHeroes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            )}
            {(form.type === 'poem' || form.type === 'poem_video') && (
              <div>
                <label style={s.label}>Стихотворение</label>
                <select style={s.input} value={form.poem_id} onChange={e => setForm({...form, poem_id:e.target.value})}>
                  <option value="">Выберите стих...</option>
                  {poems.map(p => <option key={p.id} value={p.id}>{p.title} — {p.author}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={s.label}>Макс. балл</label>
              <input style={s.input} type="number" value={form.max_score} onChange={e => setForm({...form, max_score:e.target.value})} />
            </div>
            <div>
              <label style={s.label}>Дедлайн</label>
              <input style={s.input} type="datetime-local" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} />
            </div>
          </div>
          <label style={s.label}>Тема задания</label>
          <input style={{...s.input, width:'100%', marginBottom:'12px'}} placeholder="Напр: Напиши письмо от лица Васкова..." value={form.topic} onChange={e => setForm({...form, topic:e.target.value})} />
          <label style={s.label}>Описание для студента</label>
          <textarea style={s.textarea} rows={3} placeholder="Подробное описание..." value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          <button style={s.btn} onClick={addTask} disabled={loading || !form.group_id || !form.book_id || !form.topic}>
            {loading ? 'Создаю...' : '✓ Создать задание'}
          </button>
        </div>
      )}

      <div style={s.list}>
        {tasks.length === 0 && <p style={s.empty}>Заданий пока нет</p>}
        {tasks.map(t => (
          <div key={t.id} style={s.card}>
            <div style={{flex:1}}>
              <div style={{display:'flex', gap:'8px', marginBottom:'6px'}}>
                <span style={s.tag}>{TYPE_LABELS[t.type]}</span>
                <strong style={s.cardTitle}>{t.topic}</strong>
              </div>
              <p style={s.cardDesc}>📖 {t.book_title} {t.hero_name && `· 🦸 ${t.hero_name}`}</p>
              <p style={{...s.cardDesc, color:'#aaa'}}>Макс: {t.max_score} {t.deadline && `· До: ${new Date(t.deadline).toLocaleDateString('ru')}`}</p>
            </div>
            <button style={s.delBtn} onClick={() => deleteTask(t.id)}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { display:'flex', minHeight:'100vh', fontFamily:'Georgia, serif', background:'#f5f0e8' },
  sidebar: { width:'240px', background:'#222220', padding:'24px', display:'flex', flexDirection:'column', flexShrink:0 },
  logo: { color:'#fff', fontSize:'1.3rem', marginBottom:'4px' },
  role: { color:'#888', fontSize:'0.85rem', marginBottom:'24px' },
  nav: { display:'flex', flexDirection:'column', gap:'6px', flex:1 },
  navBtn: { background:'transparent', border:'none', color:'#aaa', padding:'10px 12px', borderRadius:'8px', cursor:'pointer', textAlign:'left', fontSize:'0.95rem' },
  navActive: { background:'#7a4a27', color:'#fff' },
  logout: { background:'transparent', border:'1px solid #444', color:'#888', padding:'8px', borderRadius:'8px', cursor:'pointer', marginTop:'auto' },
  main: { flex:1, padding:'40px', maxWidth:'900px', overflowY:'auto' },
  title: { fontSize:'1.8rem', color:'#7a4a27', marginBottom:'24px' },
  sectionLabel: { fontSize:'0.85rem', textTransform:'uppercase', letterSpacing:'1px', color:'#888', marginBottom:'12px' },
  list: { display:'flex', flexDirection:'column', gap:'12px' },
  card: { background:'#fff', borderRadius:'10px', padding:'16px 20px', border:'1px solid #dcd7c9', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' },
  cardTitle: { fontSize:'1.05rem', color:'#2c2c2c' },
  cardDesc: { color:'#666', fontSize:'0.85rem', margin:'4px 0', lineHeight:'1.5' },
  tag: { background:'#f0ebe0', color:'#7a4a27', fontSize:'0.75rem', padding:'2px 8px', borderRadius:'99px', whiteSpace:'nowrap' },
  formBox: { background:'#fff', borderRadius:'12px', padding:'24px', marginBottom:'24px', border:'1px solid #dcd7c9' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' },
  label: { display:'block', fontSize:'0.75rem', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { padding:'10px 14px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'0.95rem', fontFamily:'Georgia, serif', width:'100%', boxSizing:'border-box' },
  textarea: { width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'0.95rem', fontFamily:'Georgia, serif', marginBottom:'12px', resize:'vertical', boxSizing:'border-box' },
  btn: { background:'#7a4a27', color:'#fff', border:'none', padding:'10px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'0.95rem' },
  delBtn: { background:'transparent', border:'none', cursor:'pointer', fontSize:'1.1rem', opacity:'0.5', flexShrink:0 },
  backBtn: { background:'transparent', border:'none', color:'#7a4a27', cursor:'pointer', fontSize:'0.95rem', marginBottom:'20px', padding:0 },
  empty: { color:'#aaa', fontStyle:'italic', textAlign:'center', padding:'40px' },
};