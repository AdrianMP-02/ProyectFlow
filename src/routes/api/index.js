const express = require('express');
const router = express.Router();

// Importar rutas específicas
const usuariosRoutes = require('./usuarios-api');
const proyectosRoutes = require('./proyectos-api');

// Registrar las rutas
router.use('/usuarios', usuariosRoutes);
router.use('/proyectos', proyectosRoutes);

module.exports = router;