const { obtenerActividades, agregarActividad } = require('../../controllers/actividadesController');
const { getPool } = require('../../config/database');

// Mock de la dependencia de base de datos
jest.mock('../../config/database');

describe('actividadesController', () => {
	let req, res, mockPool;

	beforeEach(() => {
		// Limpiar todos los mocks antes de cada prueba
		jest.clearAllMocks();

		// Configurar los objetos request y response
		req = {
			params: {
				tareaId: 123
			},
			body: {
				tareaId: 123,
				descripcion: 'Nueva actividad',
				tipo: 'manual'
			},
			session: {
				userId: 456
			}
		};

		res = {
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis()
		};

		// Configurar el pool mock
		mockPool = {
			query: jest.fn()
		};

		// Configurar el mock de getPool para devolver el mockPool
		getPool.mockResolvedValue(mockPool);
	});

	describe('obtenerActividades', () => {
		test('debería devolver una lista vacía cuando no hay actividades', async () => {
			// Configurar respuesta del mock como array vacío
			mockPool.query.mockResolvedValue([[]]);

			// Ejecutar la función a probar
			await obtenerActividades(req, res);

			// Verificar que se devuelve un array vacío
			expect(res.json).toHaveBeenCalledWith([]);
			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT * FROM actividades WHERE tarea_id = ? ORDER BY fecha_creacion DESC',
				[123]
			);
		});

		test('debería obtener actividades correctamente', async () => {
			// Preparar los datos de prueba
			const actividadesMock = [
				{ id: 1, tarea_id: 123, descripcion: 'Actividad 1' },
				{ id: 2, tarea_id: 123, descripcion: 'Actividad 2' }
			];

			// Configurar respuesta del mock
			mockPool.query.mockResolvedValue([actividadesMock]);

			// Ejecutar la función a probar
			await obtenerActividades(req, res);

			// Verificar que se llamaron los métodos correctos
			expect(getPool).toHaveBeenCalled();
			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT * FROM actividades WHERE tarea_id = ? ORDER BY fecha_creacion DESC',
				[123]
			);
			expect(res.json).toHaveBeenCalledWith(actividadesMock);
		});

		test('debería manejar errores correctamente en obtenerActividades', async () => {
			// Simular un error en la consulta
			const errorMock = new Error('Error de conexión');
			mockPool.query.mockRejectedValue(errorMock);

			// Espiar console.error
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			// Ejecutar la función a probar
			await obtenerActividades(req, res);

			// Verificar que se manejó el error correctamente
			expect(consoleSpy).toHaveBeenCalledWith('Error al obtener las actividades:', errorMock);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				error: 'Error del servidor',
				mensaje: 'No se pudieron recuperar las actividades. Inténtelo de nuevo más tarde.'
			});

			// Restaurar console.error
			consoleSpy.mockRestore();
		});
	});

	describe('agregarActividad', () => {
		test('debería validar datos obligatorios - sin tareaId', async () => {
			// Modificar request para quitar tareaId del body
			req.body = {
				descripcion: 'Nueva actividad',
				tipo: 'manual'
			};

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se validaron los datos
			// No verificamos getPool ya que esto depende de la implementación interna
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: 'Datos incompletos',
				mensaje: 'El ID de tarea y la descripción son obligatorios'
			});
		});

		test('debería validar datos obligatorios - sin descripción', async () => {
			// Caso sin descripción
			req.body = {
				tareaId: 123,
				tipo: 'manual'
			};

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se validaron los datos
			// No verificamos getPool ya que esto depende de la implementación interna
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: 'Datos incompletos',
				mensaje: 'El ID de tarea y la descripción son obligatorios'
			});
		});

		test('debería agregar una actividad correctamente', async () => {
			// Simular resultado de inserción
			const insertResultMock = { insertId: 789 };
			mockPool.query.mockResolvedValue([insertResultMock]);

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se llamaron los métodos correctos
			expect(getPool).toHaveBeenCalled();
			expect(mockPool.query).toHaveBeenCalledWith(
				'INSERT INTO actividades (usuario_id, tarea_id, descripcion, tipo_actividad) VALUES (?, ?, ?, ?)',
				[456, 123, 'Nueva actividad', 'manual']
			);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Actividad agregada correctamente',
				actividadId: 789
			});
		});

		test('debería aceptar diferentes tipos de actividad', async () => {
			// Probar con un tipo diferente al predeterminado
			req.body.tipo = 'automática';

			const insertResultMock = { insertId: 791 };
			mockPool.query.mockResolvedValue([insertResultMock]);

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se usó el tipo personalizado
			expect(mockPool.query).toHaveBeenCalledWith(
				'INSERT INTO actividades (usuario_id, tarea_id, descripcion, tipo_actividad) VALUES (?, ?, ?, ?)',
				[456, 123, 'Nueva actividad', 'automática']
			);
			expect(res.status).toHaveBeenCalledWith(201);
		});

		test('debería usar tipo por defecto si no se proporciona', async () => {
			// Modificar request para quitar el tipo
			delete req.body.tipo;

			// Simular resultado de inserción
			const insertResultMock = { insertId: 790 };
			mockPool.query.mockResolvedValue([insertResultMock]);

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se llamaron los métodos correctos con el tipo por defecto
			expect(mockPool.query).toHaveBeenCalledWith(
				'INSERT INTO actividades (usuario_id, tarea_id, descripcion, tipo_actividad) VALUES (?, ?, ?, ?)',
				[456, 123, 'Nueva actividad', 'manual']
			);
		});

		test('debería fallar si el usuario no tiene sesión', async () => {
			// Modificar request sin sesión de usuario
			req.session = {};

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se manejan bien los casos con sesión inválida
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				error: 'Error del servidor'
			}));
		});

		test('debería manejar errores correctamente en agregarActividad', async () => {
			// Simular un error en la consulta
			const errorMock = new Error('Error de inserción');
			mockPool.query.mockRejectedValue(errorMock);

			// Espiar console.error
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			// Ejecutar la función a probar
			await agregarActividad(req, res);

			// Verificar que se manejó el error correctamente
			expect(consoleSpy).toHaveBeenCalledWith('Error al agregar la actividad:', errorMock);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				error: 'Error del servidor',
				mensaje: 'No se pudo agregar la actividad. Inténtelo de nuevo más tarde.'
			});

			// Restaurar console.error
			consoleSpy.mockRestore();
		});
	});
});

