const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireLogin, requireProjectAdmin } = require('../middleware/auth');
const proyectosController = require('../controllers/proyectosController');

// Rutas con controladores
router.get('/nuevo', requireLogin, proyectosController.nuevoProyecto);
router.get('/', requireLogin, proyectosController.obtenerProyectos);
router.post('/', requireLogin, proyectosController.crearProyecto);
router.get('/:id', requireLogin, proyectosController.detalleProyecto);

router.get('/editar/:id', requireLogin, requireProjectAdmin, proyectosController.editarProyecto);
router.post('/editar/:id', requireLogin, requireProjectAdmin, proyectosController.actualizarProyecto);
router.post('/eliminar/:id', requireLogin, requireProjectAdmin, proyectosController.eliminarProyecto);

// Ruta para actualizar el estado del proyecto
router.put('/:id/estado', async (req, res) => {
  try {
    const proyectoId = req.params.id;
    const { estado } = req.body;
    const usuarioId = req.session.userId;

    // Validar estados permitidos
    const estadosPermitidos = ['pendiente', 'en_progreso', 'completado'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' });
    }

    // Obtener instancia del pool primero
    const poolInstance = await pool.getPool();

    // Verificar que el usuario sea administrador del proyecto
    const [roles] = await poolInstance.query(
      'SELECT rol FROM usuario_proyecto WHERE usuario_id = ? AND proyecto_id = ?',
      [usuarioId, proyectoId]
    );

    if (roles.length === 0 || roles[0].rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado de este proyecto'
      });
    }

    // Actualizar el estado del proyecto
    await poolInstance.query(
      'UPDATE proyectos SET estado = ? WHERE id = ?',
      [estado, proyectoId]
    );

    return res.json({ success: true, message: 'Estado del proyecto actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el estado del proyecto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del proyecto'
    });
  }
});

module.exports = router;
