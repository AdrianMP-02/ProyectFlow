/**
 * Controlador para la gestión de actividades
 * @module actividadesController
 */
const { getPool } = require('../config/database');

/**
 * Obtiene las actividades asociadas a una tarea específica
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const obtenerActividades = async (req, res) => {
  const { tareaId } = req.params;

  try {
    const pool = await getPool();
    const [actividades] = await pool.query(
      'SELECT * FROM actividades WHERE tarea_id = ? ORDER BY fecha_creacion DESC',
      [tareaId]
    );

    return res.json(actividades);
  } catch (error) {
    console.error('Error al obtener las actividades:', error);
    return res.status(500).json({
      error: 'Error del servidor',
      mensaje: 'No se pudieron recuperar las actividades. Inténtelo de nuevo más tarde.'
    });
  }
};

/**
 * Agrega una nueva actividad asociada a una tarea
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const agregarActividad = async (req, res) => {
  const { tareaId, descripcion, tipo = 'manual' } = req.body;
  const usuarioId = req.session.userId;

  // Validación de datos
  if (!tareaId || !descripcion) {
    return res.status(400).json({
      error: 'Datos incompletos',
      mensaje: 'El ID de tarea y la descripción son obligatorios'
    });
  }

  try {
    const pool = await getPool();

    const [result] = await pool.query(
      'INSERT INTO actividades (usuario_id, tarea_id, descripcion, tipo_actividad) VALUES (?, ?, ?, ?)',
      [usuarioId, tareaId, descripcion, tipo]
    );

    return res.status(201).json({
      message: 'Actividad agregada correctamente',
      actividadId: result.insertId
    });
  } catch (error) {
    console.error('Error al agregar la actividad:', error);
    return res.status(500).json({
      error: 'Error del servidor',
      mensaje: 'No se pudo agregar la actividad. Inténtelo de nuevo más tarde.'
    });
  }
};

module.exports = {
  obtenerActividades,
  agregarActividad
};