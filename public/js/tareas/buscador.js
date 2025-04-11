document.addEventListener('DOMContentLoaded', function () {
  // Datos de usuarios para la búsqueda (se cargan desde el HTML)
  const usuarios = window.usuariosProyecto || [];

  const buscadorInput = document.getElementById('buscador_usuarios');
  const resultadosDiv = document.getElementById('resultados_busqueda');
  const usuariosSeleccionadosDiv = document.getElementById('usuarios_seleccionados');
  const usuariosAsignadosInput = document.getElementById('usuarios_asignados_ids');

  // Array para almacenar los IDs de los usuarios seleccionados
  let usuariosSeleccionados = [];

  // Función para actualizar el input hidden con los IDs
  function actualizarUsuariosAsignados() {
    usuariosAsignadosInput.value = usuariosSeleccionados.join(',');
  }

  // Función para buscar usuarios
  buscadorInput.addEventListener('input', function () {
    const busqueda = this.value.toLowerCase().trim();
    resultadosDiv.innerHTML = '';

    if (busqueda.length < 2) {
      resultadosDiv.style.display = 'none';
      return;
    }

    const resultados = usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(busqueda) ||
      (usuario.email && usuario.email.toLowerCase().includes(busqueda))
    );

    if (resultados.length > 0) {
      resultadosDiv.style.display = 'block';
      resultados.forEach(usuario => {
        // No mostrar usuarios ya seleccionados
        if (usuariosSeleccionados.includes(usuario.id.toString())) return;

        const item = document.createElement('div');
        item.className = 'resultado-item';
        item.textContent = usuario.nombre + (usuario.email ? ` (${usuario.email})` : '');
        item.dataset.id = usuario.id;
        item.dataset.nombre = usuario.nombre;

        item.addEventListener('click', function () {
          seleccionarUsuario(usuario.id, usuario.nombre);
          buscadorInput.value = '';
          resultadosDiv.style.display = 'none';
        });

        resultadosDiv.appendChild(item);
      });
    } else {
      resultadosDiv.style.display = 'block';
      resultadosDiv.innerHTML = '<div class="no-resultados">No se encontraron usuarios</div>';
    }
  });

  // Función para seleccionar un usuario
  function seleccionarUsuario(id, nombre) {
    if (!usuariosSeleccionados.includes(id.toString())) {
      usuariosSeleccionados.push(id.toString());

      const usuarioTag = document.createElement('div');
      usuarioTag.className = 'usuario-tag';
      usuarioTag.innerHTML = `
        ${nombre}
        <span class="eliminar-usuario" data-id="${id}">×</span>
      `;

      usuarioTag.querySelector('.eliminar-usuario').addEventListener('click', function () {
        eliminarUsuario(id);
        usuarioTag.remove();
      });

      usuariosSeleccionadosDiv.appendChild(usuarioTag);
      actualizarUsuariosAsignados();
    }
  }

  // Función para eliminar un usuario seleccionado
  function eliminarUsuario(id) {
    usuariosSeleccionados = usuariosSeleccionados.filter(userId => userId !== id.toString());
    actualizarUsuariosAsignados();
  }

  // Cerrar resultados si se hace clic fuera del buscador
  document.addEventListener('click', function (e) {
    if (e.target !== buscadorInput && !resultadosDiv.contains(e.target)) {
      resultadosDiv.style.display = 'none';
    }
  });
});