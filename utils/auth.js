const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.admin = jwt.verify(
      auth.split(' ')[1],
      process.env.JWT_SECRET || 'kausachun-jwt-secret-2025'
    );
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada, vuelve a iniciar sesión' });
  }
}

module.exports = { requireAuth };
