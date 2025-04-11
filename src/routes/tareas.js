const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareasController');
const { requireLogin } = require('../middleware/auth');
const pool = require('../config/database');

// Rutas para tareas
router.get('/', requireLogin, (req, res) => {
    res.render('tareas/index');
});

// Aplicar requireLogin a cada ruta individualmente
router.get('/nueva', requireLogin, tareasController.mostrarFormularioNuevaTarea);
router.get('/:id', requireLogin, tareasController.obtenerDetallesTarea);
router.post('/', requireLogin, tareasController.crearTarea);
router.put('/:id/estado', requireLogin, tareasController.actualizarEstadoTarea);
router.post('/comentarios', requireLogin, tareasController.agregarComentario);

module.exports = router;
