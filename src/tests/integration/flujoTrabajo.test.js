const request = require('supertest');
const app = require('../../app');
const { getPool } = require('../../config/database');

jest.mock('../../config/database');

describe('Flujo de trabajo completo', () => {
  // Configuración inicial con un usuario autenticado

  test('debería permitir crear proyecto, tareas y cambiar estados', async () => {
    // 1. Crear un proyecto
    // 2. Crear una tarea en ese proyecto
    // 3. Actualizar estado de la tarea
    // 4. Verificar actividades registradas
  });
});