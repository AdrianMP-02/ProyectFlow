/**
 * Controlador para autenticación de usuarios
 * @module usuarioAuth
 */
const { getPool } = require('../../config/database');
const { validarEmail, compararPassword, hashPassword } = require('./usuarioUtils');

/**
 * Procesa el inicio de sesión de un usuario
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validación básica
  if (!email || !password) {
    // Renderiza la vista principal con el error para mostrarlo en el modal
    return res.status(400).render('index', { loginError: 'Correo y contraseña son requeridos' });
  }

  try {
    const pool = await getPool();

    // Buscar usuario por email
    const [users] = await pool.query(
      'SELECT id, nombre, email, password FROM usuarios WHERE email = ?',
      [email]
    );

    // Verificar si existe el usuario
    if (users.length === 0) {
      return res.status(401).render('index', { loginError: 'Credenciales invalidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const validPassword = await compararPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).render('index', { loginError: 'Credenciales invalidas' });
    }

    // Establecer la sesión
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.nombre;

    // Redirigir al dashboard
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).render('index', { loginError: 'Error del servidor al iniciar sesión' });
  }
};

/**
 * Registra un nuevo usuario
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const register = async (req, res) => {
  const { nombre, email, password, confirmarPassword } = req.body;

  // Validación básica
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  // Validar que las contraseñas coinciden
  if (password !== confirmarPassword) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }

  // Validar formato de email
  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'El formato del email es inválido' });
  }

  try {
    const pool = await getPool();

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Insertar nuevo usuario
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre, email, hashedPassword]
    );

    // Establecer la sesión
    req.session.userId = result.insertId;
    req.session.userEmail = email;
    req.session.userName = nombre;

    // Redirigir al dashboard
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar usuario' });
  }
};

/**
 * Cierra la sesión de un usuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    return res.redirect('/');
  });
};

module.exports = {
  login,
  register,
  logout
};