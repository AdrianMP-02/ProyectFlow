const {
  crearTarea,
  actualizarTarea,
  actualizarEstadoTarea,
  obtenerTareasPrioritarias,
  asignarUsuarioATarea,
  agregarComentario
} = require('../tareas/tareasController');
const { getPool } = require('../../config/database');
const { verificarUsuarioEnProyecto } = require('../tareas/tareaUtils');

// Mockear módulos
jest.mock('../../config/database');
jest.mock('../tareas/tareaUtils', () => ({
  verificarUsuarioEnProyecto: jest.fn().mockResolvedValue(true),
  formatearEstado: jest.fn(estado => estado),
  formatearFecha: jest.fn(fecha => fecha),
  registrarActividadConConexion: jest.fn().mockResolvedValue(true)
}));

describe('tareasController', () => {
  let mockReq;
  let mockRes;
  let mockPool;

  beforeEach(() => {
    // Mock para req
    mockReq = {
      body: {},
      params: {},
      session: { userId: 1 },
      query: {}
    };

    // Mock para res
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      redirect: jest.fn()
    };

    // Mock para pool
    mockPool = {
      query: jest.fn(),
      getConnection: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn()
      })
    };

    getPool.mockResolvedValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearTarea', () => {
    test('debería crear una tarea correctamente', async () => {
      // Configurar req según el formulario
      mockReq.body = {
        proyecto_id: '1',
        titulo: 'Tarea de prueba',
        descripcion: 'Descripción de prueba',
        responsable_id: '2',
        usuarios_asignados: ['2', '3'],
        prioridad: 'Media',
        fecha_vencimiento: '2025-05-15'
      };

      // Mock para conexión
      const mockConnection = await mockPool.getConnection();

      // Configurar mocks para las consultas
      mockConnection.query.mockImplementation((query, params) => {
        if (query.includes('SELECT nombre FROM usuarios WHERE id =')) {
          return Promise.resolve([
            [{ nombre: 'Usuario Responsable' }]
          ]);
        }
        if (query.includes('INSERT INTO tareas')) {
          return Promise.resolve([{ insertId: 5 }]);
        }
        if (query.includes('SELECT 1 FROM usuario_proyecto')) {
          return Promise.resolve([[{}]]); // Simular que el usuario pertenece al proyecto
        }
        if (query.includes('INSERT INTO usuario_tarea')) {
          return Promise.resolve([{ affectedRows: 1 }]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar función
      await crearTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith('/proyectos/1');
    });

    test('debería validar campos obligatorios', async () => {
      // Configurar req con campos faltantes
      mockReq.body = {
        proyecto_id: '1',
        // Sin título
        descripcion: 'Descripción de prueba'
      };

      // Ejecutar función
      await crearTarea(mockReq, mockRes);

      // Verificar respuesta de error
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('obligatorios'));
      expect(mockPool.getConnection).not.toHaveBeenCalled();
    });

    test('debería manejar errores de base de datos', async () => {
      // Configurar req
      mockReq.body = {
        proyecto_id: '1',
        titulo: 'Tarea de prueba',
        descripcion: 'Descripción de prueba',
        responsable_id: '2'
      };

      // Mock para conexión
      const mockConnection = await mockPool.getConnection();
      mockConnection.query.mockRejectedValueOnce(new Error('Error de base de datos'));

      // Ejecutar función
      await crearTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('actualizarTarea', () => {
    test('debería actualizar una tarea correctamente', async () => {
      // Configurar req
      mockReq.params = { id: '5' };
      mockReq.body = {
        titulo: 'Tarea actualizada',
        descripcion: 'Nueva descripción',
        responsable_id: '3',
        prioridad: 'Alta',
        fecha_vencimiento: '2025-06-15',
        estado: 'en_progreso',
        usuarios_asignados: ['3', '4']
      };

      // Mock para conexión
      const mockConnection = await mockPool.getConnection();

      // Configurar mocks para las consultas
      mockConnection.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM tareas WHERE id =')) {
          return Promise.resolve([
            [{
              id: 5,
              titulo: 'Tarea original',
              descripcion: 'Descripción original',
              responsable_id: 2,
              prioridad: 'Media',
              fecha_vencimiento: '2025-05-15',
              estado: 'pendiente',
              proyecto_id: 1
            }]
          ]);
        }
        if (query.includes('SELECT nombre FROM usuarios')) {
          return Promise.resolve([[{ nombre: 'Usuario Test' }]]);
        }
        if (query.includes('SELECT usuario_id FROM usuario_tarea')) {
          return Promise.resolve([[{ usuario_id: 2 }]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      // Ejecutar función
      await actualizarTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    test('debería fallar si la tarea no existe', async () => {
      // Configurar req
      mockReq.params = { id: '999' };
      mockReq.body = {
        titulo: 'Tarea actualizada'
      };

      // Mock para conexión
      const mockConnection = await mockPool.getConnection();
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Ejecutar función
      await actualizarTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('actualizarEstadoTarea', () => {
    test('debería actualizar el estado de una tarea', async () => {
      // Configurar req
      mockReq.params = { id: '5' };
      mockReq.body = { estado: 'completada' };

      // Configurar mocks para las consultas
      mockPool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT estado FROM tareas')) {
          return Promise.resolve([[{ estado: 'pendiente' }]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      // Ejecutar función
      await actualizarEstadoTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    test('debería validar el estado proporcionado', async () => {
      // Configurar req con estado no válido
      mockReq.params = { id: '5' };
      mockReq.body = { estado: '' };

      // Ejecutar función
      await actualizarEstadoTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });

    test('debería fallar si la tarea no existe', async () => {
      // Configurar req
      mockReq.params = { id: '999' };
      mockReq.body = { estado: 'completada' };

      // Mock para consulta que no encuentra la tarea
      mockPool.query.mockResolvedValueOnce([[]]);

      // Ejecutar función
      await actualizarEstadoTarea(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('obtenerTareasPrioritarias', () => {
    test('debería obtener tareas prioritarias del usuario', async () => {
      // Datos de prueba
      const usuarioId = 1;
      const tareasMock = [
        { id: 1, titulo: 'Tarea 1', prioridad: 'Alta' },
        { id: 2, titulo: 'Tarea 2', prioridad: 'Alta' }
      ];

      // Mock para consulta
      mockPool.query.mockResolvedValueOnce([tareasMock]);

      // Ejecutar función
      const resultado = await obtenerTareasPrioritarias(usuarioId);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalled();
      expect(resultado).toEqual(tareasMock);
    });

    test('debería manejar errores correctamente', async () => {
      // Configurar error
      mockPool.query.mockRejectedValueOnce(new Error('Error de consulta'));

      // Ejecutar función
      const resultado = await obtenerTareasPrioritarias(1);

      // Verificaciones - debería devolver un array vacío en caso de error
      expect(resultado).toEqual([]);
    });
  });

  describe('asignarUsuarioATarea', () => {
    test('debería asignar un usuario a una tarea', async () => {
      // Configurar req
      mockReq.body = {
        tareaId: '5',
        usuarioId: '3'
      };

      // Configurar mocks para las consultas
      mockPool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM tareas WHERE id =') ||
          query.includes('SELECT proyecto_id FROM tareas')) {
          return Promise.resolve([[{
            id: 5,
            proyecto_id: 1,
            titulo: 'Tarea de prueba'
          }]]);
        }
        if (query.includes('SELECT * FROM usuarios WHERE id =')) {
          return Promise.resolve([[{
            id: 3,
            nombre: 'Usuario Test'
          }]]);
        }
        if (query.includes('SELECT 1 FROM usuario_proyecto')) {
          return Promise.resolve([[{ '1': 1 }]]); // Usuario pertenece al proyecto
        }
        if (query.includes('SELECT 1 FROM usuario_tarea')) {
          // Importante: Devolver [[]] en lugar de [] para simular resultado vacío
          return Promise.resolve([[]]); // Usuario no está asignado aún
        }
        if (query.includes('INSERT INTO usuario_tarea')) {
          return Promise.resolve([{ affectedRows: 1 }]);
        }
        if (query.includes('INSERT INTO actividades_tarea')) {
          return Promise.resolve([{ insertId: 1 }]);
        }
        // Respuesta por defecto para cualquier otra consulta
        return Promise.resolve([[]]);
      });

      // Ejecutar función
      await asignarUsuarioATarea(mockReq, mockRes);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('asignado')
      }));
    });

    test('debería validar los parámetros requeridos', async () => {
      // Configurar req sin los parámetros necesarios
      mockReq.body = { tareaId: '5' }; // Sin usuarioId

      // Ejecutar función
      await asignarUsuarioATarea(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('requeridos')
      }));
    });

    test('debería fallar si la tarea no existe', async () => {
      // Configurar req
      mockReq.body = {
        tareaId: '999',
        usuarioId: '3'
      };

      // Mock para consulta que no encuentra la tarea
      mockPool.query.mockResolvedValueOnce([[]]);

      // Ejecutar función
      await asignarUsuarioATarea(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('no encontrada')
      }));
    });

    test('debería fallar si el usuario ya está asignado', async () => {
      // Configurar req
      mockReq.body = {
        tareaId: '5',
        usuarioId: '3'
      };

      // Configurar mocks para simular usuario ya asignado
      mockPool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT proyecto_id FROM tareas')) {
          return Promise.resolve([[{ proyecto_id: 1 }]]);
        }
        if (query.includes('SELECT 1 FROM usuario_proyecto')) {
          return Promise.resolve([[{}]]); // Usuario pertenece al proyecto
        }
        if (query.includes('SELECT 1 FROM usuario_tarea')) {
          return Promise.resolve([[{}]]); // Usuario ya está asignado
        }
        return Promise.resolve([]);
      });

      // Ejecutar función
      await asignarUsuarioATarea(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('ya está asignado')
      }));
    });
  });

  describe('agregarComentario', () => {
    test('debería agregar un comentario a una tarea', async () => {
      // Configurar req
      mockReq.body = {
        tareaId: '5',
        comentario: 'Este es un comentario de prueba'
      };

      // Configurar mock para la consulta
      mockPool.query.mockResolvedValue([{ insertId: 1 }]);

      // Ejecutar función
      await agregarComentario(mockReq, mockRes);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Comentario')
      }));
    });

    test('debería validar los campos requeridos', async () => {
      // Configurar req sin comentario
      mockReq.body = {
        tareaId: '5',
        comentario: ''
      };

      // Ejecutar función
      await agregarComentario(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('requeridos')
      }));
    });

    test('debería manejar errores de base de datos', async () => {
      // Configurar req
      mockReq.body = {
        tareaId: '5',
        comentario: 'Este es un comentario de prueba'
      };

      // Simular error en la consulta
      mockPool.query.mockRejectedValueOnce(new Error('Error de base de datos'));

      // Ejecutar función
      await agregarComentario(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Error')
      }));
    });
  });
});