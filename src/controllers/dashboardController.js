/**
 * Controlador para las funcionalidades del Dashboard
 * @module dashboardController
 */
const { getPool } = require('../config/database');
const proyectosController = require('./proyectosController');
const tareasController = require('./tareasController');

/**
 * Obtiene estadísticas relevantes para el dashboard
 * @async
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>} Objeto con estadísticas
 */
const obtenerEstadisticas = async (usuarioId) => {
  if (!usuarioId) {
    return { tareas_pendientes: 0, proximos_vencimientos: 0 };
  }

  try {
    const poolInstance = await getPool();
    
    // Consulta optimizada usando una sola llamada a la base de datos
    const [resultados] = await poolInstance.query(`
      SELECT 
        (SELECT COUNT(*) FROM tareas t 
         INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id 
         WHERE ut.usuario_id = ? AND t.estado = 'pendiente') as tareas_pendientes,
        (SELECT COUNT(*) FROM tareas t 
         INNER JOIN usuario_tarea ut ON t.id = ut.tarea_id 
         WHERE ut.usuario_id = ? 
         AND t.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) as proximos_vencimientos
    `, [usuarioId, usuarioId]);
    
    return resultados[0] || { tareas_pendientes: 0, proximos_vencimientos: 0 };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return { tareas_pendientes: 0, proximos_vencimientos: 0 };
  }
};

/**
 * Renderiza la página principal del dashboard con los datos del usuario
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const getDashboard = async (req, res) => {
  // Datos por defecto para la vista
  const defaultData = {
    usuario: res.locals.usuario,
    proyectos: [],
    estadisticas: {
      tareas_pendientes: 0,
      proximos_vencimientos: 0
    },
    tareasPrioritarias: [],
    tareas: []
  };
  
  // Validar que existe un usuario en sesión
  const usuarioId = req.session.userId;
  if (!usuarioId) {
    return res.redirect('/login?mensaje=session_expired');
  }
  
  try {
    // Cargar todos los datos necesarios en paralelo para optimizar rendimiento
    const [proyectos, estadisticas, tareasPrioritarias, tareas] = await Promise.allSettled([
      proyectosController.obtenerProyectos(usuarioId),
      obtenerEstadisticas(usuarioId),
      tareasController.obtenerTareasPrioritarias(usuarioId),
      tareasController.obtenerTodasLasTareas(usuarioId)
    ]);
    
    // Preparar los datos para la vista, manejando posibles promesas rechazadas
    const viewData = {
      ...defaultData,
      proyectos: proyectos.status === 'fulfilled' ? proyectos.value : [],
      estadisticas: estadisticas.status === 'fulfilled' ? estadisticas.value : defaultData.estadisticas,
      tareasPrioritarias: tareasPrioritarias.status === 'fulfilled' ? tareasPrioritarias.value : [],
      tareas: tareas.status === 'fulfilled' ? tareas.value : []
    };
    
    // Renderizar la vista con los datos
    return res.render('dashboard/index', viewData);
  } catch (error) {
    console.error('Error en el dashboard:', error);
    
    // En caso de error, renderizar con datos por defecto
    return res.render('dashboard/index', defaultData);
  }
};

/**
 * Obtiene datos del dashboard en formato JSON (para API)
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const getDashboardData = async (req, res) => {
  const usuarioId = req.session.userId;
  
  if (!usuarioId) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  try {
    const [proyectos, estadisticas, tareasPrioritarias, tareas] = await Promise.allSettled([
      proyectosController.obtenerProyectos(usuarioId),
      obtenerEstadisticas(usuarioId),
      tareasController.obtenerTareasPrioritarias(usuarioId),
      tareasController.obtenerTodasLasTareas(usuarioId)
    ]);
    
    return res.json({
      proyectos: proyectos.status === 'fulfilled' ? proyectos.value : [],
      estadisticas: estadisticas.status === 'fulfilled' ? estadisticas.value : { tareas_pendientes: 0, proximos_vencimientos: 0 },
      tareasPrioritarias: tareasPrioritarias.status === 'fulfilled' ? tareasPrioritarias.value : [],
      tareas: tareas.status === 'fulfilled' ? tareas.value : []
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
};

module.exports = {
  getDashboard,
  getDashboardData,
  obtenerEstadisticas
};
