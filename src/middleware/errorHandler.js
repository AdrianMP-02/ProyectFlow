/**
 * Middleware para capturar y manejar errores en la aplicación
 */
const errorHandler = {
  // Middleware para capturar errores 404 (rutas no encontradas)
  notFound: (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  },

  // Middleware para manejar errores generales
  general: (err, req, res, next) => {
    // Si el error no tiene código de estado, asignar 500 por defecto
    const statusCode = err.statusCode || 500;

    console.error(`[ERROR] ${err.message}`);
    if (statusCode === 500) {
      console.error(err.stack);
    }

    // Si es una petición AJAX, devolver JSON
    if (
      req.xhr ||
      (req.headers.accept && req.headers.accept.includes('application/json'))
    ) {
      return res.status(statusCode).json({
        error: true,
        message: err.message || 'Error del servidor'
      });
    }

    // Para peticiones normales, renderizar la vista de error
    res.status(statusCode).render('error', {
      mensaje: err.message || 'Ha ocurrido un error inesperado',
      statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
  }
};

module.exports = errorHandler;