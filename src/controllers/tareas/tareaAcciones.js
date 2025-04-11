/**
 * Acciones para la modificación de tareas
 * @module tareaAcciones
 */
const { getPool } = require('../../config/database');
const { registrarActividad } = require('../../utils/activityLogger');
const { formatearEstado, formatearFecha, verificarUsuarioEnProyecto, registrarActividadConConexion } = require('./tareaUtils');

/**
 * Agrega un nuevo comentario a una tarea
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const agregarComentario = async (req, res) => {
  const { tareaId, comentario } = req.body;
  const usuarioId = req.session.userId;

  if (!tareaId || !comentario || !comentario.trim()) {
    return res.status(400).json({ error: 'Comentario y ID de tarea son requeridos' });
  }

  try {
    const pool = await getPool();
    await pool.query(
      'INSERT INTO comentarios (tarea_id, usuario_id, comentario) VALUES (?, ?, ?)',
      [tareaId, usuarioId, comentario.trim()]
    );

    return res.status(201).json({ message: 'Comentario agregado' });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    return res.status(500).json({ error: 'Error al guardar el comentario' });
  }
};

/**
 * Crea una nueva tarea y registra las actividades asociadas
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const crearTarea = async (req, res) => {
  const {
    titulo,
    descripcion,
    proyecto_id,
    responsable_id,
    prioridad,
    fecha_vencimiento,
    usuarios_asignados
  } = req.body;

  const usuarioId = req.session.userId;

  // Validación básica
  if (!titulo || !proyecto_id) {
    return res.status(400).send('El título y el proyecto son obligatorios');
  }

  try {
    const pool = await getPool();

    // Crear transacción para asegurar consistencia
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Obtener el nombre del responsable si existe
      let responsableNombre = 'No asignado';
      if (responsable_id) {
        const [responsableInfo] = await connection.query(
          'SELECT nombre FROM usuarios WHERE id = ?',
          [responsable_id]
        );
        if (responsableInfo.length > 0) {
          responsableNombre = responsableInfo[0].nombre;
        }
      }

      // Crear la tarea
      const [result] = await connection.query(
        `INSERT INTO tareas 
         (titulo, descripcion, proyecto_id, responsable_id, prioridad, fecha_vencimiento) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [titulo, descripcion, proyecto_id, responsable_id, prioridad, fecha_vencimiento]
      );

      const tareaId = result.insertId;

      // Registrar actividades básicas
      await registrarActividadConConexion(connection, tareaId, usuarioId, 'creacion', `creó esta tarea`);

      if (responsable_id) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'asignacion',
          `asignó a ${responsableNombre} como responsable`
        );
      }

      if (prioridad) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'prioridad',
          `estableció la prioridad como ${prioridad}`
        );
      }

      if (fecha_vencimiento) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'fecha',
          `estableció la fecha de vencimiento para ${formatearFecha(fecha_vencimiento)}`
        );
      }

      // Procesar usuarios asignados
      if (usuarios_asignados) {
        const asignadosArray = Array.isArray(usuarios_asignados) ? usuarios_asignados : [usuarios_asignados];

        for (const usuarioAsignadoId of asignadosArray) {
          // Verificar que el usuario está en el proyecto
          const [pertenece] = await connection.query(
            'SELECT 1 FROM usuario_proyecto WHERE usuario_id = ? AND proyecto_id = ?',
            [usuarioAsignadoId, proyecto_id]
          );

          if (pertenece.length > 0) {
            // Asignar usuario a la tarea
            await connection.query(
              'INSERT INTO usuario_tarea (usuario_id, tarea_id) VALUES (?, ?)',
              [usuarioAsignadoId, tareaId]
            );

            // Registrar asignación si no es el responsable
            if (usuarioAsignadoId != responsable_id) {
              const [usuarioInfo] = await connection.query(
                'SELECT nombre FROM usuarios WHERE id = ?',
                [usuarioAsignadoId]
              );

              const usuarioNombre = usuarioInfo[0]?.nombre || 'Usuario';

              await registrarActividadConConexion(
                connection,
                tareaId,
                usuarioId,
                'asignacion',
                `asignó a ${usuarioNombre} a esta tarea`
              );
            }
          }
        }
      }

      // Confirmar cambios
      await connection.commit();
      return res.redirect(`/proyectos/${proyecto_id}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear la tarea:', error);
    return res.status(500).send('Error al crear la tarea. Inténtelo de nuevo más tarde.');
  }
};

/**
 * Actualiza una tarea existente y registra los cambios
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const actualizarTarea = async (req, res) => {
  const tareaId = req.params.id;
  const {
    titulo,
    descripcion,
    responsable_id,
    prioridad,
    fecha_vencimiento,
    estado,
    usuarios_asignados
  } = req.body;

  const usuarioId = req.session.userId;

  try {
    const pool = await getPool();

    // Crear transacción para asegurar consistencia
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Obtener datos actuales de la tarea para comparar cambios
      const [tareaActual] = await connection.query('SELECT * FROM tareas WHERE id = ?', [tareaId]);

      if (tareaActual.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }

      const tarea = tareaActual[0];

      // Actualizar la tarea
      await connection.query(
        `UPDATE tareas 
         SET titulo = ?, descripcion = ?, responsable_id = ?, 
         prioridad = ?, fecha_vencimiento = ?, estado = ? 
         WHERE id = ?`,
        [titulo, descripcion, responsable_id, prioridad, fecha_vencimiento, estado, tareaId]
      );

      // Registrar cambios en campos principales
      if (titulo !== tarea.titulo) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'otro',
          `cambió el título de "${tarea.titulo}" a "${titulo}"`
        );
      }

      if (descripcion !== tarea.descripcion) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'otro',
          `actualizó la descripción de la tarea`
        );
      }

      // Registrar cambio de responsable
      if (responsable_id !== tarea.responsable_id) {
        const [responsableAnteriorInfo] = await connection.query(
          'SELECT nombre FROM usuarios WHERE id = ?',
          [tarea.responsable_id]
        );

        const [responsableNuevoInfo] = await connection.query(
          'SELECT nombre FROM usuarios WHERE id = ?',
          [responsable_id]
        );

        const responsableAnterior = responsableAnteriorInfo[0]?.nombre || 'No asignado';
        const responsableNuevo = responsableNuevoInfo[0]?.nombre || 'No asignado';

        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'asignacion',
          `cambió el responsable de ${responsableAnterior} a ${responsableNuevo}`
        );
      }

      // Registrar cambio de prioridad
      if (prioridad !== tarea.prioridad) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'prioridad',
          `cambió la prioridad de "${tarea.prioridad}" a "${prioridad}"`
        );
      }

      // Registrar cambio de fecha de vencimiento
      if (fecha_vencimiento !== tarea.fecha_vencimiento) {
        const fechaAnterior = formatearFecha(tarea.fecha_vencimiento);
        const fechaNueva = formatearFecha(fecha_vencimiento);

        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'fecha',
          `cambió la fecha de vencimiento de ${fechaAnterior} a ${fechaNueva}`
        );
      }

      // Registrar cambio de estado
      if (estado !== tarea.estado) {
        await registrarActividadConConexion(
          connection,
          tareaId,
          usuarioId,
          'cambio_estado',
          `cambió el estado de "${formatearEstado(tarea.estado)}" a "${formatearEstado(estado)}"`
        );
      }

      // Manejar cambios en usuarios asignados
      if (usuarios_asignados) {
        // Obtener usuarios actualmente asignados
        const [asignadosActuales] = await connection.query(
          'SELECT usuario_id FROM usuario_tarea WHERE tarea_id = ?',
          [tareaId]
        );

        const idsActuales = asignadosActuales.map(a => a.usuario_id);

        // Convertir a array si es necesario
        const nuevosAsignados = Array.isArray(usuarios_asignados)
          ? usuarios_asignados
          : [usuarios_asignados];

        const idsNuevos = nuevosAsignados.map(id => parseInt(id));

        // Procesar usuarios eliminados
        const eliminados = idsActuales.filter(id => !idsNuevos.includes(id));
        for (const usuarioId of eliminados) {
          // Eliminar de la base de datos
          await connection.query(
            'DELETE FROM usuario_tarea WHERE usuario_id = ? AND tarea_id = ?',
            [usuarioId, tareaId]
          );

          // Registrar actividad
          const [usuarioInfo] = await connection.query(
            'SELECT nombre FROM usuarios WHERE id = ?',
            [usuarioId]
          );

          const nombre = usuarioInfo[0]?.nombre || 'Usuario';

          await registrarActividadConConexion(
            connection,
            tareaId,
            usuarioId,
            'asignacion',
            `quitó a ${nombre} de esta tarea`
          );
        }

        // Procesar usuarios añadidos
        const añadidos = idsNuevos.filter(id => !idsActuales.includes(id));
        for (const nuevoUsuarioId of añadidos) {
          // Añadir a la base de datos
          await connection.query(
            'INSERT INTO usuario_tarea (usuario_id, tarea_id) VALUES (?, ?)',
            [nuevoUsuarioId, tareaId]
          );

          // Registrar actividad
          const [usuarioInfo] = await connection.query(
            'SELECT nombre FROM usuarios WHERE id = ?',
            [nuevoUsuarioId]
          );

          const nombre = usuarioInfo[0]?.nombre || 'Usuario';

          await registrarActividadConConexion(
            connection,
            tareaId,
            usuarioId,
            'asignacion',
            `asignó a ${nombre} a esta tarea`
          );
        }
      }

      // Confirmar cambios
      await connection.commit();
      return res.json({ success: true, message: 'Tarea actualizada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar la tarea:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar la tarea' });
  }
};

/**
 * Asigna un usuario a una tarea
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const asignarUsuarioATarea = async (req, res) => {
  const { tareaId, usuarioId } = req.body;

  if (!tareaId || !usuarioId) {
    return res.status(400).json({ error: 'El ID de tarea y usuario son requeridos' });
  }

  try {
    const pool = await getPool();

    // Obtener el proyecto_id de la tarea
    const [tareas] = await pool.query(
      'SELECT proyecto_id FROM tareas WHERE id = ?',
      [tareaId]
    );

    if (tareas.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const proyectoId = tareas[0].proyecto_id;

    // Verificar que el usuario pertenece al proyecto
    const usuarioEnProyecto = await verificarUsuarioEnProyecto(usuarioId, proyectoId, pool);

    if (!usuarioEnProyecto) {
      return res.status(400).json({
        error: 'El usuario no pertenece a este proyecto y no puede ser asignado a esta tarea'
      });
    }

    // Verificar que el usuario no esté ya asignado
    const [asignado] = await pool.query(
      'SELECT 1 FROM usuario_tarea WHERE usuario_id = ? AND tarea_id = ?',
      [usuarioId, tareaId]
    );

    if (asignado.length > 0) {
      return res.status(400).json({ error: 'El usuario ya está asignado a esta tarea' });
    }

    // Asignar el usuario a la tarea
    await pool.query(
      'INSERT INTO usuario_tarea (usuario_id, tarea_id) VALUES (?, ?)',
      [usuarioId, tareaId]
    );

    return res.status(200).json({ message: 'Usuario asignado correctamente a la tarea' });
  } catch (error) {
    console.error('Error al asignar usuario a tarea:', error);
    return res.status(500).json({ error: 'Error al asignar usuario' });
  }
};

/**
 * Actualiza solo el estado de una tarea
 * @async
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 */
const actualizarEstadoTarea = async (req, res) => {
  const tareaId = req.params.id;
  const { estado } = req.body;
  const usuarioId = req.session.userId;

  if (!estado) {
    return res.status(400).json({ success: false, message: 'El estado es requerido' });
  }

  try {
    const pool = await getPool();

    // Obtener el estado anterior
    const [tareaInfo] = await pool.query('SELECT estado FROM tareas WHERE id = ?', [tareaId]);

    if (tareaInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    const estadoAnterior = tareaInfo[0].estado;

    // Si no hay cambio de estado, no hacer nada
    if (estadoAnterior === estado) {
      return res.json({ success: true, message: 'No hubo cambios en el estado' });
    }

    // Actualizar el estado
    await pool.query(
      'UPDATE tareas SET estado = ? WHERE id = ?',
      [estado, tareaId]
    );

    // Registrar el cambio de estado
    await registrarActividad(
      tareaId,
      usuarioId,
      'cambio_estado',
      `cambió el estado de "${formatearEstado(estadoAnterior)}" a "${formatearEstado(estado)}"`
    );

    return res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el estado de la tarea:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado de la tarea' });
  }
};

module.exports = {
  agregarComentario,
  crearTarea,
  actualizarTarea,
  asignarUsuarioATarea,
  actualizarEstadoTarea
};