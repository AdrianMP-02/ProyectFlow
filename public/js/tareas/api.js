/**
 * Módulo de API para gestión de tareas
 * Contiene funciones para interactuar con el servidor y manipular la interfaz de usuario
 */

// Constantes de configuración
const CONFIG = {
  ACTIVIDADES: {
    INICIALES: 5,
    INCREMENTO: 10,
    MAX_POR_FECHA: 3
  },
  COMENTARIOS: {
    INICIALES: 5,
    INCREMENTO: 10
  },
  ANIMACION: {
    DURACION_MS: 300
  }
};

// Variables globales con valores por defecto
let actividadesVisibles = CONFIG.ACTIVIDADES.INICIALES;
let comentariosVisibles = CONFIG.COMENTARIOS.INICIALES;

/**
 * Actualiza el estado de una tarea en el servidor
 * @param {string|number} tareaId - ID de la tarea
 * @param {string} nuevoEstado - Nuevo estado de la tarea
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function actualizarEstadoTarea(tareaId, nuevoEstado) {
  try {
    const response = await fetch(`/tareas/${tareaId}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Muestra los detalles de una tarea en el panel lateral
 * @param {string|number} tareaId - ID de la tarea
 * @param {boolean} resetContadores - Si debe resetear los contadores de actividades y comentarios
 */
function mostrarDetallesTarea(tareaId, resetContadores = true) {
  // Validación básica del ID
  if (!tareaId) {
    return;
  }

  // Resetear los contadores si es una nueva tarea
  if (resetContadores) {
    actividadesVisibles = CONFIG.ACTIVIDADES.INICIALES;
    comentariosVisibles = CONFIG.COMENTARIOS.INICIALES;
  }

  // Obtener referencias a elementos del DOM
  const menuLateral = document.getElementById('menuLateral');
  const detallesTarea = document.getElementById('detallesTarea');

  if (!menuLateral || !detallesTarea) {
    return;
  }

  // Guardar el tareaId en el menú lateral
  menuLateral.dataset.tareaId = tareaId;

  // Mostrar indicador de carga
  mostrarIndicadorCarga(menuLateral, detallesTarea);

  // Obtener datos de la tarea del servidor
  cargarDatosTarea(tareaId)
    .then(data => procesarDatosTarea(data, menuLateral, detallesTarea))
    .catch(error => manejarErrorCargaTarea(error, menuLateral, detallesTarea, tareaId));
}

/**
 * Muestra el indicador de carga mientras se obtienen los datos
 * @param {HTMLElement} menuLateral - Elemento del menú lateral
 * @param {HTMLElement} detallesTarea - Contenedor de detalles
 */
function mostrarIndicadorCarga(menuLateral, detallesTarea) {
  menuLateral.classList.add('cargando');
  if (!menuLateral.classList.contains('abierto')) {
    menuLateral.classList.add('abierto');
  }

  detallesTarea.innerHTML = '<p class="cargando-indicador">Cargando detalles de la tarea...</p>';
}

/**
 * Carga los datos de la tarea desde el servidor
 * @param {string|number} tareaId - ID de la tarea
 * @returns {Promise<Object>} - Datos de la tarea
 */
async function cargarDatosTarea(tareaId) {
  const response = await fetch(`/tareas/${tareaId}?actLimit=${actividadesVisibles}&comLimit=${comentariosVisibles}`);

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Validar la estructura de datos recibida
  const validacion = validarRespuestaTarea(data);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje);
  }

  return data;
}

/**
 * Procesa los datos de la tarea y actualiza la interfaz
 * @param {Object} data - Datos de la tarea
 * @param {HTMLElement} menuLateral - Elemento del menú lateral
 * @param {HTMLElement} detallesTarea - Contenedor de detalles
 */
function procesarDatosTarea(data, menuLateral, detallesTarea) {
  const { tarea, comentarios, actividades, total_actividades, total_comentarios } = data;

  // Obtener el ID de la tarea desde los datos o del menú lateral
  const tareaId = tarea.id || menuLateral.dataset.tareaId;

  // Verificación de seguridad
  if (!tareaId) {
    menuLateral.classList.remove('cargando');
    detallesTarea.innerHTML = '<div class="error-detalle"><h4>Error de procesamiento</h4><p>No se pudo identificar la tarea</p></div>';
    return;
  }

  // Quitar el indicador de carga
  menuLateral.classList.remove('cargando');

  // Procesar actividades y agruparlas por fecha
  const actividadesPorFecha = agruparActividadesPorFecha(actividades);

  // Construir el contenido HTML
  const contenidoHTML = construirContenidoDetalleTarea(
    tarea,
    comentarios,
    actividades,
    actividadesPorFecha,
    total_actividades,
    total_comentarios
  );

  // Actualizar el contenido del panel
  detallesTarea.innerHTML = contenidoHTML;

  // Agregar la barra de comentarios
  agregarBarraComentarios(menuLateral);

  // Almacenar actividadesPorFecha como atributo de datos
  detallesTarea.setAttribute('data-actividades', JSON.stringify(actividadesPorFecha));

  // Almacenar el ID de la tarea como atributo de datos en detallesTarea también
  detallesTarea.setAttribute('data-tarea-id', tareaId);

  // Configurar event listeners
  configurarEventListeners(tareaId);
}

/**
 * Agrupa las actividades por fecha
 * @param {Array} actividades - Lista de actividades
 * @returns {Object} - Actividades agrupadas por fecha
 */
function agruparActividadesPorFecha(actividades) {
  const actividadesPorFecha = {};

  if (actividades && actividades.length > 0) {
    actividades.forEach(actividad => {
      if (!actividad.fecha_formateada) {
        actividad.fecha_formateada = 'Sin fecha';
      }

      const fecha = actividad.fecha_formateada;
      if (!actividadesPorFecha[fecha]) {
        actividadesPorFecha[fecha] = [];
      }
      actividadesPorFecha[fecha].push(actividad);
    });
  }

  return actividadesPorFecha;
}

/**
 * Construye el HTML para los detalles de la tarea
 * @param {Object} tarea - Datos de la tarea
 * @param {Array} comentarios - Lista de comentarios
 * @param {Array} actividades - Lista de actividades
 * @param {Object} actividadesPorFecha - Actividades agrupadas por fecha
 * @param {number} total_actividades - Total de actividades
 * @param {number} total_comentarios - Total de comentarios
 * @returns {string} - HTML generado
 */
function construirContenidoDetalleTarea(
  tarea,
  comentarios,
  actividades,
  actividadesPorFecha,
  total_actividades,
  total_comentarios
) {
  // 1. Sección de información básica
  let contenidoHTML = construirSeccionInfoBasica(tarea);

  // 2. Sección de actividades
  contenidoHTML += construirSeccionActividades(actividades, actividadesPorFecha, total_actividades);

  // 3. Sección de comentarios
  contenidoHTML += construirSeccionComentarios(comentarios, total_comentarios);

  return contenidoHTML;
}

/**
 * Construye la sección de información básica de la tarea
 * @param {Object} tarea - Datos de la tarea
 * @returns {string} - HTML generado
 */
function construirSeccionInfoBasica(tarea) {
  return `
    <h3>${tarea.titulo}</h3>
    <div class="info-basica">
      <p><strong>Descripción:</strong> ${tarea.descripcion || 'Sin descripción'}</p>
      <p><strong>Responsable:</strong> ${tarea.responsable_nombre || 'No asignado'}</p>
      <p><strong>Estado:</strong> ${formatearEstado(tarea.estado)}</p>
      <p><strong>Prioridad:</strong> ${tarea.prioridad}</p>
      <p><strong>Fecha de Vencimiento:</strong> ${tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toLocaleDateString() : 'No definida'}</p>
    </div>
  `;
}

/**
 * Construye la sección de actividades
 * @param {Array} actividades - Lista de actividades
 * @param {Object} actividadesPorFecha - Actividades agrupadas por fecha
 * @param {number} total_actividades - Total de actividades
 * @returns {string} - HTML generado
 */
function construirSeccionActividades(actividades, actividadesPorFecha, total_actividades) {
  let contenidoHTML = `
    <div class="seccion-desplegable" id="actividadesSection">
      <div class="desplegable-header">
        <h3>
          <span class="icono-toggle">▼</span>
          Historial de actividad
          ${total_actividades > 0 ? `<span class="contador">(${total_actividades})</span>` : ''}
        </h3>
      </div>
      <div class="desplegable-content">
  `;

  if (actividades && actividades.length > 0) {
    // Obtener las fechas ordenadas
    const fechasOrdenadas = Object.keys(actividadesPorFecha);

    // Generar HTML para cada grupo de fecha
    fechasOrdenadas.forEach(fecha => {
      contenidoHTML += construirGrupoActividadesPorFecha(fecha, actividadesPorFecha[fecha]);
    });

    // Si hay más actividades de las mostradas, añadir botón general
    if (total_actividades > actividades.length) {
      contenidoHTML += `
        <div class="ver-mas-general">
          <button id="btnVerMasActividades">
            Cargar más actividades (${actividades.length} de ${total_actividades})
          </button>
        </div>
      `;
    }
  } else {
    // No hay actividades
    contenidoHTML += '<p class="no-actividades">No hay actividades registradas para esta tarea.</p>';
  }

  // Cerrar sección de actividades
  contenidoHTML += `
      </div>
    </div>
  `;

  return contenidoHTML;
}

/**
 * Construye el HTML para un grupo de actividades de una fecha específica
 * @param {string} fecha - Fecha formateada
 * @param {Array} actividades - Lista de actividades de esa fecha
 * @returns {string} - HTML generado
 */
function construirGrupoActividadesPorFecha(fecha, actividades) {
  // Crear separador de fecha
  let html = `<div class="fecha-actividad">${fecha}</div>`;

  // Mostrar solo hasta el máximo por fecha
  const maxPorFecha = CONFIG.ACTIVIDADES.MAX_POR_FECHA;
  const actividadesMostrar = actividades.slice(0, maxPorFecha);
  const actividadesOcultas = actividades.length > maxPorFecha ?
    actividades.length - maxPorFecha : 0;

  // Generar HTML para cada actividad visible
  actividadesMostrar.forEach(actividad => {
    html += `
      <div class="actividad-item">
        <div class="actividad-icon">${obtenerIconoActividad(actividad.tipo_actividad)}</div>
        <div class="actividad-contenido">
          <strong>${actividad.nombre || 'Usuario'}</strong> ${actividad.descripcion}
          <small>${formatearHora(actividad.fecha_actividad)}</small>
        </div>
      </div>
    `;
  });

  // Si hay actividades ocultas para esta fecha, mostrar botón
  if (actividadesOcultas > 0) {
    html += `
      <div class="ver-mas-fecha">
        <button class="btn-ver-mas-fecha" data-fecha="${fecha}">
          Ver ${actividadesOcultas} actividad${actividadesOcultas > 1 ? 'es' : ''} más
        </button>
      </div>
    `;
  }

  return html;
}

/**
 * Construye la sección de comentarios
 * @param {Array} comentarios - Lista de comentarios
 * @param {number} total_comentarios - Total de comentarios
 * @returns {string} - HTML generado
 */
function construirSeccionComentarios(comentarios, total_comentarios) {
  let contenidoHTML = `
    <div class="seccion-desplegable" id="comentariosSection">
      <div class="desplegable-header">
        <h3>
          <span class="icono-toggle">▼</span>
          Comentarios
          ${total_comentarios > 0 ? `<span class="contador">(${total_comentarios})</span>` : ''}
        </h3>
      </div>
      <div class="desplegable-content">
  `;

  if (comentarios && comentarios.length > 0) {
    contenidoHTML += '<div id="listaComentarios" class="comentarios-lista">';

    // Crear los comentarios
    comentarios.forEach(comentario => {
      contenidoHTML += `
        <div class="comentario">
          <div class="comentario-header">
            <strong>${comentario.nombre}</strong>
            <small>${formatearFechaCompleta(comentario.fecha_creacion)}</small>
          </div>
          <p>${comentario.comentario}</p>
        </div>
      `;
    });

    contenidoHTML += '</div>';

    // Si hay más comentarios que los mostrados, añadir botón
    if (total_comentarios > comentarios.length) {
      contenidoHTML += `
        <div class="ver-mas-comentarios">
          <button id="btnVerMasComentarios">
            Ver más comentarios (${comentarios.length} de ${total_comentarios})
          </button>
        </div>
      `;
    }
  } else {
    // No hay comentarios
    contenidoHTML += '<p class="no-comentarios">No hay comentarios todavía</p>';
  }

  // Cerrar sección de comentarios
  contenidoHTML += `
      </div>
    </div>
  `;

  return contenidoHTML;
}

/**
 * Agrega la barra de comentarios al menú lateral
 * @param {HTMLElement} menuLateral - Elemento del menú lateral
 */
function agregarBarraComentarios(menuLateral) {
  // Verificar si ya existe una barra anterior y eliminarla
  const barraAnterior = document.querySelector('.barra-inferior-comentarios');
  if (barraAnterior) {
    barraAnterior.remove();
  }

  // Crear la nueva barra
  const barraComentarios = document.createElement('div');
  barraComentarios.className = 'barra-inferior-comentarios';
  barraComentarios.innerHTML = `
    <div class="nuevo-comentario-container">
      <textarea id="nuevoComentario" placeholder="Escribe un comentario..."></textarea>
      <button id="btnAgregarComentario">Comentar</button>
    </div>
  `;

  // Añadir la barra al menú lateral
  menuLateral.appendChild(barraComentarios);
}

/**
 * Configura los event listeners para los elementos interactivos
 * @param {string|number} tareaId - ID de la tarea
 */
function configurarEventListeners(tareaId) {
  // Convertir tareaId a string para evitar problemas con comparaciones
  const idTarea = String(tareaId);

  // Añadir event listeners para los desplegables
  agregarEventListenersDesplegables();

  // Añadir event listeners para los botones con un pequeño retraso
  // para asegurar que el DOM está completamente actualizado
  setTimeout(() => {
    // Para actividades por fecha
    document.querySelectorAll('.btn-ver-mas-fecha').forEach(btn => {
      btn.addEventListener('click', function () {
        const fecha = this.dataset.fecha;
        const actividadesContainer = document.querySelector('#actividadesSection .desplegable-content');

        try {
          // Recuperar el objeto actividadesPorFecha almacenado
          const detallesTarea = document.getElementById('detallesTarea');
          if (!detallesTarea) return;

          const actividadesPorFechaStr = detallesTarea.getAttribute('data-actividades');
          if (!actividadesPorFechaStr) return;

          const actividadesPorFecha = JSON.parse(actividadesPorFechaStr);

          if (actividadesPorFecha && actividadesPorFecha[fecha]) {
            expandirActividadesFecha(actividadesContainer, fecha, actividadesPorFecha[fecha]);
            this.parentElement.remove();
          }
        } catch (error) {
          console.error('Error al procesar actividades por fecha:', error);
        }
      });
    });

    // Para más actividades en general
    const btnVerMasActividades = document.getElementById('btnVerMasActividades');
    if (btnVerMasActividades) {
      btnVerMasActividades.addEventListener('click', function () {
        actividadesVisibles += CONFIG.ACTIVIDADES.INCREMENTO;
        mostrarDetallesTarea(idTarea, false);
      });
    }

    // Para más comentarios
    const btnVerMasComentarios = document.getElementById('btnVerMasComentarios');
    if (btnVerMasComentarios) {
      btnVerMasComentarios.addEventListener('click', function () {
        comentariosVisibles += CONFIG.COMENTARIOS.INCREMENTO;
        mostrarDetallesTarea(idTarea, false);
      });
    }

    // Para agregar comentario
    const btnAgregarComentario = document.getElementById('btnAgregarComentario');
    if (btnAgregarComentario) {
      btnAgregarComentario.addEventListener('click', function () {
        agregarComentarioParaTarea(idTarea);
      });
    }
  }, 50);
}

/**
 * Función específica para agregar comentario a una tarea 
 * @param {string|number} tareaId - ID de la tarea
 */
function agregarComentarioParaTarea(tareaId) {
  // Verificaciones previas
  if (!tareaId) {
    alert("Error: No se pudo identificar la tarea");
    return;
  }

  // Obtener texto del comentario
  const comentarioInput = document.getElementById('nuevoComentario');
  if (!comentarioInput) {
    alert("Error: No se pudo encontrar el campo de comentario");
    return;
  }

  const comentario = comentarioInput.value;

  // Validar contenido
  if (!comentario.trim()) {
    alert('Por favor, escribe un comentario');
    return;
  }

  // Mostrar indicador de carga
  const boton = document.getElementById('btnAgregarComentario');
  if (!boton) return;

  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Enviando...';

  // Usar una copia local segura del ID (convertida a string)
  const idTareaSeguro = String(tareaId);

  fetch('/tareas/comentarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tareaId: idTareaSeguro, comentario })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Limpiar el textarea después de enviar
      comentarioInput.value = '';

      // Resetear el contador de comentarios para mostrar los más recientes
      comentariosVisibles = CONFIG.COMENTARIOS.INICIALES;

      // Recargar la vista con el ID seguro
      mostrarDetallesTarea(idTareaSeguro, false);

      // Asegurarse de que la sección de comentarios esté expandida
      setTimeout(() => {
        const comentariosSection = document.getElementById('comentariosSection');
        if (comentariosSection && comentariosSection.classList.contains('collapsed')) {
          const header = comentariosSection.querySelector('.desplegable-header');
          if (header) {
            header.click();
          }
        }
      }, 200);
    })
    .catch(error => {
      alert('Error al agregar el comentario: ' + error.message);
    })
    .finally(() => {
      // Restaurar el botón
      if (boton) {
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
    });
}

/**
 * Maneja los errores al cargar la tarea
 * @param {Error} error - Error capturado
 * @param {HTMLElement} menuLateral - Elemento del menú lateral
 * @param {HTMLElement} detallesTarea - Contenedor de detalles
 * @param {string|number} tareaId - ID de la tarea para reintentar
 */
function manejarErrorCargaTarea(error, menuLateral, detallesTarea, tareaId) {
  console.error('Error al cargar la tarea:', error);

  menuLateral.classList.remove('cargando');
  detallesTarea.innerHTML = `
    <div class="error-detalle">
      <h4>Error al cargar los detalles</h4>
      <p>${error.message || 'Ocurrió un problema al comunicarse con el servidor'}</p>
      <button onclick="mostrarDetallesTarea(${tareaId}, true)">Reintentar</button>
    </div>
  `;
}

/**
 * Maneja la lógica de mostrar/ocultar secciones desplegables
 */
function agregarEventListenersDesplegables() {
  document.querySelectorAll('.desplegable-header').forEach(header => {
    header.addEventListener('click', function () {
      // Alternar clase para la sección padre
      const seccion = this.parentElement;
      seccion.classList.toggle('collapsed');

      // Cambiar el ícono
      const icono = this.querySelector('.icono-toggle');
      if (seccion.classList.contains('collapsed')) {
        icono.textContent = '►';
      } else {
        icono.textContent = '▼';
      }

      // Guardar el estado
      guardarEstadoSecciones();
    });
  });

  // Restaurar estados guardados
  setTimeout(restaurarEstadoSecciones, 50);
}

/**
 * Expande las actividades de una fecha específica
 * @param {HTMLElement} contenedor - Contenedor donde se mostrarán las actividades
 * @param {string} fecha - Fecha formateada
 * @param {Array} actividades - Lista de actividades de esa fecha
 */
function expandirActividadesFecha(contenedor, fecha, actividades) {
  if (!actividades || !fecha) return;

  const fechaElement = Array.from(contenedor.querySelectorAll('.fecha-actividad'))
    .find(el => el.textContent === fecha);

  if (!fechaElement) return;

  // Obtener todas las actividades actuales de esta fecha
  const actividadesActuales = [];
  let elemento = fechaElement.nextElementSibling;

  while (elemento &&
    !elemento.classList.contains('fecha-actividad') &&
    !elemento.classList.contains('ver-mas-general')) {
    if (elemento.classList.contains('actividad-item')) {
      actividadesActuales.push(elemento);
    }
    elemento = elemento.nextElementSibling;
  }

  // Determinar cuáles actividades faltan por mostrar
  const actividadesMostradas = actividadesActuales.length;
  const actividadesRestantes = actividades.slice(actividadesMostradas);

  // Si no hay actividades restantes, no hacer nada
  if (actividadesRestantes.length === 0) return;

  // Crear elementos para las actividades restantes
  const fragmento = document.createDocumentFragment();
  actividadesRestantes.forEach(actividad => {
    const actividadDiv = document.createElement('div');
    actividadDiv.classList.add('actividad-item');
    actividadDiv.innerHTML = `
      <div class="actividad-icon">${obtenerIconoActividad(actividad.tipo_actividad)}</div>
      <div class="actividad-contenido">
        <strong>${actividad.nombre || 'Usuario'}</strong> ${actividad.descripcion}
        <small>${formatearHora(actividad.fecha_actividad)}</small>
      </div>
    `;
    fragmento.appendChild(actividadDiv);
  });

  // Insertar las nuevas actividades después de la última actividad actual
  if (actividadesActuales.length > 0) {
    const ultimaActividad = actividadesActuales[actividadesActuales.length - 1];
    ultimaActividad.after(fragmento);
  } else {
    fechaElement.after(fragmento);
  }
}

/**
 * Cierra el menú lateral
 */
function cerrarMenuLateral() {
  const menuLateral = document.getElementById('menuLateral');
  menuLateral.classList.remove('abierto');

  // Quitar la selección visual
  document.querySelectorAll('.tarea').forEach(tarea => {
    tarea.classList.remove('selected');
  });

  // Eliminar la barra de comentarios
  const barraComentarios = document.querySelector('.barra-inferior-comentarios');
  if (barraComentarios) {
    barraComentarios.remove();
  }
}

/**
 * Obtiene el ícono según el tipo de actividad
 * @param {string} tipo - Tipo de actividad
 * @returns {string} - Emoji correspondiente
 */
function obtenerIconoActividad(tipo) {
  const iconos = {
    'creacion': '📝',
    'cambio_estado': '🔄',
    'asignacion': '👤',
    'etiqueta': '🏷️',
    'fecha': '📅',
    'prioridad': '⚡'
  };

  return iconos[tipo] || '📌';
}

/**
 * Formatea la hora de una fecha
 * @param {string} fechaStr - Fecha en formato ISO
 * @returns {string} - Hora formateada (HH:MM)
 */
function formatearHora(fechaStr) {
  if (!fechaStr) return '';

  try {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '00:00';
  }
}

/**
 * Formatea un estado eliminando guiones y capitalizando
 * @param {string} estado - Estado en formato bruto
 * @returns {string} - Estado formateado
 */
function formatearEstado(estado) {
  if (!estado) return 'Desconocido';

  return estado
    .replace(/_/g, ' ')
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/**
 * Formatea una fecha completa
 * @param {string} fechaStr - Fecha en formato ISO
 * @returns {string} - Fecha formateada (DD/MM/YYYY HH:MM)
 */
function formatearFechaCompleta(fechaStr) {
  if (!fechaStr) return '';

  try {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Fecha desconocida';
  }
}

/**
 * Valida la estructura de los datos de tarea recibidos
 * @param {Object} data - Datos recibidos del servidor
 * @returns {Object} - Resultado de la validación
 */
function validarRespuestaTarea(data) {
  // Verificar estructura básica
  if (!data) return { valido: false, mensaje: 'No se recibieron datos del servidor' };
  if (!data.tarea) return { valido: false, mensaje: 'No se encontró información de la tarea' };

  // Verificar que los arrays existan (aunque estén vacíos)
  if (!Array.isArray(data.comentarios)) return { valido: false, mensaje: 'Datos de comentarios incorrectos' };
  if (!Array.isArray(data.actividades)) return { valido: false, mensaje: 'Datos de actividades incorrectos' };

  // Verificar contadores
  if (typeof data.total_comentarios !== 'number') return { valido: false, mensaje: 'Total de comentarios incorrecto' };
  if (typeof data.total_actividades !== 'number') return { valido: false, mensaje: 'Total de actividades incorrecto' };

  return { valido: true };
}

/**
 * Guarda el estado de las secciones desplegables en localStorage
 */
function guardarEstadoSecciones() {
  // Obtener el estado actual de cada sección
  const secciones = document.querySelectorAll('.seccion-desplegable');
  const estados = {};

  secciones.forEach(seccion => {
    const id = seccion.id || seccion.querySelector('h3').textContent.trim();
    estados[id] = seccion.classList.contains('collapsed');
  });

  // Guardar en localStorage
  localStorage.setItem('seccionesDesplegables', JSON.stringify(estados));
}

/**
 * Restaura el estado de las secciones desde localStorage
 */
function restaurarEstadoSecciones() {
  try {
    const estadosGuardados = JSON.parse(localStorage.getItem('seccionesDesplegables'));
    if (!estadosGuardados) return;

    const secciones = document.querySelectorAll('.seccion-desplegable');
    secciones.forEach(seccion => {
      const id = seccion.id || seccion.querySelector('h3').textContent.trim();

      if (estadosGuardados[id]) {
        // Si estaba colapsada, colapsar
        seccion.classList.add('collapsed');
        const icono = seccion.querySelector('.icono-toggle');
        if (icono) icono.textContent = '►';
      }
    });
  } catch (e) {
    // Ignorar errores y continuar
  }
}

/**
 * Carga una tarea de forma segura validando el ID
 * @param {string|number} id - ID de la tarea
 */
function cargarTarea(id) {
  try {
    // Validar que el ID sea un número
    const tareaId = parseInt(id);
    if (isNaN(tareaId) || tareaId <= 0) {
      alert('El ID de tarea no es válido');
      return;
    }

    // Cargar la tarea
    mostrarDetallesTarea(tareaId, true);
  } catch (error) {
    alert('Ocurrió un error al intentar cargar la tarea');
  }
}

/**
 * Inicializa los eventos para los detalles de tareas
 */
function inicializarEventosDetalleTareas() {
  document.querySelectorAll('.tarea-card').forEach(card => {
    card.addEventListener('click', function () {
      const tareaId = this.dataset.tareaId;
      if (tareaId) {
        cargarTarea(tareaId);
      }
    });
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
  inicializarEventosDetalleTareas();
});

// Exportar funciones públicas
window.mostrarDetallesTarea = mostrarDetallesTarea;
window.cerrarMenuLateral = cerrarMenuLateral;
window.cargarTarea = cargarTarea;