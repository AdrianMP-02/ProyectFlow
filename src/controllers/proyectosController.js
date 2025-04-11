/**
 * Controlador para la gestión de proyectos
 * Archivo de compatibilidad - Redirige al nuevo módulo reorganizado
 * @module proyectosController
 */

// Importar el nuevo controlador desde la subcarpeta
const proyectosController = require('./proyectos/proyectosController');

// Re-exportar todas las funciones para mantener compatibilidad
module.exports = proyectosController;
