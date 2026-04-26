/* ── Navbar scroll ────────────────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ── Mobile nav toggle ────────────────────────────────────────────────── */
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () =>
    document.getElementById('navLinks').classList.remove('open')
  )
);

/* ── News ─────────────────────────────────────────────────────────────── */
async function loadNews() {
  const grid = document.getElementById('newsGrid');
  try {
    const res  = await fetch('/api/news.php');
    const data = await res.json();
    if (!data.length) {
      grid.innerHTML = '<div class="empty-state">Pronto publicaremos noticias del movimiento.</div>';
      return;
    }
    grid.innerHTML = data.map(n => `
      <article class="news-card" onclick="openNewsModal(${n.id})">
        ${n.image_url
          ? `<img class="news-card-img" src="${escHtml(n.image_url)}" alt="${escHtml(n.title)}" onerror="this.className='news-card-img placeholder';this.innerHTML='📰'"/>`
          : `<div class="news-card-img placeholder">📰</div>`}
        <div class="news-card-body">
          <p class="news-card-date">${formatDate(n.created_at)}</p>
          <h3>${escHtml(n.title)}</h3>
          <p>${escHtml(n.excerpt || '')}</p>
        </div>
      </article>
    `).join('');
  } catch {
    grid.innerHTML = '<div class="empty-state">No se pudieron cargar las noticias.</div>';
  }
}

async function openNewsModal(id) {
  try {
    const res  = await fetch(`/api/news.php?id=${id}`);
    const n    = await res.json();
    const modal = document.getElementById('newsModal');
    const img   = document.getElementById('modalImg');
    if (n.image_url) {
      img.src = n.image_url; img.alt = n.title; img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
    document.getElementById('modalDate').textContent    = formatDate(n.created_at);
    document.getElementById('modalTitle').textContent   = n.title;
    document.getElementById('modalContent').textContent = n.content;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch { /* ignore */ }
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('newsModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
function closeModal() {
  document.getElementById('newsModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Videos ───────────────────────────────────────────────────────────── */
async function loadVideos() {
  const grid = document.getElementById('videosGrid');
  try {
    const res  = await fetch('/api/videos.php');
    const data = await res.json();
    if (!data.length) {
      grid.innerHTML = '<div class="empty-state">Pronto publicaremos videos del movimiento.</div>';
      return;
    }
    grid.innerHTML = data.map(v => `
      <div class="video-card">
        <div class="video-embed">
          <iframe
            src="https://www.youtube.com/embed/${escHtml(v.youtube_id)}"
            title="${escHtml(v.title)}"
            allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
        <div class="video-card-body">
          <h3>${escHtml(v.title)}</h3>
          ${v.description ? `<p>${escHtml(v.description)}</p>` : ''}
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<div class="empty-state">No se pudieron cargar los videos.</div>';
  }
}

/* ── Contact form ─────────────────────────────────────────────────────── */
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form   = e.target;
  const status = document.getElementById('formStatus');
  const btn    = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  const body = {
    name:    form.name.value,
    email:   form.email.value,
    phone:   form.phone.value,
    message: form.message.value
  };

  try {
    const res  = await fetch('/api/contact.php', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      status.style.color = '#1e7a4a';
      status.textContent = '✅ ' + data.message;
      form.reset();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    status.style.color = '#c0392b';
    status.textContent = '❌ ' + (err.message || 'Error al enviar. Inténtalo de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Mensaje';
  }
});

/* ── Chatbot ──────────────────────────────────────────────────────────── */
const chatHistory   = [];
const chatWindow    = document.getElementById('chatWindow');
const chatFab       = document.getElementById('chatFab');
const chatMessages  = document.getElementById('chatMessages');
const chatInput     = document.getElementById('chatInput');
const fabChat       = document.getElementById('fabIconChat');
const fabClose      = document.getElementById('fabIconClose');
const chatBadge     = document.getElementById('chatBadge');
let   chatOpen      = false;
let   showedBadge   = false;

function toggleChat() {
  chatOpen = !chatOpen;
  chatWindow.classList.toggle('open', chatOpen);
  fabChat.style.display  = chatOpen ? 'none'  : '';
  fabClose.style.display = chatOpen ? ''      : 'none';
  chatBadge.style.display = 'none';
  if (chatOpen) {
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

chatFab.addEventListener('click', toggleChat);
document.getElementById('chatClose').addEventListener('click', toggleChat);
document.getElementById('openChatFromPlan').addEventListener('click', () => {
  if (!chatOpen) toggleChat();
  document.getElementById('chatWidget').scrollIntoView({behavior:'smooth'});
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
});
document.getElementById('chatSend').addEventListener('click', sendChatMessage);

async function sendChatMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = '';

  appendMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });

  const typingId = appendTyping();

  try {
    const res = await fetch('/api/chatbot.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory.slice(-8) })
    });
    const data = await res.json();
    removeTyping(typingId);

    const reply = res.ok ? data.reply : (data.error || 'Error al procesar tu consulta.');
    appendMsg('bot', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch {
    removeTyping(typingId);
    appendMsg('bot', 'Lo siento, ocurrió un error. Por favor intenta nuevamente.');
  }
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${escHtml(text).replace(/\n/g,'<br/>')}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (role === 'bot' && !chatOpen && !showedBadge) {
    chatBadge.style.display = 'flex';
    showedBadge = true;
  }
  return div;
}

function appendTyping() {
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = id;
  div.innerHTML = `<div class="msg-bubble msg-typing">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
  </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

/* ── Utils ────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { year:'numeric', month:'long', day:'numeric' });
}

/* ── Init ─────────────────────────────────────────────────────────────── */
loadNews();
loadVideos();

// Show chat badge after 8s to invite interaction
setTimeout(() => {
  if (!chatOpen && !showedBadge) {
    chatBadge.style.display = 'flex';
    showedBadge = true;
  }
}, 8000);
