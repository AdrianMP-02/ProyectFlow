const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const { getPool } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');
const middleware = require('./src/middleware');

// Configuración básica de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware básico
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware de base de datos
app.use(async (req, res, next) => {
    try {
        req.dbPool = await getPool();
        next();
    } catch (error) {
        console.error('Error al obtener la conexión:', error);
        res.status(500).send('Error de servidor');
    }
});

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
    name: 'sessionId'
}));

// Middleware de usuario global
app.use(middleware.loadUserData);

// Middleware para añadir el usuario a todas las vistas
app.use(middleware.addUserToViews);

// Importar rutas de la API
const apiRoutes = require('./src/routes/api');

// Configuración de rutas
const routes = require('./src/routes');

app.use('/', routes.index);
app.use('/', routes.usuarios);
app.use('/proyectos', middleware.requireLogin, routes.proyectos);
app.use('/dashboard', middleware.requireLogin, routes.dashboard);
app.use('/tareas', middleware.requireLogin, routes.tareas);

// Registrar rutas de la API
app.use('/api', apiRoutes);

// Manejo de errores
app.use(errorHandler.notFound);
app.use(errorHandler.general);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;
