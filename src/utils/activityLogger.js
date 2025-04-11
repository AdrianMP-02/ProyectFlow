/**
 * Utilidad para registrar actividades en las tareas
 */
const { getPool } = require('../config/database');

/**
 * Registra una actividad relacionada con una tarea
 * @param {number} tareaId - ID de la tarea
 * @param {number} usuarioId - ID del usuario que realizó la acción
 * @param {string} tipoActividad - Tipo de actividad (creacion, cambio_estado, etc.)
 * @param {string} descripcion - Descripción de la actividad
 */
const registrarActividad = async (tareaId, usuarioId, tipoActividad, descripcion) => {
  try {
    const pool = await getPool();
    await pool.query(
      'INSERT INTO actividades_tarea (tarea_id, usuario_id, tipo_actividad, descripcion) VALUES (?, ?, ?, ?)',
      [tareaId, usuarioId, tipoActividad, descripcion]
    );
  } catch (error) {
    console.error('Error al registrar actividad:', error);
  }
};

module.exports = {
  registrarActividad
};