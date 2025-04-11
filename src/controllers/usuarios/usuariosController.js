/**
 * Controlador principal para la gestión de usuarios
 * @module usuariosController
 */

// Importar funciones de módulos específicos
const {
  validarEmail,
  compararPassword,
  hashPassword,
  obtenerEstadisticasUsuario
} = require('./usuarioUtils');

const {
  login,
  register,
  logout
} = require('./usuarioAuth');

const {
  obtenerPerfil,
  actualizarPerfil
} = require('./usuarioPerfil');

const {
  mostrarLogin,
  mostrarRegistro
} = require('./usuarioVistas');

// Exportar todas las funciones
module.exports = {
  // Autenticación
  login,
  register,
  logout,
  
  // Perfil
  obtenerPerfil,
  actualizarPerfil,
  
  // Vistas
  mostrarLogin,
  mostrarRegistro,
  
  // Utilidades (exportadas si son necesarias desde fuera)
  validarEmail,
  compararPassword,
  hashPassword,
  obtenerEstadisticasUsuario
};