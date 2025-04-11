/**
 * Controlador para la gestión de tareas
 * Archivo de compatibilidad - Redirige al nuevo módulo reorganizado
 * @module tareasController
 */

// Importar el nuevo controlador desde la subcarpeta
const tareasController = require('./tareas/tareasController');

// Re-exportar todas las funciones para mantener compatibilidad
module.exports = tareasController;