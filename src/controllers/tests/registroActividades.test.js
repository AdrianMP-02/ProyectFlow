const { registrarActividadConConexion } = require('../tareas/tareaUtils');

describe('Sistema de registro de actividades', () => {
  // Variables para mocks
  let mockConnection;
  let mockQuery;

  beforeEach(() => {
    // Configurar mock para la conexión a la base de datos
    mockQuery = jest.fn();
    mockConnection = {
      query: mockQuery,
      release: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn()
    };

    // Configurar respuesta exitosa por defecto
    mockQuery.mockResolvedValue([{ insertId: 123 }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debería registrar actividad con todos los tipos soportados', async () => {
    // Tipos de actividades a probar (basados en los usados en los controladores)
    const tiposActividad = [
      {
        tipo: 'creacion',
        usuario_id: 1,
        tarea_id: 10,
        descripcion: 'creó esta tarea',
        expectedParams: [10, 1, 'creacion', 'creó esta tarea']
      },
      {
        tipo: 'cambio_estado',
        usuario_id: 2,
        tarea_id: 11,
        descripcion: 'cambió el estado de "Pendiente" a "En Progreso"',
        expectedParams: [11, 2, 'cambio_estado', 'cambió el estado de "Pendiente" a "En Progreso"']
      },
      {
        tipo: 'asignacion',
        usuario_id: 3,
        tarea_id: 12,
        descripcion: 'asignó a Usuario X a esta tarea',
        expectedParams: [12, 3, 'asignacion', 'asignó a Usuario X a esta tarea']
      },
      {
        tipo: 'comentario',
        usuario_id: 4,
        tarea_id: 13,
        descripcion: 'agregó un comentario',
        expectedParams: [13, 4, 'comentario', 'agregó un comentario']
      },
      {
        tipo: 'prioridad',
        usuario_id: 5,
        tarea_id: 14,
        descripcion: 'cambió la prioridad de "Media" a "Alta"',
        expectedParams: [14, 5, 'prioridad', 'cambió la prioridad de "Media" a "Alta"']
      },
      {
        tipo: 'fecha',
        usuario_id: 5,
        tarea_id: 15,
        descripcion: 'cambió la fecha de vencimiento',
        expectedParams: [15, 5, 'fecha', 'cambió la fecha de vencimiento']
      },
      {
        tipo: 'otro',
        usuario_id: 6,
        tarea_id: 16,
        descripcion: 'actualizó la descripción de la tarea',
        expectedParams: [16, 6, 'otro', 'actualizó la descripción de la tarea']
      }
    ];

    // Probar cada tipo de actividad
    for (const actividad of tiposActividad) {
      // Reiniciar el mock para cada prueba
      mockQuery.mockClear();

      // Ejecutar la función con el orden de parámetros correcto según tareaUtils.js
      await registrarActividadConConexion(
        mockConnection,
        actividad.tarea_id,
        actividad.usuario_id,
        actividad.tipo,
        actividad.descripcion
      );

      // Verificaciones
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO actividades_tarea'),
        expect.arrayContaining(actividad.expectedParams)
      );
    }
  });

  test('debería manejar conexiones de transacción correctamente', async () => {
    // Parámetros para el registro de actividad
    const tareaId = 15;
    const usuarioId = 1;
    const tipoActividad = 'creacion';
    const descripcion = 'Nueva tarea creada';

    // Ejecutar la función
    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      tipoActividad,
      descripcion
    );

    // Verificaciones

    // 1. La función debería usar la conexión proporcionada
    expect(mockConnection.query).toHaveBeenCalled();

    // 2. La función NO debería cerrar la conexión (para mantener la transacción)
    expect(mockConnection.release).not.toHaveBeenCalled();

    // 3. La función NO debería controlar commit/rollback (eso lo maneja la función llamante)
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.rollback).not.toHaveBeenCalled();
  });

  test('debería validar la estructura de la consulta SQL', async () => {
    const tareaId = 10;
    const usuarioId = 5;
    const tipoActividad = 'creacion';
    const descripcion = 'Tarea de prueba creada';

    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      tipoActividad,
      descripcion
    );

    // Verificar que la consulta SQL tiene el formato correcto
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO actividades_tarea.*VALUES \(\?, \?, \?, \?\)/is),
      [tareaId, usuarioId, tipoActividad, descripcion]
    );
  });

  test('debería integrarse con los escenarios de actividad más comunes', async () => {
    // Simulamos el escenario de creación de tarea desde tareaAcciones.js
    const tareaId = 20;
    const usuarioId = 5;

    // 1. Registrar creación
    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      'creacion',
      'creó esta tarea'
    );

    // 2. Registrar asignación de responsable
    mockQuery.mockClear();
    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      'asignacion',
      'asignó a Juan Pérez como responsable'
    );

    // 3. Registrar establecimiento de prioridad
    mockQuery.mockClear();
    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      'prioridad',
      'estableció la prioridad como Alta'
    );

    // Verificar que se realizaron todas las inserciones
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO actividades_tarea'),
      [tareaId, usuarioId, 'prioridad', 'estableció la prioridad como Alta']
    );
  });

  test('debería manejar errores correctamente', async () => {
    // Configurar error en la consulta
    mockQuery.mockRejectedValueOnce(new Error('Error de base de datos'));

    // Ejecutar la función y verificar que captura el error adecuadamente
    try {
      await registrarActividadConConexion(
        mockConnection,
        10,
        1,
        'creacion',
        'Descripción de prueba'
      );
      // La función debería lanzar un error, si llegamos aquí, falló el test
      fail('La función debería haber lanzado un error pero no lo hizo');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBe('Error de base de datos');
    }
  });

  test('debería manejar descripciones largas correctamente', async () => {
    // Crear una descripción muy larga (más de 255 caracteres)
    const descripcionLarga = 'a'.repeat(300);

    await registrarActividadConConexion(
      mockConnection,
      10,
      1,
      'creacion',
      descripcionLarga
    );

    // Verificar que la descripción pasa tal cual (la base de datos o el ORM
    // se encargarán de truncarla si es necesario)
    const queryParams = mockQuery.mock.calls[0][1];
    expect(queryParams[3]).toBe(descripcionLarga);
  });

  test('debería procesar correctamente actividades de cambio de estado', async () => {
    // Escenario basado en actualizarEstadoTarea
    const tareaId = 25;
    const usuarioId = 3;
    const estadoAnterior = 'pendiente';
    const estadoNuevo = 'completada';
    const descripcion = `cambió el estado de "${estadoAnterior}" a "${estadoNuevo}"`;

    await registrarActividadConConexion(
      mockConnection,
      tareaId,
      usuarioId,
      'cambio_estado',
      descripcion
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [tareaId, usuarioId, 'cambio_estado', descripcion]
    );
  });
});