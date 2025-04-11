/**
 * Módulo para la gestión de usuarios en proyectos
 * Maneja la búsqueda y adición de usuarios a proyectos
 */

document.addEventListener('DOMContentLoaded', function () {
  // Referencias a elementos del DOM
  const btnAnadirUsuario = document.getElementById('btnAnadirUsuario');
  const anadirUsuarioModal = document.getElementById('anadirUsuarioModal');
  const cerrarModalUsuario = document.getElementById('cerrarModalUsuario');
  const buscarUsuarioInput = document.getElementById('buscarUsuario');
  const resultadosBusqueda = document.getElementById('resultadosBusqueda');

  // Obtener el ID del proyecto de la página
  const contenedor = document.querySelector('.content');
  const proyectoId = contenedor ? contenedor.dataset.proyectoId : null;

  if (!proyectoId) {
    console.error('No se pudo encontrar el ID del proyecto');
    return;
  }

  // Funciones de manejo del modal
  function abrirModal() {
    anadirUsuarioModal.style.display = 'flex';
    buscarUsuarioInput.focus();
  }

  function cerrarModal() {
    anadirUsuarioModal.style.display = 'none';
    buscarUsuarioInput.value = '';
    resultadosBusqueda.innerHTML = '';
  }

  // Event listeners para abrir/cerrar el modal
  btnAnadirUsuario.addEventListener('click', abrirModal);
  cerrarModalUsuario.addEventListener('click', cerrarModal);

  // Cerrar al hacer clic fuera del modal
  window.addEventListener('click', function (e) {
    if (e.target === anadirUsuarioModal) {
      cerrarModal();
    }
  });

  // Manejo de la búsqueda de usuarios con debounce
  let timeoutId;
  buscarUsuarioInput.addEventListener('input', function () {
    clearTimeout(timeoutId);

    const termino = this.value.trim();
    if (termino.length < 2) {
      resultadosBusqueda.innerHTML = termino.length === 0
        ? ''
        : '<p>Introduce al menos 2 caracteres para buscar</p>';
      return;
    }

    // Esperar 300ms antes de realizar la búsqueda
    timeoutId = setTimeout(() => {
      buscarUsuarios(termino);
    }, 300);
  });

  /**
   * Busca usuarios que coincidan con el término y no estén ya en el proyecto
   * @param {string} termino - Término de búsqueda (nombre o email)
   */
  function buscarUsuarios(termino) {
    fetch(`/api/usuarios/buscar?termino=${termino}&proyecto_id=${proyectoId}`)
      .then(response => response.json())
      .then(data => {
        mostrarResultadosBusqueda(data);
      })
      .catch(error => {
        console.error('Error al buscar usuarios:', error);
        resultadosBusqueda.innerHTML = '<p>Error al buscar usuarios. Inténtalo de nuevo.</p>';
      });
  }

  /**
   * Muestra los resultados de la búsqueda en el modal
   * @param {Array} usuarios - Lista de usuarios encontrados
   */
  function mostrarResultadosBusqueda(usuarios) {
    if (!Array.isArray(usuarios)) {
      resultadosBusqueda.innerHTML = '<p class="error-busqueda">Formato de respuesta inválido</p>';
      return;
    }

    if (usuarios.length === 0) {
      resultadosBusqueda.innerHTML = '<p>No se encontraron usuarios con ese criterio.</p>';
      return;
    }

    // Construir HTML para cada usuario
    let html = '';
    usuarios.forEach(usuario => {
      html += `
        <div class="usuario-resultado" data-id="${usuario.id}">
          <div class="usuario-info">
            <span class="usuario-nombre">${usuario.nombre || 'Usuario'}</span>
            <span class="usuario-email">${usuario.email || 'Sin email'}</span>
          </div>
          <div class="usuario-actions">
            <select class="rol-select">
              <option value="usuario">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
            <button class="add-user-btn" data-usuario-id="${usuario.id}">Añadir</button>
          </div>
        </div>
      `;
    });

    resultadosBusqueda.innerHTML = html;

    // Agregar event listeners a los botones de añadir
    document.querySelectorAll('.add-user-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const usuarioId = this.dataset.usuarioId;
        const rolSelect = this.parentElement.querySelector('.rol-select');
        const rol = rolSelect.value;

        anadirUsuarioProyecto(usuarioId, rol, this);
      });
    });
  }

  /**
   * Añade un usuario al proyecto actual
   * @param {string|number} usuarioId - ID del usuario a añadir
   * @param {string} rol - Rol del usuario (usuario o admin)
   * @param {HTMLElement} boton - Botón que inició la acción
   */
  function anadirUsuarioProyecto(usuarioId, rol, boton) {
    boton.disabled = true;
    boton.textContent = 'Añadiendo...';

    fetch('/api/proyectos/anadir-usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proyecto_id: proyectoId,
        usuario_id: usuarioId,
        rol: rol
      })
    })
      .then(response => response.json())
      .then(data => {
        // Actualizar UI para mostrar que el usuario fue añadido
        const usuarioResultado = boton.closest('.usuario-resultado');
        const nombreUsuario = usuarioResultado.querySelector('.usuario-nombre').textContent;

        usuarioResultado.innerHTML = `
        <div class="usuario-info">
          <span class="usuario-nombre">${nombreUsuario}</span>
          <span class="usuario-confirmacion">✓ Añadido como ${rol === 'admin' ? 'Administrador' : 'Usuario'}</span>
        </div>
      `;
      })
      .catch(error => {
        console.error('Error al añadir usuario:', error);
        boton.textContent = 'Error';

        // Mostrar mensaje de error
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-mensaje';
        errorMsg.textContent = error.message || 'Error al añadir usuario';
        boton.parentElement.appendChild(errorMsg);

        // Restaurar botón después de un tiempo
        setTimeout(() => {
          boton.disabled = false;
          boton.textContent = 'Añadir';
          if (errorMsg.parentNode) {
            errorMsg.parentNode.removeChild(errorMsg);
          }
        }, 3000);
      });
  }

  // Exponer funciones públicas
  window.buscarUsuarios = buscarUsuarios;
});