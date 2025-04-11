/**
 * Controlador para vistas de proyectos
 * @module proyectoVistas
 */
const { getPool } = require('../../config/database');
const AppError = require('../../utils/appError');
const { obtenerProyectos, verificarPermisos } = require('./proyectoUtils');

/**
 * Renderiza el formulario para crear un nuevo proyecto
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const nuevoProyecto = async (req, res, next) => {
  try {
    const usuarioId = req.session.userId;
    const proyectos = await obtenerProyectos(usuarioId);

    res.render('proyectos/nuevo', {
      proyectos,
      usuario: res.locals.usuario
    });
  } catch (error) {
    console.error('Error al mostrar formulario de nuevo proyecto:', error);
    next(new AppError('Error al cargar el formulario de nuevo proyecto', 500));
  }
};

/**
 * Muestra los detalles de un proyecto específico
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const detalleProyecto = async (req, res, next) => {
  try {
    const proyectoId = req.params.id;
    const usuarioId = req.session.userId;

    const pool = await getPool();

    // Verificar si el usuario tiene acceso
    const { autorizado, rol, error } = await verificarPermisos(
      usuarioId,
      proyectoId,
      ['admin', 'editor', 'miembro', 'observador']
    );

    if (!autorizado) {
      return next(error);
    }

    // Obtener detalles del proyecto
    const [proyectos] = await pool.query('SELECT * FROM proyectos WHERE id = ?', [proyectoId]);

    // Obtener tareas del proyecto con información de responsables
    const [tareas] = await pool.query(`
      SELECT t.*, u.nombre as responsable_nombre
      FROM tareas t
      LEFT JOIN usuarios u ON t.responsable_id = u.id
      WHERE t.proyecto_id = ?
      ORDER BY t.id DESC
    `, [proyectoId]);

    // Obtener todos los proyectos para el sidebar
    const todosProyectos = await obtenerProyectos(usuarioId);

    res.render('proyectos/detalle', {
      proyecto: proyectos[0],
      tareas,
      proyectos: todosProyectos,
      rol,
      usuario: { id: usuarioId }
    });
  } catch (error) {
    console.error('Error al mostrar detalle del proyecto:', error);
    next(new AppError('Error al cargar el proyecto', 500));
  }
};

/**
 * Renderiza el formulario para editar un proyecto
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función de middleware siguiente
 */
const editarProyecto = async (req, res, next) => {
  const proyectoId = req.params.id;
  const usuarioId = req.session.userId;

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
    const [proyecto] = await pool.query('SELECT * FROM proyectos WHERE id = ?', [proyectoId]);

    // Obtener todos los proyectos para el sidebar
    const proyectos = await obtenerProyectos(usuarioId);

    res.render('proyectos/editar', {
      proyecto: proyecto[0],
      proyectos,
      usuario: res.locals.usuario
    });
  } catch (error) {
    console.error('Error al cargar formulario de edición:', error);
    next(new AppError('Error al cargar el formulario de edición', 500));
  }
};

module.exports = {
  nuevoProyecto,
  detalleProyecto,
  editarProyecto
};