/**
 * Controlador para la gestión de perfiles de usuario
 * @module usuarioPerfil
 */
const { getPool } = require('../../config/database');
const { compararPassword, hashPassword, obtenerEstadisticasUsuario } = require('./usuarioUtils');

/**
 * Obtiene información del perfil de usuario
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerPerfil = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/?mensaje=session_expired');
    }

    const pool = await getPool();

    // Obtener datos del usuario
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email, created_at FROM usuarios WHERE id = ?',
      [userId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    // Obtener estadísticas del usuario
    const estadisticas = await obtenerEstadisticasUsuario(pool, userId);

    return res.render('usuarios/perfil', {
      usuario,
      estadisticas
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener perfil' });
  }
};

/**
 * Actualiza la información del perfil de usuario
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const actualizarPerfil = async (req, res) => {
  const userId = req.session.userId;
  const { nombre, email, passwordActual, nuevaPassword } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const pool = await getPool();

    // Verificar si el usuario existe
    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [userId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    // Si se quiere cambiar la contraseña, verificar la actual
    if (nuevaPassword) {
      if (!passwordActual) {
        return res.status(400).json({ error: 'Debes proporcionar tu contraseña actual' });
      }

      const validPassword = await compararPassword(passwordActual, usuario.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }

      // Actualizar nombre, email y contraseña
      const hashedPassword = await hashPassword(nuevaPassword);
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ?, password = ? WHERE id = ?',
        [nombre, email, hashedPassword, userId]
      );
    } else {
      // Actualizar solo nombre y email
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?',
        [nombre, email, userId]
      );
    }

    // Actualizar sesión
    req.session.userEmail = email;
    req.session.userName = nombre;

    return res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'Error del servidor al actualizar perfil' });
  }
};

module.exports = {
  obtenerPerfil,
  actualizarPerfil
};