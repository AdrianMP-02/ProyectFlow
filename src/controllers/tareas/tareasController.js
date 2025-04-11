/**
 * Controlador principal para la gestión de tareas
 * @module tareasController
 */

// Importar módulos específicos
const {
  verificarUsuarioEnProyecto,
  formatearEstado,
  formatearFecha
} = require('./tareaUtils');

const {
  obtenerTareasPrioritarias,
  obtenerTodasLasTareas,
  obtenerDetallesTarea
} = require('./tareaConsultas');

const {
  agregarComentario,
  crearTarea,
  actualizarTarea,
  asignarUsuarioATarea,
  actualizarEstadoTarea
} = require('./tareaAcciones');

const {
  mostrarFormularioNuevaTarea
} = require('./tareaVistas');

// Exportar todas las funciones
module.exports = {
  // Consultas
  obtenerTareasPrioritarias,
  obtenerTodasLasTareas,
  obtenerDetallesTarea,

  // Acciones
  agregarComentario,
  crearTarea,
  actualizarTarea,
  asignarUsuarioATarea,
  actualizarEstadoTarea,

  // Vistas
  mostrarFormularioNuevaTarea,

  // Utilidades (exportadas si son necesarias desde fuera)
  verificarUsuarioEnProyecto,
  formatearEstado,
  formatearFecha
};