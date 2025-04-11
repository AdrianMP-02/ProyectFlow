CREATE DATABASE IF NOT EXISTS gestor_proyectos;

USE gestor_proyectos;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado ENUM('pendiente', 'en_progreso', 'completado') DEFAULT 'pendiente',
    creador_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado ENUM('pendiente', 'en_progreso', 'revision_interna', 'revision_cliente', 'finalizado') DEFAULT 'pendiente',
    prioridad ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media',
    fecha_vencimiento DATE,
    responsable_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE TABLE usuario_tarea (
    usuario_id INT,
    tarea_id INT,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, tarea_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE
);

CREATE TABLE usuario_proyecto (
    usuario_id INT,
    proyecto_id INT,
    rol ENUM('admin', 'usuario') DEFAULT 'usuario',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, proyecto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

CREATE TABLE comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT,
    usuario_id INT,
    comentario TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actividades_tarea (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_actividad ENUM('creacion', 'cambio_estado', 'asignacion', 'etiqueta', 'fecha', 'prioridad', 'otro') NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Datos de prueba actualizados para simular un entorno real
-- Mantener los usuarios existentes y añadir más
INSERT INTO usuarios (nombre, email, password) VALUES
('Juan Pérez', 'juan@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u'),
('María López', 'maria@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u'),
('Carlos Rodríguez', 'carlos@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u'),
('Ana Martínez', 'ana@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u'),
('Miguel Sánchez', 'miguel@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u'),
('Laura García', 'laura@example.com', '$2b$10$C6dd/7.L0pW3a04IeRzceebfxl.C/WbwaswHRqg3kw3ifE1yNV68u');

-- Proyectos más detallados y con nombres realistas
INSERT INTO proyectos (nombre, descripcion, fecha_inicio, fecha_fin, estado, creador_id) VALUES
('Rediseño Sitio Web Corporativo', 'Modernización completa del sitio web corporativo con enfoque en experiencia de usuario y optimización SEO', '2025-01-10', '2025-04-15', 'en_progreso', 1),
('App Móvil Gestión de Finanzas', 'Desarrollo de aplicación para iOS y Android que permita a los usuarios controlar sus finanzas personales', '2025-02-01', '2025-06-30', 'pendiente', 2),
('Plataforma E-Learning', 'Plataforma para cursos online con funcionalidades de videoconferencia, evaluaciones y certificados digitales', '2024-11-15', '2025-03-20', 'en_progreso', 1),
('Sistema de Gestión de Inventarios', 'Software para gestión de inventarios con trazabilidad, alertas de stock y generación de informes', '2025-03-01', '2025-07-15', 'pendiente', 3);

-- Tareas realistas para el Proyecto de Rediseño Sitio Web
INSERT INTO tareas (proyecto_id, titulo, descripcion, estado, prioridad, fecha_vencimiento, responsable_id) VALUES
(1, 'Análisis de sitio actual', 'Realizar un análisis completo del sitio web actual, incluyendo métricas de tráfico, puntos débiles y oportunidades de mejora.', 'finalizado', 'Alta', '2025-01-20', 4),
(1, 'Diseño de wireframes', 'Crear wireframes de baja fidelidad para las principales páginas del sitio web.', 'finalizado', 'Alta', '2025-01-30', 2),
(1, 'Diseño UI de página de inicio', 'Diseñar la interfaz de usuario de alta fidelidad para la página de inicio basada en los wireframes aprobados.', 'en_progreso', 'Media', '2025-02-15', 2),
(1, 'Diseño UI de páginas interiores', 'Diseñar las páginas interiores del sitio web siguiendo la línea gráfica establecida.', 'pendiente', 'Media', '2025-02-25', 2),
(1, 'Desarrollo Frontend', 'Implementar el diseño aprobado usando HTML5, CSS3 y JavaScript con enfoque mobile-first.', 'pendiente', 'Alta', '2025-03-15', 1),
(1, 'Optimización SEO on-page', 'Implementar mejoras SEO en todas las páginas incluyendo metadatos, estructura de encabezados y URLs amigables.', 'pendiente', 'Media', '2025-03-20', 4),
(1, 'Pruebas de usabilidad', 'Realizar pruebas con usuarios reales para identificar problemas de usabilidad y recopilar feedback.', 'pendiente', 'Media', '2025-03-30', 6),
(1, 'Implementación de Analytics', 'Configurar Google Analytics y heatmaps para monitorizar el comportamiento de los usuarios.', 'pendiente', 'Baja', '2025-04-05', 3);

-- Tareas para el Proyecto de App Móvil
INSERT INTO tareas (proyecto_id, titulo, descripcion, estado, prioridad, fecha_vencimiento, responsable_id) VALUES
(2, 'Investigación de mercado', 'Analizar apps de finanzas existentes en el mercado, identificar oportunidades y definir propuesta de valor.', 'en_progreso', 'Alta', '2025-02-15', 2),
(2, 'Definición de funcionalidades', 'Crear lista de funcionalidades clave y nice-to-have para la primera versión de la app.', 'pendiente', 'Alta', '2025-02-25', 2),
(2, 'Diseño de experiencia de usuario', 'Crear flujos de usuario y wireframes para las principales funcionalidades de la app.', 'pendiente', 'Alta', '2025-03-15', 6),
(2, 'Desarrollo de backend', 'Implementar API RESTful para gestionar datos de usuarios, transacciones y categorías.', 'pendiente', 'Alta', '2025-04-15', 3),
(2, 'Desarrollo app iOS', 'Desarrollar versión para iOS con Swift siguiendo las guías de Apple HIG.', 'pendiente', 'Media', '2025-05-15', 1),
(2, 'Desarrollo app Android', 'Desarrollar versión para Android con Kotlin siguiendo Material Design.', 'pendiente', 'Media', '2025-05-15', 5);

-- Tareas para el Proyecto de E-Learning
INSERT INTO tareas (proyecto_id, titulo, descripcion, estado, prioridad, fecha_vencimiento, responsable_id) VALUES
(3, 'Diseño de arquitectura de sistema', 'Definir la arquitectura técnica, selección de tecnologías y plan de implementación.', 'finalizado', 'Alta', '2024-12-01', 3),
(3, 'Desarrollo de módulo de usuarios', 'Implementar registro, autenticación, perfiles y gestión de roles.', 'finalizado', 'Alta', '2024-12-20', 1),
(3, 'Desarrollo de módulo de cursos', 'Implementar creación y gestión de cursos, lecciones y materiales.', 'en_progreso', 'Alta', '2025-01-15', 1),
(3, 'Sistema de videoconferencias', 'Integrar solución de videoconferencias para clases en vivo.', 'en_progreso', 'Media', '2025-01-30', 5),
(3, 'Sistema de evaluaciones', 'Desarrollar módulo para crear y gestionar diferentes tipos de evaluaciones.', 'pendiente', 'Media', '2025-02-15', 5),
(3, 'Generación de certificados', 'Implementar sistema para generar certificados personalizados al completar cursos.', 'pendiente', 'Baja', '2025-02-28', 6),
(3, 'Pruebas de rendimiento', 'Realizar pruebas de carga para garantizar que el sistema soporta múltiples usuarios concurrentes.', 'pendiente', 'Media', '2025-03-10', 3);

-- Asignaciones de usuarios a proyectos
INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES
(1, 1, 'admin'),
(2, 1, 'usuario'),
(3, 1, 'usuario'),
(4, 1, 'usuario'),
(6, 1, 'usuario'),
(2, 2, 'admin'),
(1, 2, 'usuario'),
(3, 2, 'usuario'),
(5, 2, 'usuario'),
(6, 2, 'usuario'),
(3, 3, 'admin'),
(1, 3, 'usuario'),
(5, 3, 'usuario'),
(6, 3, 'usuario'),
(3, 4, 'admin'),
(4, 4, 'usuario'),
(5, 4, 'usuario');

-- Asignaciones de usuarios a tareas
INSERT INTO usuario_tarea (usuario_id, tarea_id) VALUES
-- Rediseño Sitio Web
(4, 1), (2, 1), (1, 1), -- Análisis de sitio actual
(2, 2), (6, 2), -- Diseño de wireframes
(2, 3), (6, 3), -- Diseño UI página inicio
(2, 4), (6, 4), -- Diseño UI páginas interiores
(1, 5), (3, 5), -- Desarrollo Frontend
(4, 6), -- Optimización SEO
(6, 7), (4, 7), -- Pruebas de usabilidad
(3, 8), -- Implementación Analytics

-- App Móvil
(2, 9), (6, 9), -- Investigación de mercado
(2, 10), (1, 10), (3, 10), -- Definición de funcionalidades
(6, 11), (2, 11), -- Diseño UX
(3, 12), (5, 12), -- Backend
(1, 13), -- iOS
(5, 14); -- Android

-- Comentarios realistas
INSERT INTO comentarios (tarea_id, usuario_id, comentario, fecha_creacion) VALUES
-- Comentarios para la tarea de Análisis de sitio actual
(1, 4, 'He completado el análisis preliminar del sitio actual. Las principales métricas muestran una tasa de rebote del 65% y un tiempo de permanencia promedio de 1:45 minutos.', '2025-01-15 09:30:00'),
(1, 1, 'Excelente trabajo, Ana. ¿Podrías compartir más detalles sobre las páginas con mayor tasa de rebote?', '2025-01-15 11:45:00'),
(1, 4, 'Claro, Juan. Las páginas con mayor tasa de rebote son la de Contacto (78%) y Productos (72%). También identifiqué problemas de rendimiento en dispositivos móviles.', '2025-01-15 14:20:00'),
(1, 2, 'Podríamos concentrarnos en mejorar estas páginas durante el rediseño. Ana, ¿tienes alguna sugerencia específica?', '2025-01-16 10:15:00'),
(1, 4, 'Sí, María. Para la página de Contacto recomiendo simplificar el formulario actual que tiene demasiados campos. Para Productos sugiero mejorar los filtros y la navegación.', '2025-01-16 15:30:00'),
(1, 1, 'Estoy de acuerdo. Crearemos un backlog con todas estas mejoras y las vamos priorizando.', '2025-01-17 08:45:00'),
(1, 4, 'Acabo de finalizar el informe completo y lo he compartido con todos en el drive del equipo. Incluye heatmaps y grabaciones de sesiones de usuarios.', '2025-01-19 16:50:00'),
(1, 2, 'Excelente trabajo Ana. Lo revisaré para incorporarlo en los wireframes.', '2025-01-19 17:15:00'),

-- Comentarios para la tarea de Diseño de wireframes
(2, 2, 'He comenzado a trabajar en los wireframes. Estoy usando Figma para que podamos colaborar en tiempo real.', '2025-01-22 11:30:00'),
(2, 6, 'María, revisé tus avances. Me gusta el enfoque de la página principal, pero creo que deberíamos reconsiderar la navegación en móvil.', '2025-01-23 14:20:00'),
(2, 2, 'Tienes razón, Laura. Estaba pensando en implementar un menú tipo hamburguesa, pero tal vez hay mejores alternativas. ¿Alguna sugerencia?', '2025-01-23 15:45:00'),
(2, 6, 'Podríamos usar un menú de navegación inferior para las secciones principales, es más accesible para usar con una sola mano.', '2025-01-24 09:10:00'),
(2, 2, 'He implementado tus sugerencias. Acabo de subir la nueva versión. También añadí algunas mejoras en la versión de escritorio.', '2025-01-25 16:30:00'),
(2, 1, 'Los wireframes se ven muy bien. Me gustaría programar una reunión con el cliente para presentarlos y obtener feedback antes de avanzar.', '2025-01-26 10:15:00'),

-- Comentarios para Diseño UI de página de inicio
(3, 2, 'He comenzado a trabajar en el diseño de alta fidelidad para la página de inicio. Estoy usando la paleta de colores corporativos.', '2025-02-01 09:45:00'),
(3, 6, 'María, creo que el hero section podría tener más impacto visual. ¿Has considerado usar una imagen más grande o incluso un video de fondo?', '2025-02-03 11:20:00'),
(3, 2, 'Tienes razón, Laura. Probaré con ambas opciones y veré cuál funciona mejor. También estoy pensando en añadir algunas micro-interacciones.', '2025-02-03 14:35:00');

-- Actividades detalladas para las tareas (Mantengo las existentes y añado más)
INSERT INTO actividades_tarea (tarea_id, usuario_id, tipo_actividad, descripcion, fecha_actividad) VALUES
-- Actividades para Análisis de sitio actual
(1, 1, 'creacion', 'creó esta tarea', '2025-01-12 09:00:00'),
(1, 1, 'asignacion', 'asignó a Ana Martínez como responsable', '2025-01-12 09:02:00'),
(1, 1, 'asignacion', 'añadió a Juan Pérez a esta tarea', '2025-01-12 09:03:00'),
(1, 1, 'asignacion', 'añadió a María López a esta tarea', '2025-01-12 09:03:30'),
(1, 1, 'prioridad', 'estableció la prioridad como Alta', '2025-01-12 09:04:00'),
(1, 1, 'fecha', 'estableció la fecha de vencimiento para 20 ene 2025', '2025-01-12 09:05:00'),
(1, 4, 'cambio_estado', 'cambió el estado de "Pendiente" a "En Progreso"', '2025-01-14 10:30:00'),
(1, 4, 'cambio_estado', 'cambió el estado de "En Progreso" a "Revisión Interna"', '2025-01-19 15:45:00'),
(1, 1, 'cambio_estado', 'cambió el estado de "Revisión Interna" a "Finalizado"', '2025-01-20 11:15:00'),

-- Actividades para Diseño de wireframes
(2, 2, 'creacion', 'creó esta tarea', '2025-01-21 08:30:00'),
(2, 2, 'asignacion', 'se asignó como responsable', '2025-01-21 08:31:00'),
(2, 2, 'asignacion', 'añadió a Laura García a esta tarea', '2025-01-21 08:32:00'),
(2, 2, 'prioridad', 'estableció la prioridad como Alta', '2025-01-21 08:33:00'),
(2, 2, 'fecha', 'estableció la fecha de vencimiento para 30 ene 2025', '2025-01-21 08:34:00'),
(2, 2, 'cambio_estado', 'cambió el estado de "Pendiente" a "En Progreso"', '2025-01-22 09:15:00'),
(2, 1, 'otro', 'adjuntó el archivo "referencias_competencia.pdf"', '2025-01-23 10:45:00'),
(2, 2, 'cambio_estado', 'cambió el estado de "En Progreso" a "Revisión Cliente"', '2025-01-28 16:30:00'),
(2, 1, 'cambio_estado', 'cambió el estado de "Revisión Cliente" a "Finalizado"', '2025-01-30 14:20:00'),

-- Actividades para Diseño UI de página de inicio
(3, 2, 'creacion', 'creó esta tarea', '2025-01-31 15:00:00'),
(3, 2, 'asignacion', 'se asignó como responsable', '2025-01-31 15:01:00'),
(3, 2, 'asignacion', 'añadió a Laura García a esta tarea', '2025-01-31 15:02:00'),
(3, 2, 'prioridad', 'estableció la prioridad como Media', '2025-01-31 15:03:00'),
(3, 2, 'fecha', 'estableció la fecha de vencimiento para 15 feb 2025', '2025-01-31 15:04:00'),
(3, 2, 'cambio_estado', 'cambió el estado de "Pendiente" a "En Progreso"', '2025-02-01 09:30:00'),
(3, 6, 'otro', 'adjuntó el archivo "referencias_ui.zip"', '2025-02-02 11:15:00'),
(3, 2, 'otro', 'compartió enlace a prototipo en Figma', '2025-02-05 14:50:00'),

-- Actividades para Diseño UI de páginas interiores
(4, 2, 'creacion', 'creó esta tarea', '2025-01-31 15:30:00'),
(4, 2, 'asignacion', 'se asignó como responsable', '2025-01-31 15:31:00'),
(4, 2, 'asignacion', 'añadió a Laura García a esta tarea', '2025-01-31 15:32:00'),
(4, 2, 'prioridad', 'estableció la prioridad como Media', '2025-01-31 15:33:00'),
(4, 2, 'fecha', 'estableció la fecha de vencimiento para 25 feb 2025', '2025-01-31 15:34:00'),

-- Actividades para Desarrollo Frontend
(5, 1, 'creacion', 'creó esta tarea', '2025-02-01 10:00:00'),
(5, 1, 'asignacion', 'se asignó como responsable', '2025-02-01 10:01:00'),
(5, 1, 'asignacion', 'añadió a Carlos Rodríguez a esta tarea', '2025-02-01 10:02:00'),
(5, 1, 'prioridad', 'estableció la prioridad como Alta', '2025-02-01 10:03:00'),
(5, 1, 'fecha', 'estableció la fecha de vencimiento para 15 mar 2025', '2025-02-01 10:04:00'),

-- Actividades para Optimización SEO
(6, 1, 'creacion', 'creó esta tarea', '2025-02-01 10:15:00'),
(6, 1, 'asignacion', 'asignó a Ana Martínez como responsable', '2025-02-01 10:16:00'),
(6, 1, 'prioridad', 'estableció la prioridad como Media', '2025-02-01 10:17:00'),
(6, 1, 'fecha', 'estableció la fecha de vencimiento para 20 mar 2025', '2025-02-01 10:18:00'),

-- Actividades para el proyecto de App Móvil
(9, 2, 'creacion', 'creó esta tarea', '2025-02-02 09:00:00'),
(9, 2, 'asignacion', 'se asignó como responsable', '2025-02-02 09:01:00'),
(9, 2, 'asignacion', 'añadió a Laura García a esta tarea', '2025-02-02 09:02:00'),
(9, 2, 'prioridad', 'estableció la prioridad como Alta', '2025-02-02 09:03:00'),
(9, 2, 'fecha', 'estableció la fecha de vencimiento para 15 feb 2025', '2025-02-02 09:04:00'),
(9, 2, 'cambio_estado', 'cambió el estado de "Pendiente" a "En Progreso"', '2025-02-05 11:30:00'),
(9, 6, 'otro', 'adjuntó el archivo "analisis_competencia_apps.xlsx"', '2025-02-07 15:20:00'),
(9, 2, 'otro', 'adjuntó el archivo "encuesta_necesidades_usuarios.pdf"', '2025-02-10 09:45:00');

-- Añadir más comentarios para generar historial extenso
INSERT INTO comentarios (tarea_id, usuario_id, comentario, fecha_creacion) VALUES
-- Más comentarios para Diseño UI de página de inicio
(3, 2, 'He implementado las sugerencias sobre el hero section. He subido dos versiones: una con imagen grande y otra con video de fondo. ¿Cuál prefieren?', '2025-02-05 10:30:00'),
(3, 1, 'Personalmente prefiero la versión con video, da más dinamismo a la página. Pero quizás deberíamos considerar el impacto en el rendimiento.', '2025-02-05 11:15:00'),
(3, 6, 'Coincido con Juan. El video se ve genial, pero asegurémonos de optimizarlo bien y tener un fallback para conexiones lentas.', '2025-02-05 13:45:00'),
(3, 2, 'Buena observación. Implementaré un sistema que cargue el video solo en conexiones rápidas y muestre la imagen en conexiones lentas.', '2025-02-05 15:30:00'),
(3, 1, 'Perfecto. ¿Para cuándo crees que tendrás lista esta implementación?', '2025-02-06 09:10:00'),
(3, 2, 'Debería tenerlo listo para mañana a mediodía. También estoy trabajando en otras secciones de la página de inicio.', '2025-02-06 10:25:00'),
(3, 6, 'María, me gusta mucho cómo está quedando el diseño de los testimoniales. La animación sutil al hacer scroll es un gran toque.', '2025-02-08 14:15:00'),
(3, 2, 'Gracias Laura. Estoy poniendo especial atención a estos detalles para mejorar la experiencia de usuario.', '2025-02-08 15:40:00'),
(3, 1, 'El cliente ha visto el avance y está muy contento. Especialmente le gustó la sección de estadísticas con los contadores animados.', '2025-02-09 10:30:00'),
(3, 2, 'Excelente noticia. Estoy terminando los últimos ajustes y la optimización para dispositivos móviles.', '2025-02-09 12:15:00'),
(3, 3, 'María, ¿has considerado implementar un modo oscuro automático basado en las preferencias del sistema?', '2025-02-10 09:45:00'),
(3, 2, 'Es una gran idea, Carlos. No lo había considerado. Lo añadiré al diseño.', '2025-02-10 10:30:00'),

-- Comentarios para Investigación de mercado (App Móvil)
(9, 2, 'He comenzado la investigación de las apps de finanzas más populares. Hasta ahora he analizado Mint, YNAB y PocketGuard.', '2025-02-05 14:20:00'),
(9, 6, 'Te sugiero incluir también Spendee y Money Manager. Tienen algunas funcionalidades interesantes que podrían inspirarnos.', '2025-02-05 16:45:00'),
(9, 2, 'Gracias por la sugerencia, Laura. Los incluiré en el análisis. ¿Hay algún aspecto específico que crees que deberíamos observar?', '2025-02-06 09:30:00'),
(9, 6, 'Principalmente su manejo de categorías de gastos y la visualización de informes. Spendee tiene unos gráficos muy intuitivos.', '2025-02-06 10:15:00'),
(9, 3, 'También sería bueno analizar cómo manejan la sincronización con cuentas bancarias y la seguridad de los datos.', '2025-02-06 11:30:00'),
(9, 2, 'Excelentes puntos. He creado una matriz comparativa con todos estos aspectos. La compartiré esta tarde.', '2025-02-06 13:45:00'),
(9, 2, 'Acabo de compartir el documento con la comparativa. También añadí una sección sobre oportunidades de mercado.', '2025-02-07 16:30:00'),
(9, 1, 'Revisé la comparativa. Muy completa. Creo que tenemos una buena oportunidad diferenciándonos en la gestión de presupuestos colaborativos.', '2025-02-08 09:15:00'),
(9, 2, 'Estoy de acuerdo, Juan. Ninguna de las apps analizadas maneja bien ese aspecto. Podría ser nuestro punto fuerte.', '2025-02-08 10:30:00'),
(9, 6, 'También podríamos destacar en la integración con el asistente virtual para consultas por voz.', '2025-02-08 14:20:00'),
(9, 2, 'He realizado una pequeña encuesta a 50 usuarios potenciales. La mayoría mencionó que les gustaría mejor visualización de tendencias de gastos.', '2025-02-10 11:45:00'),
(9, 3, 'Interesante hallazgo. Podríamos implementar visualizaciones avanzadas con Machine Learning para predecir tendencias.', '2025-02-10 13:30:00'),
(9, 2, 'Gran idea, Carlos. Lo añadiré a las recomendaciones del informe final.', '2025-02-10 15:20:00'),
(9, 2, 'He completado el informe final de investigación de mercado con todas las sugerencias. Lo compartí por email.', '2025-02-14 16:45:00'),
(9, 1, 'Excelente trabajo, María. Esto nos da una base sólida para definir las funcionalidades.', '2025-02-14 17:30:00');