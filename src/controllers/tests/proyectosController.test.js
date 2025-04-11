const {
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  actualizarEstadoProyecto,
  verificarPermisos
} = require('../proyectos/proyectosController');
const { getPool } = require('../../config/database');
const AppError = require('../../utils/appError');

jest.mock('../../config/database');

describe('proyectosController', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockPool;
  let mockConnection;

  beforeEach(() => {
    // Configurar mocks para req, res y next
    mockReq = {
      body: {},
      params: {},
      session: { userId: 1 }
    };

    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Configurar mock para la conexión y pool
    mockConnection = {
      query: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      query: jest.fn(),
      getConnection: jest.fn().mockResolvedValue(mockConnection)
    };

    getPool.mockResolvedValue(mockPool);
  });

  describe('verificarPermisos', () => {
    test('debería validar permisos de administrador correctamente', async () => {
      // Configurar respuestas del mock
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5, nombre: 'Proyecto Test' }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'admin' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      const resultado = await verificarPermisos(1, 5, ['admin']);

      // Verificaciones
      expect(resultado.autorizado).toBe(true);
      expect(resultado.rol).toBe('admin');
      expect(resultado.error).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('debería rechazar permisos insuficientes', async () => {
      // Configurar respuestas del mock
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5, nombre: 'Proyecto Test' }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'miembro' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      const resultado = await verificarPermisos(1, 5, ['admin']);

      // Verificaciones
      expect(resultado.autorizado).toBe(false);
      expect(resultado.rol).toBe('miembro');
      expect(resultado.error).toBeInstanceOf(AppError);
      expect(resultado.error.statusCode).toBe(403);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('debería manejar proyecto no encontrado', async () => {
      // Configurar respuestas del mock
      mockPool.query.mockResolvedValueOnce([[]]);

      // Ejecutar la función
      const resultado = await verificarPermisos(1, 999, ['admin']);

      // Verificaciones
      expect(resultado.autorizado).toBe(false);
      expect(resultado.rol).toBeNull();
      expect(resultado.error).toBeInstanceOf(AppError);
      expect(resultado.error.statusCode).toBe(404);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('debería manejar usuario sin acceso al proyecto', async () => {
      // Configurar respuestas del mock
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5, nombre: 'Proyecto Test' }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      const resultado = await verificarPermisos(1, 5, ['admin']);

      // Verificaciones
      expect(resultado.autorizado).toBe(false);
      expect(resultado.rol).toBeNull();
      expect(resultado.error).toBeInstanceOf(AppError);
      expect(resultado.error.statusCode).toBe(403);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('crearProyecto', () => {
    test('debería crear un proyecto y asignar al creador como admin', async () => {
      // Configurar datos de entrada
      mockReq.body = {
        nombre: 'Nuevo Proyecto Test',
        descripcion: 'Descripción del proyecto',
        fecha_inicio: '2025-04-15',
        fecha_fin: '2025-05-15'
      };

      // Configurar respuestas del mock
      mockPool.query.mockImplementation((query) => {
        if (query.includes('INSERT INTO proyectos')) {
          return Promise.resolve([{ insertId: 10 }]);
        } else if (query.includes('INSERT INTO usuario_proyecto')) {
          return Promise.resolve([{ affectedRows: 1 }]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await crearProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      // Verificar que se creó el proyecto con los datos correctos
      expect(mockPool.query.mock.calls[0][0]).toContain('INSERT INTO proyectos');
      expect(mockPool.query.mock.calls[0][1]).toMatchObject({
        nombre: 'Nuevo Proyecto Test',
        descripcion: 'Descripción del proyecto',
        fecha_inicio: '2025-04-15',
        fecha_fin: '2025-05-15',
        estado: 'pendiente',
        creador_id: 1
      });

      // Verificar que se asignó al usuario como admin
      expect(mockPool.query.mock.calls[1][0]).toContain('INSERT INTO usuario_proyecto');
      expect(mockPool.query.mock.calls[1][1]).toEqual([1, 10, 'admin']);

      // Verificar redirección
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('debería validar campos obligatorios', async () => {
      // Configurar datos de entrada incompletos
      mockReq.body = {
        descripcion: 'Solo descripción sin nombre ni fecha'
      };

      // Ejecutar la función
      await crearProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(mockNext.mock.calls[0][0].message).toMatch(/obligatorios/);
    });

    test('debería manejar errores de base de datos', async () => {
      // Configurar datos de entrada
      mockReq.body = {
        nombre: 'Nuevo Proyecto Test',
        descripcion: 'Descripción del proyecto',
        fecha_inicio: '2025-04-15',
        fecha_fin: '2025-05-15'
      };

      // Simular error en la base de datos
      mockPool.query.mockRejectedValueOnce(new Error('Error de conexión'));

      // Ejecutar la función
      await crearProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(500);
    });
  });

  describe('actualizarProyecto', () => {
    test('debería actualizar un proyecto existente', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';
      mockReq.body = {
        nombre: 'Proyecto Actualizado',
        descripcion: 'Nueva descripción',
        fecha_inicio: '2025-05-01',
        fecha_fin: '2025-06-01',
        estado: 'en_progreso'
      };

      // Mockear la verificación de permisos
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'admin' }]]);
        } else if (query.includes('UPDATE proyectos')) {
          return Promise.resolve([{ affectedRows: 1 }]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await actualizarProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE proyectos'),
        expect.arrayContaining([
          'Proyecto Actualizado',
          'Nueva descripción',
          '2025-05-01',
          '2025-06-01',
          'en_progreso',
          '5'
        ])
      );

      expect(mockRes.redirect).toHaveBeenCalledWith('/proyectos/5');
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('debería validar permisos antes de actualizar', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';
      mockReq.body = {
        nombre: 'Proyecto Actualizado',
        fecha_inicio: '2025-05-01'
      };

      // Mockear la verificación de permisos - sin autorización
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'observador' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await actualizarProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
      expect(mockPool.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE proyectos'));
    });
  });

  describe('eliminarProyecto', () => {
    test('debería eliminar un proyecto y sus registros relacionados', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';

      // Mockear la verificación de permisos
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'admin' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await eliminarProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockConnection.beginTransaction).toHaveBeenCalled();

      // Verificar que se eliminaron los registros relacionados
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM usuario_proyecto'),
        ['5']
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tareas'),
        ['5']
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM proyectos'),
        ['5']
      );

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
    });

    test('debería verificar que solo admins pueden eliminar proyectos', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';

      // Mockear la verificación de permisos - usuario no es admin
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'editor' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await eliminarProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockPool.getConnection).not.toHaveBeenCalled();
    });

    test('debería hacer rollback en caso de error', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';

      // Mockear la verificación de permisos
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'admin' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Simular error en la base de datos durante la transacción
      mockConnection.query.mockImplementation((query) => {
        if (query.includes('DELETE FROM tareas')) {
          return Promise.reject(new Error('Error al eliminar tareas'));
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      // Ejecutar la función
      await eliminarProyecto(mockReq, mockRes, mockNext);

      // Verificaciones
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('actualizarEstadoProyecto', () => {
    test('debería actualizar solo el estado de un proyecto', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';
      mockReq.body.estado = 'completado';

      // Mockear la verificación de permisos
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'editor' }]]);
        } else if (query.includes('UPDATE proyectos')) {
          return Promise.resolve([{ affectedRows: 1 }]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await actualizarEstadoProyecto(mockReq, mockRes);

      // Verificaciones
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE proyectos SET estado = ?'),
        ['completado', '5']
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String)
      });
    });

    test('debería validar que el estado es obligatorio', async () => {
      // Configurar datos de entrada sin estado
      mockReq.params.id = '5';
      mockReq.body = {};

      // Ejecutar la función
      await actualizarEstadoProyecto(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('debería validar permisos antes de actualizar estado', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';
      mockReq.body.estado = 'pausado';

      // Mockear la verificación de permisos - usuario sin autorización
      mockPool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'observador' }]]);
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await actualizarEstadoProyecto(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(mockPool.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE proyectos'));
    });

    test('debería manejar errores de base de datos', async () => {
      // Configurar datos de entrada
      mockReq.params.id = '5';
      mockReq.body.estado = 'completado';

      // Mockear la verificación de permisos
      mockPool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM proyectos WHERE id =')) {
          return Promise.resolve([[{ id: 5 }]]);
        } else if (query.includes('SELECT up.rol FROM usuario_proyecto')) {
          return Promise.resolve([[{ rol: 'editor' }]]);
        } else if (query.includes('UPDATE proyectos')) {
          return Promise.reject(new Error('Error de base de datos'));
        }
        return Promise.resolve([[]]);
      });

      // Ejecutar la función
      await actualizarEstadoProyecto(mockReq, mockRes);

      // Verificaciones
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });
});