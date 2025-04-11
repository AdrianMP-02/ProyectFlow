// Mock de los módulos externos
jest.mock('../../config/database');
jest.mock('../proyectosController');
jest.mock('../tareasController');

// Importar los módulos necesarios
const { getPool } = require('../../config/database');
const proyectosController = require('../proyectosController');
const tareasController = require('../tareasController');
const dashboardController = require('../dashboardController');

// Mock para console.error para evitar contaminación en tests
console.error = jest.fn();

describe('dashboardController', () => {
  let mockReq, mockRes, mockQuery, mockPool;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = { query: mockQuery };
    getPool.mockResolvedValue(mockPool);

    // Configurar los mocks para req y res
    mockReq = {
      session: {
        userId: 1
      }
    };

    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        usuario: { id: 1, nombre: 'Usuario Test' }
      }
    };

    // Mock de los controladores relacionados
    proyectosController.obtenerProyectos = jest.fn().mockResolvedValue([{ id: 1, nombre: 'Proyecto Test' }]);
    tareasController.obtenerTareasPrioritarias = jest.fn().mockResolvedValue([{ id: 1, titulo: 'Tarea Prioritaria' }]);
    tareasController.obtenerTodasLasTareas = jest.fn().mockResolvedValue([{ id: 1, titulo: 'Tarea Test' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerEstadisticas', () => {
    it('debería devolver estadísticas por defecto si no hay usuarioId', async () => {
      const resultado = await dashboardController.obtenerEstadisticas(null);
      expect(resultado).toEqual({ tareas_pendientes: 0, proximos_vencimientos: 0 });
      expect(getPool).not.toHaveBeenCalled();
    });

    it('debería obtener estadísticas correctamente de la base de datos', async () => {
      mockQuery.mockResolvedValue([[{ tareas_pendientes: 5, proximos_vencimientos: 3 }]]);

      const resultado = await dashboardController.obtenerEstadisticas(1);

      expect(resultado).toEqual({ tareas_pendientes: 5, proximos_vencimientos: 3 });
      expect(getPool).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1, 1]);
    });

    it('debería manejar errores en la consulta de base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Error de base de datos'));

      const resultado = await dashboardController.obtenerEstadisticas(1);

      expect(resultado).toEqual({ tareas_pendientes: 0, proximos_vencimientos: 0 });
      expect(console.error).toHaveBeenCalledWith('Error al obtener estadísticas:', expect.any(Error));
    });
  });

  describe('getDashboard', () => {
    it('debería redirigir a login si no hay userId en la sesión', async () => {
      mockReq.session.userId = null;

      await dashboardController.getDashboard(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?mensaje=session_expired');
    });

    it('debería renderizar dashboard con datos correctos', async () => {
      await dashboardController.getDashboard(mockReq, mockRes);

      expect(proyectosController.obtenerProyectos).toHaveBeenCalledWith(1);
      expect(tareasController.obtenerTareasPrioritarias).toHaveBeenCalledWith(1);
      expect(tareasController.obtenerTodasLasTareas).toHaveBeenCalledWith(1);
      expect(mockRes.render).toHaveBeenCalledWith('dashboard/index', expect.objectContaining({
        usuario: { id: 1, nombre: 'Usuario Test' },
        proyectos: [{ id: 1, nombre: 'Proyecto Test' }],
        tareasPrioritarias: [{ id: 1, titulo: 'Tarea Prioritaria' }],
        tareas: [{ id: 1, titulo: 'Tarea Test' }]
      }));
    });

    it('debería manejar promesas rechazadas y usar valores por defecto', async () => {
      // Simulamos que un servicio falla
      proyectosController.obtenerProyectos.mockRejectedValue(new Error('Error al obtener proyectos'));

      await dashboardController.getDashboard(mockReq, mockRes);

      // Verificar que se renderizan los datos por defecto para proyectos
      expect(mockRes.render).toHaveBeenCalledWith('dashboard/index', expect.objectContaining({
        proyectos: []
      }));
    });

    it('debería manejar errores generales y renderizar con datos por defecto', async () => {
      // Provocar un error en Promise.allSettled
      const originalAllSettled = Promise.allSettled;
      Promise.allSettled = jest.fn().mockRejectedValue(new Error('Error general'));

      await dashboardController.getDashboard(mockReq, mockRes);

      expect(console.error).toHaveBeenCalledWith('Error en el dashboard:', expect.any(Error));
      expect(mockRes.render).toHaveBeenCalledWith('dashboard/index', expect.objectContaining({
        proyectos: [],
        tareas: []
      }));

      // Restaurar original
      Promise.allSettled = originalAllSettled;
    });
  });

  describe('getDashboardData', () => {
    it('debería retornar 401 si no hay userId en la sesión', async () => {
      mockReq.session.userId = null;

      await dashboardController.getDashboardData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    });

    it('debería retornar datos en formato JSON correctamente', async () => {
      await dashboardController.getDashboardData(mockReq, mockRes);

      expect(proyectosController.obtenerProyectos).toHaveBeenCalledWith(1);
      expect(tareasController.obtenerTareasPrioritarias).toHaveBeenCalledWith(1);
      expect(tareasController.obtenerTodasLasTareas).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        proyectos: [{ id: 1, nombre: 'Proyecto Test' }],
        tareasPrioritarias: [{ id: 1, titulo: 'Tarea Prioritaria' }],
        tareas: [{ id: 1, titulo: 'Tarea Test' }]
      }));
    });

    it('debería manejar errores y retornar 500', async () => {
      // Simulamos un error en Promise.allSettled
      const originalAllSettled = Promise.allSettled;
      Promise.allSettled = jest.fn().mockRejectedValue(new Error('Error general'));

      await dashboardController.getDashboardData(mockReq, mockRes);

      expect(console.error).toHaveBeenCalledWith('Error al obtener datos del dashboard:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener datos del dashboard' });

      // Restaurar original
      Promise.allSettled = originalAllSettled;
    });
  });
});