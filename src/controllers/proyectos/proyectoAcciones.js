/**
 * Controlador para acciones CRUD de proyectos
 * @module proyectoAcciones
 */
const { getPool } = require('../../config/database');
const AppError = require('../../utils/appError');
const { verificarPermisos } = require('./proyectoUtils');

/**
 * Crea un nuevo proyecto en la base de datos
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const crearProyecto = async (req, res, next) => {
  const { nombre, descripcion, fecha_inicio, fecha_fin } = req.body;
  const usuarioId = req.session.userId;

  // Validar datos de entrada
  if (!nombre || !fecha_inicio) {
    return next(new AppError('El nombre y la fecha de inicio son obligatorios', 400));
  }

  try {
    const pool = await getPool();

    // Crear proyecto
    const [result] = await pool.query(
      'INSERT INTO proyectos SET ?',
      {
        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        estado: 'pendiente',
        creador_id: usuarioId
      }
    );

    const proyectoId = result.insertId;

    // Asignar el proyecto al usuario creador
    await pool.query(
      'INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (?, ?, ?)',
      [usuarioId, proyectoId, 'admin']
    );

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    next(new AppError('Error al crear el proyecto', 500));
  }
};

/**
 * Actualiza un proyecto existente
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const actualizarProyecto = async (req, res, next) => {
  const proyectoId = req.params.id;
  const { nombre, descripcion, fecha_inicio, fecha_fin, estado } = req.body;
  const usuarioId = req.session.userId;

  // Validar datos de entrada
  if (!nombre || !fecha_inicio) {
    return next(new AppError('El nombre y la fecha de inicio son obligatorios', 400));
  }

  try {
    // Verificar permisos
    const { autorizado, error } = await verificarPermisos(
      usuarioId,
      proyectoId,
      ['admin', 'editor']
    );

    if (!autorizado) {
      return next(error);
    }

    const pool = await getPool();
    await pool.query(
      'UPDATE proyectos SET nombre = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, estado = ? WHERE id = ?',
      [nombre, descripcion, fecha_inicio, fecha_fin, estado, proyectoId]
    );

    res.redirect(`/proyectos/${proyectoId}`);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    next(new AppError('Error al actualizar el proyecto', 500));
  }
};

/**
 * Elimina un proyecto
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const eliminarProyecto = async (req, res, next) => {
  const proyectoId = req.params.id;
  const usuarioId = req.session.userId;

  try {
    // Verificar permisos (solo admin puede eliminar)
    const { autorizado, error } = await verificarPermisos(
      usuarioId,
      proyectoId,
      ['admin']
    );

    if (!autorizado) {
      return next(error);
    }

    const pool = await getPool();

    // Eliminar registros relacionados (transacción)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Eliminar asignaciones de usuarios al proyecto
      await connection.query('DELETE FROM usuario_proyecto WHERE proyecto_id = ?', [proyectoId]);

      // Eliminar tareas del proyecto
      await connection.query('DELETE FROM tareas WHERE proyecto_id = ?', [proyectoId]);

      // Eliminar el proyecto
      await connection.query('DELETE FROM proyectos WHERE id = ?', [proyectoId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    next(new AppError('Error al eliminar el proyecto', 500));
  }
};

/**
 * Actualiza solo el estado de un proyecto (para actualizaciones rápidas)
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const actualizarEstadoProyecto = async (req, res) => {
  const proyectoId = req.params.id;
  const { estado } = req.body;
  const usuarioId = req.session.userId;

  if (!estado) {
    return res.status(400).json({ success: false, message: 'El estado es obligatorio' });
  }

  try {
    // Verificar permisos
    const { autorizado } = await verificarPermisos(
      usuarioId,
      proyectoId,
      ['admin', 'editor']
    );

    if (!autorizado) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción' });
    }

    const pool = await getPool();
    await pool.query('UPDATE proyectos SET estado = ? WHERE id = ?', [estado, proyectoId]);

    return res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar estado del proyecto:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
  }
};

module.exports = {
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  actualizarEstadoProyecto
};