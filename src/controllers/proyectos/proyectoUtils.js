/**
 * Utilidades para la gestión de proyectos
 * @module proyectoUtils
 */
const { getPool } = require('../../config/database');
const AppError = require('../../utils/appError');

/**
 * Obtiene todos los proyectos de un usuario
 * @async
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Array de proyectos
 */
const obtenerProyectos = async (usuarioId) => {
  try {
    const pool = await getPool();
    const [proyectos] = await pool.query(`
      SELECT p.*, up.rol as rol_usuario 
      FROM proyectos p
      INNER JOIN usuario_proyecto up ON p.id = up.proyecto_id
      WHERE up.usuario_id = ?
      ORDER BY p.created_at DESC
    `, [usuarioId]);

    return proyectos;
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return [];
  }
};

/**
 * Verifica si un usuario tiene permisos para una acción en un proyecto
 * @async
 * @param {number} usuarioId - ID del usuario
 * @param {number} proyectoId - ID del proyecto
 * @param {Array<string>} rolesPermitidos - Roles permitidos para la acción
 * @returns {Promise<{autorizado: boolean, rol: string, error: AppError|null}>}
 */
const verificarPermisos = async (usuarioId, proyectoId, rolesPermitidos = ['admin', 'editor']) => {
  try {
    const pool = await getPool();
    
    // Verificar si el proyecto existe
    const [proyectos] = await pool.query('SELECT * FROM proyectos WHERE id = ?', [proyectoId]);
    
    if (proyectos.length === 0) {
      return {
        autorizado: false,
        rol: null,
        error: new AppError('Proyecto no encontrado', 404)
      };
    }
    
    // Verificar si el usuario pertenece al proyecto
    const [permisos] = await pool.query(
      'SELECT up.rol FROM usuario_proyecto up WHERE up.usuario_id = ? AND up.proyecto_id = ?',
      [usuarioId, proyectoId]
    );
    
    if (permisos.length === 0) {
      return {
        autorizado: false,
        rol: null,
        error: new AppError('No tienes acceso a este proyecto', 403)
      };
    }
    
    const rol = permisos[0].rol;
    const autorizado = rolesPermitidos.includes(rol);
    
    return {
      autorizado,
      rol,
      error: autorizado ? null : new AppError(`No tienes permisos para esta acción (${rol})`, 403)
    };
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    return {
      autorizado: false,
      rol: null,
      error: new AppError('Error al verificar permisos', 500)
    };
  }
};

module.exports = {
  obtenerProyectos,
  verificarPermisos
};