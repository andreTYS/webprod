const express   = require('express');
const router    = express.Router();
const { db }    = require('../utils/db');
const Anthropic = require('@anthropic-ai/sdk');

let client;
try {
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} catch (_) { /* key not set at startup; handled per-request */ }

// ── Noticias públicas ──────────────────────────────────────────────────────
router.get('/news', (_req, res) => {
  const rows = db.prepare(
    `SELECT id, title, excerpt, image_url, created_at
     FROM news WHERE published=1 ORDER BY created_at DESC`
  ).all();
  res.json(rows);
});

router.get('/news/:id', (req, res) => {
  const row = db.prepare(
    `SELECT * FROM news WHERE id=? AND published=1`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Noticia no encontrada' });
  res.json(row);
});

// ── Videos públicos ────────────────────────────────────────────────────────
router.get('/videos', (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM videos WHERE published=1 ORDER BY created_at DESC`
  ).all();
  res.json(rows);
});

// ── Formulario de contacto ─────────────────────────────────────────────────
router.post('/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !message)
    return res.status(400).json({ error: 'Nombre y mensaje son requeridos' });

  db.prepare(
    `INSERT INTO contacts (name, email, phone, message) VALUES (?,?,?,?)`
  ).run(
    String(name).slice(0, 200),
    String(email || '').slice(0, 200),
    String(phone || '').slice(0, 50),
    String(message).slice(0, 2000)
  );
  res.json({ success: true, message: 'Mensaje enviado. ¡Gracias por contactarnos!' });
});

// ── Chatbot ────────────────────────────────────────────────────────────────
router.post('/chatbot', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message || typeof message !== 'string')
    return res.status(400).json({ error: 'Mensaje requerido' });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(503).json({
      error: 'El chatbot aún no está configurado. Configura ANTHROPIC_API_KEY en el servidor.'
    });

  const safeMsg = String(message).slice(0, 1000);

  const plan = db.prepare(
    `SELECT content FROM government_plan ORDER BY id DESC LIMIT 1`
  ).get();

  const systemPrompt = `Eres el asistente virtual oficial de KAUSACHUN, movimiento político de Jaime Rodriguez Villanueva, candidato a Gobernador Regional de Moquegua, Perú.

Tu misión: informar a los ciudadanos moqueguanos sobre el candidato, el movimiento y el plan de gobierno de forma clara, positiva y cercana.

${plan
  ? `=== PLAN DE GOBIERNO ===\n${plan.content}\n=== FIN DEL PLAN ===`
  : 'El plan de gobierno completo se está cargando. Por ahora puedes mencionar que incluye propuestas concretas para minería responsable, agricultura, turismo, educación y salud en la Región Moquegua.'
}

REGLAS:
- Responde siempre en español peruano, tono optimista y cercano.
- Máximo 180 palabras por respuesta.
- Si te preguntan algo ajeno a Kausachun/Moquegua/el candidato, redirige amablemente.
- No inventes datos fuera del plan de gobierno.
- Invita a la participación ciudadana cuando sea natural.`;

  const messages = [
    ...history.slice(-8).map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 800)
    })),
    { role: 'user', content: safeMsg }
  ];

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     systemPrompt,
      messages
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ error: 'Error al procesar tu consulta. Intenta nuevamente.' });
  }
});

module.exports = router;
