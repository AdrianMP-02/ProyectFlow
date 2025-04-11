/**
 * Función para formatear el estado de la tarea (eliminar guiones y capitalizar)
 * @param {string} estado - Estado en formato bruto
 * @returns {string} Estado formateado
 */
function formatearEstado(estado) {
  if (!estado) return '';

  // Reemplazar guiones bajos por espacios y capitalizar cada palabra
  return estado.replace(/_/g, ' ')
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// Variables globales
let tareaArrastrada = null;

/**
 * Función para manejar la selección de tarea con clic
 * @param {Event} event - Evento del navegador
 * @param {string} tareaId - ID de la tarea seleccionada
 */
function seleccionarTarea(event, tareaId) {
  // Remover selección de todas las tareas
  document.querySelectorAll('.tarea').forEach(tarea => {
    tarea.classList.remove('selected');
  });

  // Seleccionar la tarea actual
  event.currentTarget.classList.add('selected');

  // Mostrar detalles de la tarea
  mostrarDetallesTarea(tareaId);
}

/**
 * Muestra una notificación al usuario
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación ('exito' o 'error')
 */
function mostrarNotificacion(mensaje, tipo = 'exito') {
  if (tipo === 'error') {
    console.error(mensaje);
    alert(mensaje);
  } else {
    console.log(mensaje);
  }
}

/**
 * Inicia el proceso de arrastrar una tarea
 * @param {DragEvent} event - Evento de arrastre
 * @param {string} tareaId - ID de la tarea arrastrada
 */
function iniciarArrastre(event, tareaId) {
  tareaArrastrada = tareaId;
  event.dataTransfer.setData('text/plain', tareaId);
  event.currentTarget.classList.add('dragging');

  // Añadir pequeño retraso para que el efecto visual sea mejor
  setTimeout(() => {
    event.currentTarget.style.opacity = '0.5';
  }, 0);
}

/**
 * Permite soltar la tarea en una columna
 * @param {DragEvent} event - Evento de arrastre
 */
function permitirSoltar(event) {
  event.preventDefault();

  // Añadir efecto visual a la columna
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.classList.remove('drag-over');
  });

  // Resaltar solo la columna actual
  event.currentTarget.classList.add('drag-over');
}

/**
 * Actualiza el estado de una tarea en el servidor
 * @param {string} tareaId - ID de la tarea
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
    console.error('Error en la petición:', error);
    throw error;
  }
}

/**
 * Restaura la apariencia visual de una tarea arrastrada
 * @param {HTMLElement} elementoTarea - Elemento DOM de la tarea
 */
function restaurarAparienciaTarea(elementoTarea) {
  if (elementoTarea) {
    elementoTarea.classList.remove('dragging');
    elementoTarea.style.opacity = '1';
  }
}

/**
 * Maneja el evento de soltar una tarea en una columna
 * @param {DragEvent} event - Evento de soltar
 * @param {string} nuevoEstado - Estado de la columna donde se soltó
 */
function soltarTarea(event, nuevoEstado) {
  event.preventDefault();

  // Quitar efectos visuales de todas las columnas
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.classList.remove('drag-over');
  });

  const tareaId = event.dataTransfer.getData('text/plain');
  if (!tareaId) return;

  // Encontrar el elemento arrastrado
  const elementoArrastrado = document.querySelector(`.tarea[data-id="${tareaId}"]`);

  // Actualizar el estado en el servidor
  actualizarEstadoTarea(tareaId, nuevoEstado)
    .then(resultado => {
      if (resultado.success) {
        // Restaurar apariencia normal
        restaurarAparienciaTarea(elementoArrastrado);

        // Mover visualmente la tarea a la nueva columna
        const nuevaColumna = document.querySelector(`.kanban-column[data-estado="${nuevoEstado}"]`);
        if (nuevaColumna && elementoArrastrado) {
          nuevaColumna.appendChild(elementoArrastrado);

          // Si la tarea está seleccionada, también actualizar los detalles
          if (elementoArrastrado.classList.contains('selected')) {
            mostrarDetallesTarea(tareaId);
          }
        }
      } else {
        const mensaje = 'Error al actualizar el estado de la tarea. Por favor, intenta nuevamente.';
        mostrarNotificacion(resultado.message || mensaje, 'error');
        restaurarAparienciaTarea(elementoArrastrado);
      }
    })
    .catch(error => {
      mostrarNotificacion('Error al actualizar el estado de la tarea. Por favor, intenta nuevamente.', 'error');
      restaurarAparienciaTarea(elementoArrastrado);
    });
}