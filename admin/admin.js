/* ── Auth ──────────────────────────────────────────────────────────────── */
let token = localStorage.getItem('kausachun_token') || '';

async function api(method, path, body, isFormData = false) {
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + token }
  };
  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch('/api/admin' + path, opts);
  if (res.status === 401) { doLogout(); return null; }
  return res.json();
}

/* ── Login ─────────────────────────────────────────────────────────────── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pwd = document.getElementById('loginPwd').value;
  const err = document.getElementById('loginError');
  err.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();
    if (res.ok) {
      token = data.token;
      localStorage.setItem('kausachun_token', token);
      showApp();
    } else {
      err.textContent = data.error || 'Error de autenticación';
    }
  } catch {
    err.textContent = 'No se pudo conectar al servidor';
  }
});

async function checkAuth() {
  if (!token) return;
  const data = await fetch('/api/admin/me', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (data.status === 401) { token = ''; localStorage.removeItem('kausachun_token'); }
  else showApp();
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  navigateTo('dashboard');
  loadStats();
}

function doLogout() {
  token = '';
  localStorage.removeItem('kausachun_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

document.getElementById('logoutBtn').addEventListener('click', doLogout);

/* ── Navigation ────────────────────────────────────────────────────────── */
function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  loaders[view]?.();
}

document.querySelectorAll('[data-view]').forEach(el =>
  el.addEventListener('click', () => navigateTo(el.dataset.view))
);

const loaders = {
  dashboard: loadStats,
  plan:      loadPlan,
  news:      loadNews,
  videos:    loadVideos,
  contacts:  loadContacts
};

/* ── Stats ─────────────────────────────────────────────────────────────── */
async function loadStats() {
  const data = await api('GET', '/stats');
  if (!data) return;
  document.getElementById('statNews').textContent     = data.news;
  document.getElementById('statVideos').textContent   = data.videos;
  document.getElementById('statContacts').textContent = data.contacts;
  document.getElementById('statPlan').textContent     = data.hasPlan ? 'Cargado' : 'No cargado';
  document.getElementById('planStatIcon').textContent = data.hasPlan ? '✅' : '⚠️';
  const badge = document.getElementById('unreadBadge');
  if (data.unread > 0) { badge.textContent = data.unread; badge.style.display = ''; }
  else badge.style.display = 'none';
}

/* ── Plan de Gobierno ───────────────────────────────────────────────────── */
async function loadPlan() {
  const data = await api('GET', '/plan');
  const info = document.getElementById('planCurrentInfo');
  if (data) {
    info.style.display = 'flex';
    document.getElementById('planFilename').textContent = '📄 ' + data.filename;
    document.getElementById('planDate').textContent     = 'Subido: ' + formatDate(data.uploaded_at);
    document.getElementById('planChars').textContent    = `Contenido: ${data.chars.toLocaleString()} caracteres`;
    document.getElementById('planPreview').textContent  = data.preview + '…';
  } else {
    info.style.display = 'none';
  }
}

// File upload tab
const planFile     = document.getElementById('planFile');
const uploadPlanBtn = document.getElementById('uploadPlanBtn');
const fileDrop     = document.getElementById('fileDrop');

planFile.addEventListener('change', () => {
  const f = planFile.files[0];
  document.getElementById('fileName').textContent = f ? '📎 ' + f.name : '';
  uploadPlanBtn.disabled = !f;
});

['dragover','dragleave','drop'].forEach(evt =>
  fileDrop.addEventListener(evt, e => {
    e.preventDefault();
    if (evt === 'dragover') fileDrop.classList.add('dragover');
    else fileDrop.classList.remove('dragover');
    if (evt === 'drop') {
      const f = e.dataTransfer.files[0];
      if (f) {
        planFile.files = e.dataTransfer.files;
        document.getElementById('fileName').textContent = '📎 ' + f.name;
        uploadPlanBtn.disabled = false;
      }
    }
  })
);
fileDrop.addEventListener('click', () => planFile.click());

document.getElementById('planFileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const status = document.getElementById('planStatus');
  const f = planFile.files[0];
  if (!f) return;
  uploadPlanBtn.disabled = true;
  uploadPlanBtn.textContent = 'Subiendo…';
  const fd = new FormData();
  fd.append('file', f);
  const data = await api('POST', '/plan', fd, true);
  uploadPlanBtn.disabled = false;
  uploadPlanBtn.textContent = 'Subir Plan';
  if (data?.success) {
    setStatus('planStatus', `✅ Plan cargado (${data.chars.toLocaleString()} caracteres)`, 'green');
    loadPlan(); loadStats();
    planFile.value = '';
    document.getElementById('fileName').textContent = '';
  } else {
    setStatus('planStatus', '❌ ' + (data?.error || 'Error al subir'), 'red');
  }
});

document.getElementById('planTextForm').addEventListener('submit', async e => {
  e.preventDefault();
  const content = document.getElementById('planTextArea').value.trim();
  if (!content) return;
  const data = await api('POST', '/plan', { content });
  if (data?.success) {
    setStatus('planStatus', `✅ Plan guardado (${data.chars.toLocaleString()} caracteres)`, 'green');
    document.getElementById('planTextArea').value = '';
    loadPlan(); loadStats();
  } else {
    setStatus('planStatus', '❌ ' + (data?.error || 'Error'), 'red');
  }
});

document.getElementById('deletePlanBtn').addEventListener('click', async () => {
  if (!confirm('¿Eliminar el plan de gobierno actual?')) return;
  await api('DELETE', '/plan');
  loadPlan(); loadStats();
});

// Tabs
document.querySelectorAll('.tab').forEach(tab =>
  tab.addEventListener('click', () => {
    const t = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + t)?.classList.add('active');
  })
);

/* ── Noticias ───────────────────────────────────────────────────────────── */
let editingNewsId = null;

async function loadNews() {
  const list = document.getElementById('newsList');
  list.innerHTML = '<div class="loading-msg">Cargando…</div>';
  const data = await api('GET', '/news');
  if (!data?.length) { list.innerHTML = '<div class="empty-msg">No hay noticias. Crea la primera.</div>'; return; }
  list.innerHTML = data.map(n => `
    <div class="list-item">
      ${n.image_url ? `<img src="${esc(n.image_url)}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.display='none'"/>` : ''}
      <div class="list-item-body">
        <strong>${esc(n.title)}</strong>
        <p>${esc(n.excerpt || n.content.slice(0,100))}</p>
      </div>
      <div class="list-item-meta">${formatDate(n.created_at)}</div>
      <span class="status-chip ${n.published ? 'chip-pub' : 'chip-draft'}">${n.published ? 'Publicado' : 'Borrador'}</span>
      <div class="list-actions">
        <button onclick="editNews(${n.id})">Editar</button>
        <button class="btn-del" onclick="deleteNews(${n.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('newNewsBtn').addEventListener('click', () => {
  editingNewsId = null;
  document.getElementById('newsFormTitle').textContent = 'Nueva Noticia';
  document.getElementById('newsForm').reset();
  document.getElementById('newsId').value = '';
  document.getElementById('newsFormCard').style.display = '';
  document.getElementById('newsFormCard').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('cancelNewsBtn').addEventListener('click', () => {
  document.getElementById('newsFormCard').style.display = 'none';
  editingNewsId = null;
});

async function editNews(id) {
  const all  = await api('GET', '/news');
  const item = all.find(x => x.id === id);
  if (!item) return;
  editingNewsId = id;
  document.getElementById('newsFormTitle').textContent = 'Editar Noticia';
  document.getElementById('newsId').value       = id;
  document.getElementById('newsTitle').value    = item.title;
  document.getElementById('newsExcerpt').value  = item.excerpt || '';
  document.getElementById('newsContent').value  = item.content;
  document.getElementById('newsImage').value    = item.image_url || '';
  document.getElementById('newsPublished').value = item.published ? '1' : '0';
  document.getElementById('newsFormCard').style.display = '';
  document.getElementById('newsFormCard').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('newsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    title:     document.getElementById('newsTitle').value,
    excerpt:   document.getElementById('newsExcerpt').value,
    content:   document.getElementById('newsContent').value,
    image_url: document.getElementById('newsImage').value,
    published: document.getElementById('newsPublished').value === '1'
  };
  let data;
  if (editingNewsId) {
    data = await api('PUT', '/news/' + editingNewsId, body);
  } else {
    data = await api('POST', '/news', body);
  }
  if (data?.success) {
    setStatus('newsFormStatus', '✅ Guardado correctamente', 'green');
    setTimeout(() => {
      document.getElementById('newsFormCard').style.display = 'none';
      editingNewsId = null;
      loadNews();
    }, 800);
  } else {
    setStatus('newsFormStatus', '❌ ' + (data?.error || 'Error'), 'red');
  }
});

async function deleteNews(id) {
  if (!confirm('¿Eliminar esta noticia?')) return;
  await api('DELETE', '/news/' + id);
  loadNews();
}

/* ── Videos ────────────────────────────────────────────────────────────── */
let editingVideoId = null;

async function loadVideos() {
  const list = document.getElementById('videosList');
  list.innerHTML = '<div class="loading-msg">Cargando…</div>';
  const data = await api('GET', '/videos');
  if (!data?.length) { list.innerHTML = '<div class="empty-msg">No hay videos. Agrega el primero.</div>'; return; }
  list.innerHTML = data.map(v => `
    <div class="list-item">
      <img src="https://img.youtube.com/vi/${esc(v.youtube_id)}/mqdefault.jpg"
           style="width:80px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0"/>
      <div class="list-item-body">
        <strong>${esc(v.title)}</strong>
        <p>youtube.com/watch?v=${esc(v.youtube_id)}</p>
      </div>
      <div class="list-item-meta">${formatDate(v.created_at)}</div>
      <span class="status-chip ${v.published ? 'chip-pub' : 'chip-draft'}">${v.published ? 'Publicado' : 'Oculto'}</span>
      <div class="list-actions">
        <button onclick="editVideo(${v.id})">Editar</button>
        <button class="btn-del" onclick="deleteVideo(${v.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('newVideoBtn').addEventListener('click', () => {
  editingVideoId = null;
  document.getElementById('videoFormTitle').textContent = 'Nuevo Video';
  document.getElementById('videoForm').reset();
  document.getElementById('videoId').value = '';
  document.getElementById('videoFormCard').style.display = '';
  document.getElementById('videoFormCard').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('cancelVideoBtn').addEventListener('click', () => {
  document.getElementById('videoFormCard').style.display = 'none';
  editingVideoId = null;
});

async function editVideo(id) {
  const all  = await api('GET', '/videos');
  const item = all.find(x => x.id === id);
  if (!item) return;
  editingVideoId = id;
  document.getElementById('videoFormTitle').textContent = 'Editar Video';
  document.getElementById('videoId').value        = id;
  document.getElementById('videoTitle').value     = item.title;
  document.getElementById('videoUrl').value       = 'https://www.youtube.com/watch?v=' + item.youtube_id;
  document.getElementById('videoDesc').value      = item.description || '';
  document.getElementById('videoPublished').value = item.published ? '1' : '0';
  document.getElementById('videoFormCard').style.display = '';
  document.getElementById('videoFormCard').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('videoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    title:       document.getElementById('videoTitle').value,
    youtube_url: document.getElementById('videoUrl').value,
    description: document.getElementById('videoDesc').value,
    published:   document.getElementById('videoPublished').value === '1'
  };
  let data;
  if (editingVideoId) {
    data = await api('PUT', '/videos/' + editingVideoId, body);
  } else {
    data = await api('POST', '/videos', body);
  }
  if (data?.success) {
    setStatus('videoFormStatus', '✅ Guardado correctamente', 'green');
    setTimeout(() => {
      document.getElementById('videoFormCard').style.display = 'none';
      editingVideoId = null;
      loadVideos();
    }, 800);
  } else {
    setStatus('videoFormStatus', '❌ ' + (data?.error || 'Error'), 'red');
  }
});

async function deleteVideo(id) {
  if (!confirm('¿Eliminar este video?')) return;
  await api('DELETE', '/videos/' + id);
  loadVideos();
}

/* ── Contactos ──────────────────────────────────────────────────────────── */
async function loadContacts() {
  const list = document.getElementById('contactsList');
  list.innerHTML = '<div class="loading-msg">Cargando…</div>';
  const data = await api('GET', '/contacts');
  if (!data?.length) { list.innerHTML = '<div class="empty-msg">No hay mensajes de contacto todavía.</div>'; return; }
  list.innerHTML = data.map(c => `
    <div class="contact-item ${c.read ? '' : 'unread'}" id="contact-${c.id}">
      <div class="contact-header">
        ${!c.read ? '<div class="unread-dot"></div>' : ''}
        <strong>${esc(c.name)}</strong>
        ${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}
        ${c.phone ? `<span>📱 ${esc(c.phone)}</span>` : ''}
        <small>${formatDate(c.created_at)}</small>
      </div>
      <div class="contact-msg">${esc(c.message)}</div>
      <div class="contact-footer">
        ${!c.read ? `<button class="btn-secondary" style="font-size:.75rem;padding:4px 12px" onclick="markRead(${c.id})">Marcar leído</button>` : '<span style="font-size:.75rem;color:#64748b">✓ Leído</span>'}
        <button class="btn-danger-sm" style="margin-left:auto" onclick="deleteContact(${c.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

async function markRead(id) {
  await api('PUT', '/contacts/' + id + '/read');
  document.getElementById('contact-' + id)?.classList.remove('unread');
  document.querySelector(`#contact-${id} .unread-dot`)?.remove();
  document.querySelector(`#contact-${id} button[onclick*="markRead"]`)?.replaceWith(
    Object.assign(document.createElement('span'), { textContent: '✓ Leído', style: 'font-size:.75rem;color:#64748b' })
  );
  loadStats();
}

async function deleteContact(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  await api('DELETE', '/contacts/' + id);
  loadContacts(); loadStats();
}

/* ── Utils ──────────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
}

function setStatus(id, msg, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = color === 'green' ? '#15803d' : '#c0392b';
  setTimeout(() => { el.textContent = ''; }, 5000);
}

/* ── Init ───────────────────────────────────────────────────────────────── */
checkAuth();
