/**
 * Controlador principal para la gestión de proyectos
 * @module proyectosController
 */

// Importar funciones de otros módulos
const { 
  obtenerProyectos,
  verificarPermisos 
} = require('./proyectoUtils');

const { 
  nuevoProyecto,
  detalleProyecto,
  editarProyecto 
} = require('./proyectoVistas');

const { 
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  actualizarEstadoProyecto 
} = require('./proyectoAcciones');

// Exportar todas las funciones
module.exports = {
  // Vistas
  nuevoProyecto,
  detalleProyecto,
  editarProyecto,
  
  // Acciones CRUD
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  actualizarEstadoProyecto,
  
  // Utilidades
  obtenerProyectos,
  verificarPermisos
};