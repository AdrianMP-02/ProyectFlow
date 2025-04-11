const { getPool } = require('../config/database');

// Middleware para cargar datos del usuario
const loadUserData = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const [users] = await req.dbPool.query(
        'SELECT id, nombre, email FROM usuarios WHERE id = ?',
        [req.session.userId]
      );

      if (users && users[0]) {
        // Guardar usuario tanto en res.locals como en req.session
        res.locals.usuario = users[0];
        req.session.usuario = users[0];
      }
      next();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      next();
    }
  } else {
    next();
  }
};

// Middleware para añadir el usuario a todas las vistas
const addUserToViews = (req, res, next) => {
  const oldRender = res.render;

  res.render = function (view, options, callback) {
    options = options || {};

    // Verificar usuario de múltiples fuentes
    if (!options.usuario) {
      if (res.locals.usuario) {
        options.usuario = res.locals.usuario;
      } else if (req.session && req.session.usuario) {
        options.usuario = req.session.usuario;
      }
    } else {
      // Si options.usuario no tiene nombre pero hay información en locals o session
      if ((!options.usuario.nombre) && res.locals.usuario && res.locals.usuario.nombre) {
        options.usuario = res.locals.usuario;
      } else if ((!options.usuario.nombre) && req.session && req.session.usuario && req.session.usuario.nombre) {
        options.usuario = req.session.usuario;
      }
    }

    // Añadir el rol si no está definido
    if (!options.rol && req.session && req.session.rol) {
      options.rol = req.session.rol;
    }

    // Llamar al método render original con las opciones actualizadas
    oldRender.call(this, view, options, callback);
  };

  next();
};

// Middleware de autenticación
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
};

module.exports = {
  loadUserData,
  addUserToViews,
  requireLogin
};