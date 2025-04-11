const connection = require('../config/database');
const pool = require('../config/database');

const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
};

const requireProjectAdmin = (req, res, next) => {
  const proyectoId = req.params.id;
  const userId = req.session.userId;

  const query = `
    SELECT rol 
    FROM usuario_proyecto 
    WHERE usuario_id = ? AND proyecto_id = ?
  `;

  connection.query(query, [userId, proyectoId], (error, results) => {
    if (error || results.length === 0 || results[0].rol !== 'admin') {
      return res.status(403).send('Acceso denegado');
    }
    next();
  });
};

const isAuthenticated = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }

  try {
    const [users] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.redirect('/');
    }

    req.session.usuario = users[0];
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).send('Error de autenticación');
  }
};

module.exports = {
  requireLogin,
  requireProjectAdmin,
  isAuthenticated
};
