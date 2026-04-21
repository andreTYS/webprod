require('dotenv').config();
const express = require('express');
const path    = require('path');
const { initDb } = require('./utils/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Admin panel static files (before API routes)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// API
app.use('/api',       require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));

// Public site
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

initDb();
app.listen(PORT, () => {
  console.log(`✅  Servidor corriendo → http://localhost:${PORT}`);
  console.log(`📋  Panel admin      → http://localhost:${PORT}/admin`);
});
