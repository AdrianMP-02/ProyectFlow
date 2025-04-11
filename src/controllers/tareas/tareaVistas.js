/**
 * Controladores para la renderización de vistas de tareas
 * @module tareaVistas
 */
const { getPool } = require('../../config/database');

/**
 * Muestra el formulario para crear una nueva tarea
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const mostrarFormularioNuevaTarea = async (req, res) => {
  const proyectoId = req.query.proyecto_id;

  if (!proyectoId) {
    return res.status(400).send('ID de proyecto no proporcionado');
  }

  try {
    const pool = await getPool();

    // Obtener datos del proyecto
    const [proyectos] = await pool.query('SELECT * FROM proyectos WHERE id = ?', [proyectoId]);

    if (proyectos.length === 0) {
      return res.status(404).send('Proyecto no encontrado');
    }

    // Obtener usuarios asignados al proyecto
    const [usuariosProyecto] = await pool.query(`
      SELECT u.id, u.nombre 
      FROM usuarios u
      INNER JOIN usuario_proyecto up ON u.id = up.usuario_id
      WHERE up.proyecto_id = ?
    `, [proyectoId]);

    // Obtener todos los proyectos para el sidebar
    const [todosProyectos] = await pool.query(`
      SELECT p.* FROM proyectos p
      INNER JOIN usuario_proyecto up ON p.id = up.proyecto_id
      WHERE up.usuario_id = ?
    `, [req.session.userId]);

    return res.render('tareas/nueva', {
      proyecto: proyectos[0],
      usuariosProyecto,
      proyectos: todosProyectos
    });
  } catch (error) {
    console.error('Error al mostrar formulario de tarea:', error);
    return res.status(500).send('Error al cargar el formulario');
  }
};

module.exports = {
  mostrarFormularioNuevaTarea
};