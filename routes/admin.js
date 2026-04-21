const express     = require('express');
const router      = express.Router();
const jwt         = require('jsonwebtoken');
const multer      = require('multer');
const { db }      = require('../utils/db');
const { requireAuth } = require('../utils/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 30 * 1024 * 1024 }
});

// ── Auth ───────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPwd = process.env.ADMIN_PASSWORD || 'kausachun2025';
  if (password !== adminPwd)
    return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET || 'kausachun-jwt-secret-2025',
    { expiresIn: '12h' }
  );
  res.json({ token });
});

router.get('/me', requireAuth, (_req, res) => res.json({ ok: true }));

// ── Plan de Gobierno ───────────────────────────────────────────────────────
router.post('/plan', requireAuth, upload.single('file'), async (req, res) => {
  try {
    let content = '', filename = '';

    if (req.file) {
      filename = req.file.originalname;
      if (req.file.mimetype === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(req.file.buffer);
        content = data.text;
      } else {
        content = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.content) {
      content  = String(req.body.content);
      filename = 'plan-manual.txt';
    } else {
      return res.status(400).json({ error: 'Se requiere un archivo o texto del plan' });
    }

    db.prepare('DELETE FROM government_plan').run();
    db.prepare(
      `INSERT INTO government_plan (filename, content) VALUES (?,?)`
    ).run(filename, content);

    res.json({ success: true, chars: content.length });
  } catch (err) {
    console.error('Plan upload error:', err);
    res.status(500).json({ error: 'Error al procesar el archivo: ' + err.message });
  }
});

router.get('/plan', requireAuth, (_req, res) => {
  const row = db.prepare(
    `SELECT id, filename, uploaded_at,
            length(content) as chars,
            substr(content,1,600) as preview
     FROM government_plan ORDER BY id DESC LIMIT 1`
  ).get();
  res.json(row || null);
});

router.delete('/plan', requireAuth, (_req, res) => {
  db.prepare('DELETE FROM government_plan').run();
  res.json({ success: true });
});

// ── Noticias ───────────────────────────────────────────────────────────────
router.get('/news', requireAuth, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM news ORDER BY created_at DESC`).all());
});

router.post('/news', requireAuth, (req, res) => {
  const { title, excerpt, content, image_url, published } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: 'Título y contenido son requeridos' });

  const r = db.prepare(
    `INSERT INTO news (title,excerpt,content,image_url,published) VALUES (?,?,?,?,?)`
  ).run(title, excerpt || '', content, image_url || '', published ? 1 : 0);
  res.json({ success: true, id: r.lastInsertRowid });
});

router.put('/news/:id', requireAuth, (req, res) => {
  const { title, excerpt, content, image_url, published } = req.body;
  db.prepare(
    `UPDATE news SET title=?,excerpt=?,content=?,image_url=?,published=?,
     updated_at=datetime('now','localtime') WHERE id=?`
  ).run(title, excerpt || '', content, image_url || '', published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/news/:id', requireAuth, (req, res) => {
  db.prepare(`DELETE FROM news WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ── Videos ─────────────────────────────────────────────────────────────────
function extractYtId(url) {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return m ? m[1] : url.trim();
}

router.get('/videos', requireAuth, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM videos ORDER BY created_at DESC`).all());
});

router.post('/videos', requireAuth, (req, res) => {
  const { title, description, youtube_url, published } = req.body;
  if (!title || !youtube_url)
    return res.status(400).json({ error: 'Título y URL de YouTube son requeridos' });

  const r = db.prepare(
    `INSERT INTO videos (title,description,youtube_id,published) VALUES (?,?,?,?)`
  ).run(title, description || '', extractYtId(youtube_url), published ? 1 : 0);
  res.json({ success: true, id: r.lastInsertRowid });
});

router.put('/videos/:id', requireAuth, (req, res) => {
  const { title, description, youtube_url, published } = req.body;
  db.prepare(
    `UPDATE videos SET title=?,description=?,youtube_id=?,published=? WHERE id=?`
  ).run(title, description || '', extractYtId(youtube_url), published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/videos/:id', requireAuth, (req, res) => {
  db.prepare(`DELETE FROM videos WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ── Contactos ──────────────────────────────────────────────────────────────
router.get('/contacts', requireAuth, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM contacts ORDER BY created_at DESC`).all());
});

router.put('/contacts/:id/read', requireAuth, (req, res) => {
  db.prepare(`UPDATE contacts SET read=1 WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

router.delete('/contacts/:id', requireAuth, (req, res) => {
  db.prepare(`DELETE FROM contacts WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ── Dashboard stats ────────────────────────────────────────────────────────
router.get('/stats', requireAuth, (_req, res) => {
  res.json({
    news:          db.prepare(`SELECT COUNT(*) c FROM news`).get().c,
    videos:        db.prepare(`SELECT COUNT(*) c FROM videos`).get().c,
    contacts:      db.prepare(`SELECT COUNT(*) c FROM contacts`).get().c,
    unread:        db.prepare(`SELECT COUNT(*) c FROM contacts WHERE read=0`).get().c,
    hasPlan: !!db.prepare(`SELECT id FROM government_plan LIMIT 1`).get()
  });
});

module.exports = router;
