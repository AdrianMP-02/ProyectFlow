/**
 * Consultas para la obtención de datos de tareas
 * @module tareaConsultas
 */
const { getPool } = require('../../config/database');
const { formatearFecha } = require('./tareaUtils');

/**
 * Obtiene las tareas prioritarias de un usuario
 * @async
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} - Lista de tareas prioritarias
 */
const obtenerTareasPrioritarias = async (usuarioId) => {
  try {
    const pool = await getPool();
    const [tareas] = await pool.query(`
      SELECT 
        t.id,
        t.titulo,
        t.prioridad,
        DATE_FORMAT(t.fecha_vencimiento, '%d %b') as fechaVencimiento
      FROM tareas t
      INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id
      WHERE ut.usuario_id = ? 
      AND t.estado = 'pendiente'
      ORDER BY 
        CASE t.prioridad
          WHEN 'Alta' THEN 1
          WHEN 'Media' THEN 2
          WHEN 'Baja' THEN 3
        END,
        t.fecha_vencimiento ASC
      LIMIT 5
    `, [usuarioId]);
    return tareas;
  } catch (error) {
    console.error('Error al obtener tareas prioritarias:', error);
    return [];
  }
};

/**
 * Obtiene todas las tareas de un usuario incluyendo información del proyecto
 * @async
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Lista de tareas
 */
const obtenerTodasLasTareas = async (usuarioId) => {
  try {
    const pool = await getPool();

    // Consulta con JOIN para obtener el nombre del proyecto
    const [tareas] = await pool.query(`
      SELECT t.*, p.nombre as proyectoNombre 
      FROM tareas t
      INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE ut.usuario_id = ?
      ORDER BY t.fecha_vencimiento ASC
    `, [usuarioId]);

    // Formatear fechas para la visualización
    return tareas.map(tarea => ({
      ...tarea,
      fechaVencimiento: tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toLocaleDateString('es') : null,
      fechaCompletado: tarea.fecha_completado ? new Date(tarea.fecha_completado).toLocaleDateString('es') : null
    }));
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return [];
  }
};

/**
 * Obtiene los detalles de una tarea específica con sus comentarios y actividades
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const obtenerDetallesTarea = async (req, res) => {
  const tareaId = req.params.id;
  const actividadesLimit = parseInt(req.query.actLimit) || 0;
  const comentariosLimit = parseInt(req.query.comLimit) || 0;

  try {
    const pool = await getPool();

    // Obtener detalles básicos de la tarea
    const [tareas] = await pool.query(`
      SELECT t.*, 
          u.nombre as responsable_nombre, 
          p.nombre as proyecto_nombre
      FROM tareas t
      LEFT JOIN usuarios u ON t.responsable_id = u.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE t.id = ?
    `, [tareaId]);

    if (tareas.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const tarea = tareas[0];

    // Obtener comentarios con paginación
    const [[{ total: total_comentarios }]] = await pool.query(
      'SELECT COUNT(*) as total FROM comentarios WHERE tarea_id = ?',
      [tareaId]
    );

    const comentariosParams = comentariosLimit > 0 ? [tareaId, comentariosLimit] : [tareaId];
    const comentariosQuery = `
      SELECT c.*, u.nombre
      FROM comentarios c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.tarea_id = ?
      ORDER BY c.fecha_creacion DESC
      ${comentariosLimit > 0 ? 'LIMIT ?' : ''}
    `;

    const [comentarios] = await pool.query(comentariosQuery, comentariosParams);

    // Obtener actividades con paginación
    const [[{ total: total_actividades }]] = await pool.query(
      'SELECT COUNT(*) as total FROM actividades_tarea WHERE tarea_id = ?',
      [tareaId]
    );

    const actividadesParams = actividadesLimit > 0 ? [tareaId, actividadesLimit] : [tareaId];
    const actividadesQuery = `
      SELECT a.*, u.nombre, DATE_FORMAT(a.fecha_actividad, '%d %b %Y') as fecha_formateada
      FROM actividades_tarea a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.tarea_id = ?
      ORDER BY a.fecha_actividad DESC
      ${actividadesLimit > 0 ? 'LIMIT ?' : ''}
    `;

    const [actividades] = await pool.query(actividadesQuery, actividadesParams);

    return res.json({
      tarea,
      comentarios,
      actividades,
      total_comentarios,
      total_actividades
    });
  } catch (error) {
    console.error('Error al obtener detalles de la tarea:', error);
    return res.status(500).json({
      error: 'Error al obtener detalles de la tarea',
      details: error.message
    });
  }
};

module.exports = {
  obtenerTareasPrioritarias,
  obtenerTodasLasTareas,
  obtenerDetallesTarea
};