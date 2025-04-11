/**
 * Controlador para renderizar vistas relacionadas con usuarios
 * @module usuarioVistas
 */

/**
 * Renderiza la página de inicio de sesión
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const mostrarLogin = (req, res) => {
  // Verificar si hay un mensaje de error o redirección en la query
  const mensaje = req.query.mensaje || null;
  res.render('index', {
    layout: false,
    mensaje
  });
};

/**
 * Renderiza la página de registro
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const mostrarRegistro = (req, res) => {
  res.render('auth/registro', { layout: false });
};

module.exports = {
  mostrarLogin,
  mostrarRegistro
};