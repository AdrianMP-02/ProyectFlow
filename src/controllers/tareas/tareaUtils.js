/**
 * Utilidades para el manejo de tareas
 * @module tareaUtils
 */
const { getPool } = require('../../config/database');

/**
 * Verifica si un usuario pertenece a un proyecto
 * @async
 * @param {number} usuarioId - ID del usuario
 * @param {number} proyectoId - ID del proyecto
 * @param {Object} pool - Conexión a la base de datos
 * @returns {Promise<boolean>} - True si el usuario pertenece al proyecto
 */
const verificarUsuarioEnProyecto = async (usuarioId, proyectoId, pool) => {
  const [pertenece] = await pool.query(
    'SELECT 1 FROM usuario_proyecto WHERE usuario_id = ? AND proyecto_id = ?',
    [usuarioId, proyectoId]
  );
  return pertenece.length > 0;
};

/**
 * Formatea un estado para mostrar (ej: "en_progreso" -> "En Progreso")
 * @param {string} estado - Estado en formato de base de datos
 * @returns {string} - Estado formateado
 */
const formatearEstado = (estado) => {
  return estado.replace(/_/g, ' ')
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

/**
 * Formatea una fecha para mostrar
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} - Fecha formateada (ej: "15 mar 2023")
 */
const formatearFecha = (fecha) => {
  if (!fecha) return 'no definida';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Registra una actividad usando una conexión específica (para transacciones)
 * @async
 * @param {Object} connection - Conexión a la base de datos
 * @param {number} tareaId - ID de la tarea
 * @param {number} usuarioId - ID del usuario
 * @param {string} tipo - Tipo de actividad
 * @param {string} descripcion - Descripción de la actividad
 */
const registrarActividadConConexion = async (connection, tareaId, usuarioId, tipo, descripcion) => {
  await connection.query(
    `INSERT INTO actividades_tarea 
     (tarea_id, usuario_id, tipo_actividad, descripcion) 
     VALUES (?, ?, ?, ?)`,
    [tareaId, usuarioId, tipo, descripcion]
  );
};

module.exports = {
  verificarUsuarioEnProyecto,
  formatearEstado,
  formatearFecha,
  registrarActividadConConexion
};