const { actualizarEstadoTarea } = require('../tareas/tareaAcciones');
const { getPool } = require('../../config/database');
const { registrarActividad } = require('../../utils/activityLogger');
const { formatearEstado } = require('../tareas/tareaUtils');

jest.mock('../../config/database');
jest.mock('../../utils/activityLogger', () => ({
  registrarActividad: jest.fn().mockResolvedValue(true)
}));

describe('Funcionalidad Kanban', () => {
  // Variables para mocks
  let mockReq;
  let mockRes;
  let mockPool;

  beforeEach(() => {
    // Configuración inicial de los mocks
    mockReq = {
      params: { id: '5' },
      body: { estado: 'en_progreso' },
      session: { userId: 1 }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn()
    };

    mockPool = {
      query: jest.fn()
    };

    getPool.mockResolvedValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debería actualizar estado al mover una tarea entre columnas', async () => {
    // Simular tarea existente con estado pendiente
    mockPool.query.mockImplementation((query) => {
      if (query.includes('SELECT estado FROM tareas')) {
        return Promise.resolve([[{ estado: 'pendiente' }]]);
      } else if (query.includes('UPDATE tareas SET estado')) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }
      return Promise.resolve([[]]);
    });

    // Ejecutar función
    await actualizarEstadoTarea(mockReq, mockRes);

    // Verificaciones
    expect(mockPool.query).toHaveBeenCalledTimes(2);

    // Verificar que se consultó el estado anterior
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT estado FROM tareas'),
      ['5']
    );

    // Verificar que se actualizó el estado
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tareas SET estado'),
      ['en_progreso', '5']
    );

    // Verificar que se registró la actividad
    expect(registrarActividad).toHaveBeenCalledWith(
      '5',
      1,
      'cambio_estado',
      expect.stringContaining('cambió el estado de "Pendiente" a "En Progreso"')
    );

    // Verificar respuesta
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining('actualizado')
    }));
  });

  test('debería validar estados permitidos', async () => {
    // Probar con un estado no válido (vacío)
    mockReq.body.estado = '';

    // Ejecutar función
    await actualizarEstadoTarea(mockReq, mockRes);

    // Verificaciones
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('requerido')
    }));
  });

  test('debería evitar actualización si no hay cambio de estado', async () => {
    // Simular tarea con el mismo estado que se intenta actualizar
    mockPool.query.mockImplementation((query) => {
      if (query.includes('SELECT estado FROM tareas')) {
        // El estado actual ya es 'en_progreso'
        return Promise.resolve([[{ estado: 'en_progreso' }]]);
      }
      return Promise.resolve([[]]);
    });

    // Ejecutar función
    await actualizarEstadoTarea(mockReq, mockRes);

    // Verificaciones
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tareas SET estado')
    );
    expect(registrarActividad).not.toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining('No hubo cambios')
    }));
  });

  test('debería manejar tareas inexistentes', async () => {
    // Simular tarea no encontrada
    mockPool.query.mockResolvedValueOnce([[]]);

    // Ejecutar función
    await actualizarEstadoTarea(mockReq, mockRes);

    // Verificaciones
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('no encontrada')
    }));
    expect(mockPool.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tareas SET estado')
    );
  });

  test('debería manejar errores de base de datos', async () => {
    // Simular error de base de datos
    mockPool.query.mockImplementation((query) => {
      if (query.includes('SELECT estado FROM tareas')) {
        return Promise.resolve([[{ estado: 'pendiente' }]]);
      } else if (query.includes('UPDATE tareas SET estado')) {
        return Promise.reject(new Error('Error de conexión'));
      }
      return Promise.resolve([[]]);
    });

    // Ejecutar función
    await actualizarEstadoTarea(mockReq, mockRes);

    // Verificaciones
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('Error')
    }));
  });

  test('debería permitir transiciones a todos los estados válidos', async () => {
    // Estados válidos en el sistema
    const estadosValidos = ['pendiente', 'en_progreso', 'completada', 'cancelada'];

    // Configurar mock para estado actual
    mockPool.query.mockImplementation((query) => {
      if (query.includes('SELECT estado FROM tareas')) {
        return Promise.resolve([[{ estado: 'pendiente' }]]);
      } else if (query.includes('UPDATE tareas SET estado')) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }
      return Promise.resolve([[]]);
    });

    // Probar cada estado válido
    for (const estado of estadosValidos) {
      // Limpiar mocks para cada iteración
      jest.clearAllMocks();

      // Configurar request con el nuevo estado
      mockReq.body.estado = estado;

      // Ejecutar función
      await actualizarEstadoTarea(mockReq, mockRes);

      // Verificar que se actualizó correctamente
      if (estado !== 'pendiente') { // No debería actualizarse si el estado es el mismo
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE tareas SET estado'),
          [estado, '5']
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          message: expect.stringContaining('actualizado')
        }));
      }
    }
  });
});