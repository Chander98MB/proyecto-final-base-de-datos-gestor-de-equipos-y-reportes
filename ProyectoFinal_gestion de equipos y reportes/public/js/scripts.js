window.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    fetch('navbar.html')
      .then(res => res.text())
      .then(html => {
        navbar.innerHTML = html;
        return fetch('/tipo-usuario');
      })
      .then(res => res.json())
      .then(data => {
        const tipoUsuario = data.tipo_usuario;
        const menu = document.getElementById('menu');
        if (!menu) return;

        // Menús según tipo de usuario
        if (tipoUsuario === 'admin') {
          menu.innerHTML += '<li><a href="index.html">Inicio</a></li>';
          menu.innerHTML += '<li><a href="equipos.html">Equipos</a></li>';
          menu.innerHTML += '<li><a href="usuarios.html">Usuarios</a></li>';
          menu.innerHTML += '<li><a href="busqueda.html">Buscar</a></li>';
          menu.innerHTML += '<li><a href="crear-reporte.html">Crear Reporte</a></li>';
        }

        // === INICIO MODIFICACIÓN MÍNIMA: soporte "biomedico" ===
        if (tipoUsuario === 'medico' || tipoUsuario === 'biomedico') {
          menu.innerHTML += '<li><a href="index.html">Inicio</a></li>';
          menu.innerHTML += '<li><a href="equipos.html">Equipos</a></li>';
          menu.innerHTML += '<li><a href="busqueda.html">Buscar</a></li>';
        }
        // === FIN MODIFICACIÓN ===

        if (tipoUsuario === 'tecnico') {
          menu.innerHTML += '<li><a href="index.html">Inicio</a></li>';
          menu.innerHTML += '<li><a href="equipos.html">Equipos</a></li>';
          menu.innerHTML += '<li><a href="busqueda.html">Buscar</a></li>';
          menu.innerHTML += '<li><a href="crear-reporte.html">Crear Reporte</a></li>';
        }

        menu.innerHTML += '<li><a href="/logout">Cerrar sesión</a></li>';
      })
      .catch(err => {
        console.error('Error al cargar tipo de usuario o menú:', err);
      });
  }
});

// 🔧 Función global para usar desde historial.html
function getParametroUrl(nombre) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nombre);
}

function descargarHistorialPDF() {
  const id = getParametroUrl('equipo') || document.getElementById('equipoId').value;
  if (!id) return alert('Selecciona un equipo');
  window.open(`/mantenimiento/historial-pdf/${id}`, '_blank');
}


