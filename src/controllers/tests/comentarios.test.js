const { agregarComentario } = require('../tareas/tareaAcciones');
const { getPool } = require('../../config/database');

jest.mock('../../config/database');

describe('Sistema de comentarios', () => {
  // Variables para mocks
  let mockReq;
  let mockRes;
  let mockPool;

  beforeEach(() => {
    // Configurar mock para request
    mockReq = {
      body: {
        tareaId: '10',
        comentario: 'Este es un comentario de prueba'
      },
      session: {
        userId: 5
      }
    };

    // Configurar mock para response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Configurar mock para pool de base de datos
    mockPool = {
      query: jest.fn().mockResolvedValue([{ insertId: 1 }])
    };

    // Configurar mock para getPool
    getPool.mockResolvedValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debería agregar un comentario correctamente', async () => {
    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se llamó a la base de datos con los parámetros correctos
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO comentarios'),
      ['10', 5, 'Este es un comentario de prueba']
    );

    // Verificar respuesta
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining('Comentario agregado')
    });
  });

  test('debería validar datos obligatorios', async () => {
    // Probar con comentario vacío
    mockReq.body.comentario = '';

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se validó correctamente
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: expect.stringContaining('requeridos')
    });

    // Resetear mocks
    jest.clearAllMocks();

    // Probar sin tareaId
    mockReq.body = {
      comentario: 'Comentario sin tarea'
    };

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se validó correctamente
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: expect.stringContaining('requeridos')
    });
  });

  test('debería manejar espacios en blanco en comentarios', async () => {
    // Probar con comentario que solo tiene espacios
    mockReq.body.comentario = '   ';

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se validó correctamente
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: expect.stringContaining('requeridos')
    });
  });

  test('debería eliminar espacios adicionales del comentario', async () => {
    // Comentario con espacios adicionales
    mockReq.body.comentario = '  Comentario con espacios adicionales  ';

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se llamó a la base de datos con el comentario sin espacios adicionales
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.anything(),
      ['10', 5, 'Comentario con espacios adicionales']
    );
  });

  test('debería manejar errores de base de datos', async () => {
    // Simular error de base de datos
    mockPool.query.mockRejectedValueOnce(new Error('Error de base de datos'));

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar manejo de error
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Error al guardar')
    });
  });

  test('debería rechazar comentarios muy largos', async () => {
    // Crear un comentario extremadamente largo (simulando límite de base de datos)
    mockReq.body.comentario = 'a'.repeat(10000);

    // Simular error de base de datos por comentario demasiado largo
    mockPool.query.mockRejectedValueOnce(new Error('Data too long for column'));

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar manejo de error
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Error al guardar')
    });
  });

  test('debería registrar usuario desde sesión correctamente', async () => {
    // Cambiar usuario de sesión
    mockReq.session.userId = 42;

    // Ejecutar función
    await agregarComentario(mockReq, mockRes);

    // Verificar que se usó el ID de usuario correcto
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.anything(),
      ['10', 42, 'Este es un comentario de prueba']
    );
  });
});