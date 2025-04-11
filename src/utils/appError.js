/**
 * Clase personalizada para errores de la aplicación
 * Permite especificar un código de estado y un mensaje personalizado
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Para distinguir errores operacionales de errores de programación
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;