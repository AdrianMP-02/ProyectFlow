/**
 * Función para cambiar el estado de un proyecto
 */
function cambiarEstadoProyecto() {
  // Obtener datos necesarios
  const nuevoEstado = document.getElementById('estadoProyecto').value;
  const proyectoId = document.querySelector('main').dataset.proyectoId;

  // Llamar a la función de actualización
  actualizarEstadoProyecto(proyectoId, nuevoEstado)
    .then(exitoso => {
      if (exitoso) {
        mostrarNotificacion('Estado del proyecto actualizado', 'exito');
      } else {
        mostrarNotificacion('Error al actualizar el estado del proyecto', 'error');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      mostrarNotificacion('Error al actualizar el estado del proyecto. Inténtalo de nuevo.', 'error');
    });
}

/**
 * Función para realizar la petición de actualización al servidor
 * @param {string} proyectoId - ID del proyecto a actualizar
 * @param {string} nuevoEstado - Estado que se asignará al proyecto
 * @returns {Promise<boolean>} - Promesa que resuelve a true si la operación fue exitosa
 */
async function actualizarEstadoProyecto(proyectoId, nuevoEstado) {
  try {
    const response = await fetch(`/proyectos/${proyectoId}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error en la petición:', error);
    throw error;
  }
}

/**
 * Muestra una notificación temporal en la pantalla
 * @param {string} mensaje - Texto de la notificación
 * @param {string} tipo - Tipo de notificación ('exito' o 'error')
 * @param {number} duracion - Duración en milisegundos (por defecto 3000ms)
 */
function mostrarNotificacion(mensaje, tipo = 'exito', duracion = 3000) {
  // Crear elemento de notificación
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion ${tipo}`;
  notificacion.textContent = mensaje;

  // Añadir al DOM
  document.body.appendChild(notificacion);

  // Eliminar después del tiempo especificado
  setTimeout(() => {
    notificacion.classList.add('desvanecer');

    // Esperar a que termine la animación de desvanecimiento
    setTimeout(() => {
      notificacion.remove();
    }, 300);
  }, duracion);

  // Si es error, también mostrar en consola
  if (tipo === 'error') {
    console.warn(mensaje);
  }
}