const { agregarComentario } = require('../tareas/tareaAcciones');
const { getPool } = require('../../config/database');

jest.mock('../../config/database');

describe('Sistema de comentarios', () => {
  // Configuración inicial

  test('debería agregar un comentario correctamente', async () => {
    // Implementación del test
  });

  test('debería validar datos obligatorios', async () => {
    // Implementación del test
  });
});