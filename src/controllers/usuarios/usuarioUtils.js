/**
 * Utilidades para la gestión de usuarios
 * @module usuarioUtils
 */
const bcrypt = require('bcrypt');

/**
 * Valida el formato de un email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si el email tiene un formato válido
 */
const validarEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Compara una contraseña en texto plano con un hash
 * @async
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Hash de la contraseña almacenada
 * @returns {Promise<boolean>} - True si la contraseña coincide
 */
const compararPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Genera el hash de una contraseña
 * @async
 * @param {string} password - Contraseña en texto plano
 * @param {number} saltRounds - Rondas de salt para bcrypt (por defecto 10)
 * @returns {Promise<string>} - Hash de la contraseña
 */
const hashPassword = async (password, saltRounds = 10) => {
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Obtiene estadísticas de un usuario
 * @async
 * @param {Object} pool - Conexión a la base de datos
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} - Estadísticas del usuario
 */
const obtenerEstadisticasUsuario = async (pool, userId) => {
  const [estadisticas] = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM tareas t
       INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id
       WHERE ut.usuario_id = ?) as total_tareas,
      (SELECT COUNT(*) FROM tareas t
       INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id
       WHERE ut.usuario_id = ? AND t.estado = 'completado') as tareas_completadas,
      (SELECT COUNT(*) FROM usuario_proyecto WHERE usuario_id = ?) as total_proyectos
  `, [userId, userId, userId]);

  return estadisticas[0];
};

module.exports = {
  validarEmail,
  compararPassword,
  hashPassword,
  obtenerEstadisticasUsuario
};