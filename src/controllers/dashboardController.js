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
 * Obtiene actividades recientes para el dashboard con información de usuario
 * @async
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Array con actividades recientes
 */
const obtenerActividadesRecientes = async (usuarioId) => {
  if (!usuarioId) {
    return [];
  }

  try {
    const poolInstance = await getPool();

    // Consulta para obtener las actividades recientes con la tabla CORRECTA actividades_tarea
    const [actividades] = await poolInstance.query(`
      SELECT 
        a.id,
        a.tarea_id,
        a.usuario_id,
        a.tipo_actividad as tipo_original,
        a.descripcion as desc_original,
        u.nombre as nombre_usuario,
        p.nombre as nombre_proyecto,
        t.titulo as titulo_tarea,
        DATE_FORMAT(a.fecha_actividad, '%d %b %Y') as fecha
      FROM actividades_tarea a
      INNER JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN tareas t ON a.tarea_id = t.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE a.usuario_id = ? OR 
            a.tarea_id IN (SELECT tarea_id FROM usuario_tarea WHERE usuario_id = ?)
      ORDER BY a.fecha_actividad DESC
      LIMIT 10
    `, [usuarioId, usuarioId]);

    // Mapear y enriquecer las actividades con contexto
    return actividades.map(act => {
      // Determinar tipo de actividad para la vista
      const tipo = mapearTipoActividad(act.tipo_original);

      // Crear descripción formateada con enlace y usuario
      let descripcion = crearDescripcionFormateada(
        act.nombre_usuario,
        tipo,
        act.titulo_tarea || "una tarea",
        act.nombre_proyecto || "un proyecto"
      );

      return {
        ...act,
        tipo,
        descripcion
      };
    });
  } catch (error) {
    console.error('Error al obtener actividades recientes:', error);
    return [];
  }
};

/**
 * Mapea los tipos de actividad de la base de datos a los tipos usados en la vista
 * @param {string} tipo - Tipo de actividad en la base de datos
 * @returns {string} Tipo de actividad para la vista
 */
const mapearTipoActividad = (tipo) => {
  const mapeoTipos = {
    'creacion': 'creacion',
    'cambio_estado': 'completado',
    'asignacion': 'asignacion',
    'fecha': 'fecha',
    'prioridad': 'fecha',
    'etiqueta': 'otro',
    'otro': 'otro'
  };

  return mapeoTipos[tipo] || 'otro';
};

/**
 * Crea una descripción formateada con información contextual
 * @param {string} usuario - Nombre del usuario
 * @param {string} tipo - Tipo de actividad
 * @param {string} tarea - Título de la tarea
 * @param {string} proyecto - Nombre del proyecto
 * @returns {string} Descripción formateada
 */
const crearDescripcionFormateada = (usuario, tipo, tarea, proyecto) => {
  switch (tipo) {
    case 'creacion':
      return `<strong>${usuario}</strong> creó la tarea <strong>${tarea}</strong> en el proyecto <strong>${proyecto}</strong>`;
    case 'completado':
      return `<strong>${usuario}</strong> cambió el estado de la tarea <strong>${tarea}</strong>`;
    case 'asignacion':
      return `<strong>${usuario}</strong> asignó la tarea <strong>${tarea}</strong>`;
    case 'comentario':
      return `<strong>${usuario}</strong> comentó en la tarea <strong>${tarea}</strong>`;
    case 'fecha':
      return `<strong>${usuario}</strong> actualizó la fecha o prioridad de <strong>${tarea}</strong>`;
    default:
      return `<strong>${usuario}</strong> realizó una acción en <strong>${tarea}</strong>`;
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
    tareas: [],
    actividades: [] // Añadir el array vacío por defecto
  };

  // Validar que existe un usuario en sesión
  const usuarioId = req.session.userId;
  if (!usuarioId) {
    return res.redirect('/login?mensaje=session_expired');
  }

  try {
    // Cargar todos los datos necesarios en paralelo para optimizar rendimiento
    const [proyectos, estadisticas, tareasPrioritarias, tareas, actividades] = await Promise.allSettled([
      proyectosController.obtenerProyectos(usuarioId),
      obtenerEstadisticas(usuarioId),
      tareasController.obtenerTareasPrioritarias(usuarioId),
      tareasController.obtenerTodasLasTareas(usuarioId),
      obtenerActividadesRecientes(usuarioId) // Añadir esta línea
    ]);

    // Preparar los datos para la vista, manejando posibles promesas rechazadas
    const viewData = {
      ...defaultData,
      usuario: res.locals.usuario,
      proyectos: proyectos.status === 'fulfilled' ? proyectos.value : [],
      estadisticas: estadisticas.status === 'fulfilled' ? estadisticas.value : defaultData.estadisticas,
      tareasPrioritarias: tareasPrioritarias.status === 'fulfilled' ? tareasPrioritarias.value : [],
      tareas: tareas.status === 'fulfilled' ? tareas.value : [],
      actividades: actividades.status === 'fulfilled' ? actividades.value : [] // Añadir esta línea
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
    const [proyectos, estadisticas, tareasPrioritarias, tareas, actividades] = await Promise.allSettled([
      proyectosController.obtenerProyectos(usuarioId),
      obtenerEstadisticas(usuarioId),
      tareasController.obtenerTareasPrioritarias(usuarioId),
      tareasController.obtenerTodasLasTareas(usuarioId),
      obtenerActividadesRecientes(usuarioId) // Añadir esta línea
    ]);

    return res.json({
      proyectos: proyectos.status === 'fulfilled' ? proyectos.value : [],
      estadisticas: estadisticas.status === 'fulfilled' ? estadisticas.value : { tareas_pendientes: 0, proximos_vencimientos: 0 },
      tareasPrioritarias: tareasPrioritarias.status === 'fulfilled' ? tareasPrioritarias.value : [],
      tareas: tareas.status === 'fulfilled' ? tareas.value : [],
      actividades: actividades.status === 'fulfilled' ? actividades.value : [] // Añadir esta línea
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
};

module.exports = {
  getDashboard,
  getDashboardData,
  obtenerEstadisticas,
  obtenerActividadesRecientes // Exportar la nueva función
};
