import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Library from './Library';

const API = 'http://192.168.0.21:5001/api';
const getToken = () => localStorage.getItem('token');

const TYPE_LABELS = {
  letter: '📸 Письмо герою',
  poem: '🎙 Стихотворение',
  booktrailer: '🎬 Буктрейлер',
  pdf: '📄 Буклет',
  episode: '🖼 Эпизод',
  collage: '🎨 Коллаж',
  poem_video: '🎬 Стих в видео'
};

const ACCEPT_MAP = {
  poem: 'audio/*',
  booktrailer: 'video/*',
  poem_video: 'video/*',
  pdf: 'application/pdf',
  letter: 'image/*',
  episode: 'image/*',
  collage: 'image/*',
};

const STATUS_LABEL = {
  submitted: '📤 Отправлено',
  processing: '⏳ Обрабатывается...',
  preprocessed: '🔄 Анализируется...',
  ai_done: '🤖 Оценено ИИ',
  posted_to_diary: '✅ В дневнике',
  failed: '❌ Ошибка',
};

export default function Student() {
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [diary, setDiary] = useState([]);
  const [selected, setSelected] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    fetchSubmissions();
    fetchDiary();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch(`${API}/tasks/student`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch { setTasks([]); }
  }

  async function fetchSubmissions() {
    try {
      const res = await fetch(`${API}/submissions/my`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch { setSubmissions([]); }
  }

  async function fetchDiary() {
    try {
      const res = await fetch(`${API}/diary/me`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setDiary(Array.isArray(data) ? data : []);
    } catch { setDiary([]); }
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  // Находим уже сданные задания
  const submittedTaskIds = new Set(submissions.map(s => s.task_id));

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <h2 style={s.logo}>📚 ЛитЯрмарка</h2>
        <p style={s.role}>Студент — {user?.full_name}</p>
        <nav style={s.nav}>
          <button style={{...s.navBtn, ...(tab==='tasks' ? s.navActive : {})}} onClick={() => { setTab('tasks'); setSelected(null); }}>📋 Задания</button>
          <button style={{...s.navBtn, ...(tab==='diary' ? s.navActive : {})}} onClick={() => { setTab('diary'); setSelected(null); }}>📓 Дневник</button>
          <button style={s.navBtn} onClick={() => navigate('/library')}>🗂 Библиотека</button>
        </nav>
        <button style={s.logout} onClick={logout}>Выйти</button>
      </aside>

      <main style={s.main}>
        {tab === 'tasks' && !selected && (
          <TasksList
            tasks={tasks}
            submissions={submissions}
            submittedTaskIds={submittedTaskIds}
            onSelect={setSelected}
          />
        )}
        {tab === 'tasks' && selected && (
          <TaskDetail
            task={selected}
            submission={submissions.find(s => s.task_id === selected.id)}
            onBack={() => { setSelected(null); fetchSubmissions(); }}
          />
        )}
        {tab === 'diary' && (
          <DiaryView diary={diary} />
        )}
      </main>
    </div>
  );
}

function TasksList({ tasks, submissions, submittedTaskIds, onSelect }) {
  return (
    <div>
      <h2 style={s.title}>📋 Мои задания</h2>
      {tasks.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.empty}>Заданий пока нет</p>
          <p style={{...s.empty, fontSize:'0.85rem'}}>Обратитесь к преподавателю</p>
        </div>
      )}
      <div style={s.list}>
        {tasks.map(t => {
          const sub = submissions.find(s => s.task_id === t.id);
          return (
            <div key={t.id} style={{...s.card, cursor:'pointer'}} onClick={() => onSelect(t)}>
              <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px'}}>
                <span style={s.tag}>{TYPE_LABELS[t.type]}</span>
                  {sub && <span style={{
                    ...s.tag,
                    background: sub.status === 'posted_to_diary' ? '#e8f5e9' : sub.status === 'failed' ? '#fce4ec' : '#fff8e1',
                    color: sub.status === 'posted_to_diary' ? '#2e7d32' : sub.status === 'failed' ? '#c62828' : '#f57f17'
                  }}>{STATUS_LABEL[sub.status]}</span>}              
              </div>
              <strong style={s.cardTitle}>{t.topic}</strong>
              <p style={s.cardDesc}>📖 {t.book_title} {t.hero_name && `· 🦸 ${t.hero_name}`}</p>
              {t.description && <p style={s.cardDesc}>{t.description}</p>}
              <div style={{display:'flex', gap:'16px', marginTop:'8px'}}>
                <span style={s.cardDesc}>Макс. балл: <b>{t.max_score}</b></span>
                {t.deadline && <span style={s.cardDesc}>До: <b>{new Date(t.deadline).toLocaleDateString('ru')}</b></span>}
                {sub?.final_score != null && <span style={{...s.cardDesc, color:'#7a4a27', fontWeight:'bold'}}>Оценка: {sub.final_score}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskDetail({ task, submission, onBack }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState(submission || null);
  const [error, setError] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (currentSub && ['processing', 'preprocessed', 'submitted'].includes(currentSub.status)) {
      startPolling(currentSub.id);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentSub?.id]);

  function startPolling(id) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/submissions/${id}/status`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (['ai_done', 'posted_to_diary', 'failed'].includes(data.status)) {
          clearInterval(pollRef.current);
          // Получаем полные данные
          const fullRes = await fetch(`${API}/submissions/my`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          const all = await fullRes.json();
          const updated = all.find(s => s.id === id);
          if (updated) setCurrentSub(updated);
        } else {
          setCurrentSub(prev => ({ ...prev, status: data.status }));
        }
      } catch {}
    }, 3000);
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', task.id);

      const res = await fetch(`${API}/submissions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentSub(data);
      startPolling(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const feedback = currentSub?.ai_feedback ? 
    (typeof currentSub.ai_feedback === 'string' ? JSON.parse(currentSub.ai_feedback) : currentSub.ai_feedback) 
    : {};

  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Назад к заданиям</button>

      <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'16px'}}>
        <span style={s.tag}>{TYPE_LABELS[task.type]}</span>
        <h2 style={{...s.title, margin:0}}>{task.topic}</h2>
      </div>

      {/* Инфо о задании */}
      <div style={s.infoBox}>
        {task.book_title && <p><b>📖 Книга:</b> {task.book_title}</p>}
        {task.hero_name && <p><b>🦸 Герой:</b> {task.hero_name}</p>}
        {task.poem_title && <p><b>🎭 Стихотворение:</b> {task.poem_title}</p>}
        {task.description && <p style={{marginTop:'8px', borderTop:'1px solid #eee', paddingTop:'8px'}}>{task.description}</p>}
        <p style={{marginTop:'8px', color:'#888', fontSize:'0.85rem'}}>Максимальный балл: <b>{task.max_score}</b></p>
      </div>

      {/* Если ещё не сдавал */}
      {!currentSub && (
        <div style={s.formBox}>

          <button
            style={{...s.btn, background:'#5b8dd9', marginBottom:'12px'}}
            onClick={() => setShowLibrary(true)}
          >
            🗂 Выбрать из библиотеки
          </button>

          {showLibrary && (
            <div style={{
              position:'fixed',
              inset:0,
              background:'rgba(0,0,0,0.7)',
              zIndex:1000,
              overflow:'auto'
            }}>
              <div style={{background:'#f5f0e8', minHeight:'100vh'}}>

                <div style={{
                  padding:'16px 32px',
                  background:'#222',
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center'
                }}>
                  <h3 style={{color:'#fff', margin:0}}>
                    Выбрать из библиотеки
                  </h3>

                  <button
                    style={{
                      background:'transparent',
                      border:'none',
                      color:'#fff',
                      fontSize:'1.5rem',
                      cursor:'pointer'
                    }}
                    onClick={() => setShowLibrary(false)}
                  >
                    ✕
                  </button>
                </div>

                <Library
                  selectMode={true}
                  onSelect={async (item) => {
                    setShowLibrary(false);
                    setLoading(true);

                    try {
                      const res = await fetch(`${API}/library/${item.id}/check`, {
                        method: 'POST',
                        headers: {
                          'Content-Type':'application/json',
                          'Authorization':`Bearer ${getToken()}`
                        },
                        body: JSON.stringify({ task_id: task.id })
                      });

                      const data = await res.json();

                      if (!res.ok) throw new Error(data.error);

                      if (data.submission) {
                        setCurrentSub(data.submission);
                      }

                    } catch(err) {
                      setError(err.message);
                    }

                    setLoading(false);
                  }}
                />

              </div>
            </div>
          )}

          <h3 style={s.formTitle}>Загрузить работу</h3>

          <p style={s.cardDesc}>
            Формат: {ACCEPT_MAP[task.type]}
          </p>

          <input
            type="file"
            accept={ACCEPT_MAP[task.type]}
            onChange={e => setFile(e.target.files[0])}
            style={{margin:'12px 0', display:'block'}}
          />

          {file && (
            <p style={{...s.cardDesc, color:'#2d9e5f'}}>
              ✓ Выбран: {file.name}
            </p>
          )}

          {error && (
            <p style={{color:'#c0392b', fontSize:'0.9rem', margin:'8px 0'}}>
              {error}
            </p>
          )}

          <button
            style={{
              ...s.btn,
              opacity: loading || !file ? 0.5 : 1,
              marginTop:'12px'
            }}
            onClick={submit}
            disabled={loading || !file}
          >
            {loading ? '⏳ Отправляю...' : '📤 Отправить на оценку'}
          </button>

        </div>
      )}


      {/* Статус обработки */}
      {currentSub && ['submitted', 'processing', 'preprocessed'].includes(currentSub.status) && (
        <div style={{...s.formBox, background:'#fffbf0', borderColor:'#f0c040'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={s.spinner} />
            <div>
              <p style={{fontWeight:'bold', margin:0}}>ИИ анализирует вашу работу...</p>
              <p style={{color:'#888', fontSize:'0.85rem', margin:'4px 0 0'}}>Это займёт 20–60 секунд</p>
            </div>
          </div>
        </div>
      )}

      {currentSub && currentSub.status === 'failed' && (
        <div style={{...s.formBox, background:'#fce4ec', borderColor:'#ef9a9a'}}>
          <p style={{fontWeight:'bold', color:'#c62828', margin:'0 0 8px'}}>❌ Ошибка при обработке</p>
          <p style={{color:'#555', fontSize:'0.9rem', margin:'0 0 16px'}}>
            ИИ не смог обработать файл. Попробуйте загрузить работу заново.
          </p>
          <button style={{...s.btn}} onClick={() => setCurrentSub(null)}>
            🔄 Загрузить заново
          </button>
        </div>
      )}

      {/* Результат оценки */}
      {currentSub && currentSub.status === 'ai_done' && (
        <div style={s.resultBox}>
          <h3 style={s.formTitle}>🤖 Оценка ИИ</h3>

          {/* Большой балл */}
          <div style={s.scoreCenter}>
            <span style={s.scoreBig}>{currentSub.ai_score}</span>
            <span style={s.scoreMax}>/ {task.max_score}</span>
          </div>

          {/* Критерии */}
          {Object.keys(feedback).length > 0 && (
            <div style={s.criteriaGrid}>
              {Object.entries(feedback).map(([k, v]) => (
                <div key={k} style={s.criteriaItem}>
                  <span style={s.criteriaName}>{k}</span>
                  <div style={s.criteriaBar}>
                    <div style={{...s.criteriaFill, width:`${v*10}%`}} />
                  </div>
                  <span style={s.criteriaScore}>{v}/10</span>
                </div>
              ))}
            </div>
          )}

          {/* Комментарий ИИ */}
          {currentSub.ai_raw_response && (
            <div style={s.commentBox}>
              <h4 style={{margin:'0 0 8px', fontSize:'0.95rem', color:'#7a4a27'}}>💬 Комментарий преподавателя ИИ:</h4>
              <p style={{margin:0, lineHeight:'1.7', color:'#444'}}>{currentSub.ai_raw_response}</p>
            </div>
          )}

          <p style={{color:'#888', fontSize:'0.85rem', marginTop:'16px', fontStyle:'italic'}}>
            ⏳ Ожидает проверки преподавателя
          </p>
        </div>
      )}

      {/* Финальная оценка */}
      {currentSub && currentSub.status === 'posted_to_diary' && (
        <div style={{...s.resultBox, borderColor:'#2d9e5f'}}>
          <h3 style={{...s.formTitle, color:'#2d9e5f'}}>✅ Итоговая оценка</h3>
          <div style={s.scoreCenter}>
            <span style={{...s.scoreBig, color:'#2d9e5f'}}>{currentSub.final_score}</span>
            <span style={s.scoreMax}>/ {task.max_score}</span>
          </div>

          {currentSub.teacher_comment && (
            <div style={{...s.commentBox, borderColor:'#2d9e5f'}}>
              <h4 style={{margin:'0 0 8px', fontSize:'0.95rem', color:'#2d9e5f'}}>💬 Комментарий преподавателя:</h4>
              <p style={{margin:0, lineHeight:'1.7'}}>{currentSub.teacher_comment}</p>
            </div>
          )}

          {currentSub.ai_raw_response && (
            <div style={{...s.commentBox, marginTop:'12px'}}>
              <h4 style={{margin:'0 0 8px', fontSize:'0.95rem', color:'#7a4a27'}}>🤖 Отзыв ИИ:</h4>
              <p style={{margin:0, lineHeight:'1.7', color:'#555'}}>{currentSub.ai_raw_response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiaryView({ diary }) {
  if (diary.length === 0) {
    return (
      <div>
        <h2 style={s.title}>📓 Мой дневник</h2>
        <p style={s.empty}>Оценок пока нет</p>
      </div>
    );
  }

  const avg = Math.round(diary.reduce((a, e) => a + (e.final_score || 0), 0) / diary.length);

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
        <h2 style={{...s.title, margin:0}}>📓 Мой дневник</h2>
        <div style={{background:'#7a4a27', color:'#fff', padding:'8px 20px', borderRadius:'99px', fontFamily:'Georgia, serif'}}>
          Средний балл: <b>{avg}</b>
        </div>
      </div>

      <div style={s.list}>
        {diary.map(e => (
          <div key={e.id} style={s.card}>
            <div style={{flex:1}}>
              <strong style={s.cardTitle}>{e.task_topic || e.topic}</strong>
              <p style={s.cardDesc}>📖 {e.book_title} · {new Date(e.posted_at).toLocaleDateString('ru', {day:'numeric', month:'long', year:'numeric'})}</p>
              {e.teacher_comment && <p style={{...s.cardDesc, fontStyle:'italic'}}>💬 {e.teacher_comment}</p>}
            </div>
            <div style={{textAlign:'right', flexShrink:0}}>
              <span style={{fontSize:'2rem', fontFamily:'Georgia, serif', color:'#7a4a27', fontWeight:'bold'}}>{e.final_score}</span>
              <p style={{margin:0, fontSize:'0.75rem', color:'#aaa'}}>/ {e.max_score || 100}</p>
            </div>
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
  role: { color:'#888', fontSize:'0.85rem', marginBottom:'24px', flex:1 },
  nav: { display:'flex', flexDirection:'column', gap:'6px', flex:1 },
  navBtn: { background:'transparent', border:'none', color:'#aaa', padding:'10px 12px', borderRadius:'8px', cursor:'pointer', textAlign:'left', fontSize:'0.95rem' },
  navActive: { background:'#7a4a27', color:'#fff' },
  logout: { background:'transparent', border:'1px solid #444', color:'#888', padding:'8px', borderRadius:'8px', cursor:'pointer' },
  main: { flex:1, padding:'40px', maxWidth:'800px', overflowY:'auto' },
  title: { fontSize:'1.8rem', color:'#7a4a27', marginBottom:'24px' },
  list: { display:'flex', flexDirection:'column', gap:'16px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px 24px', border:'1px solid #dcd7c9', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' },
  cardTitle: { fontSize:'1.05rem', color:'#2c2c2c', display:'block', marginBottom:'6px' },
  cardDesc: { color:'#666', fontSize:'0.85rem', margin:'4px 0', lineHeight:'1.5' },
  tag: { background:'#f0ebe0', color:'#7a4a27', fontSize:'0.75rem', padding:'3px 10px', borderRadius:'99px', whiteSpace:'nowrap' },
  emptyBox: { textAlign:'center', padding:'60px 0' },
  empty: { color:'#aaa', fontStyle:'italic' },
  infoBox: { background:'#fff', borderRadius:'12px', padding:'20px 24px', border:'1px solid #dcd7c9', marginBottom:'20px', lineHeight:'1.8' },
  formBox: { background:'#fff', borderRadius:'12px', padding:'24px', border:'1px solid #dcd7c9', marginBottom:'20px' },
  formTitle: { fontSize:'1rem', color:'#555', marginBottom:'12px' },
  btn: { background:'#7a4a27', color:'#fff', border:'none', padding:'12px 28px', borderRadius:'8px', cursor:'pointer', fontSize:'1rem' },
  backBtn: { background:'transparent', border:'none', color:'#7a4a27', cursor:'pointer', fontSize:'0.95rem', marginBottom:'20px', padding:0 },
  resultBox: { background:'#fff', borderRadius:'12px', padding:'32px', border:'1px solid #dcd7c9' },
  scoreCenter: { textAlign:'center', margin:'16px 0 24px' },
  scoreBig: { fontSize:'4rem', fontFamily:'Georgia, serif', color:'#7a4a27', fontWeight:'bold' },
  scoreMax: { fontSize:'1.5rem', color:'#aaa', marginLeft:'8px' },
  criteriaGrid: { display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' },
  criteriaItem: { display:'flex', alignItems:'center', gap:'12px' },
  criteriaName: { fontSize:'0.85rem', color:'#555', minWidth:'160px' },
  criteriaBar: { flex:1, height:'8px', background:'#f0ebe0', borderRadius:'99px', overflow:'hidden' },
  criteriaFill: { height:'100%', background:'#7a4a27', borderRadius:'99px', transition:'width 0.5s ease' },
  criteriaScore: { fontSize:'0.85rem', fontWeight:'bold', color:'#7a4a27', minWidth:'36px', textAlign:'right' },
  commentBox: { background:'#fbf8f1', borderRadius:'8px', padding:'16px', borderLeft:'3px solid #7a4a27' },
  spinner: { width:'24px', height:'24px', border:'3px solid #f0ebe0', borderTop:'3px solid #7a4a27', borderRadius:'50%', animation:'spin 1s linear infinite', flexShrink:0 },
};

// CSS для спиннера
const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(styleEl);