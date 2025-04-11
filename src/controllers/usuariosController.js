/**
 * Controlador para la gestión de usuarios y autenticación
 * Archivo de compatibilidad - Redirige al nuevo módulo reorganizado
 * @module usuariosController
 */

// Importar el nuevo controlador desde la subcarpeta
const usuariosController = require('./usuarios/usuariosController');

// Re-exportar todas las funciones para mantener compatibilidad
module.exports = usuariosController;