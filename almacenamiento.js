const CLAVE_LOCALSTORAGE = "usuariosMiPlata";
function obtenerUsuarios() {
  const datosGuardados = localStorage.getItem(CLAVE_LOCALSTORAGE);
    if (datosGuardados=== null) {
        return [];
    }
    return JSON.parse(datosGuardados);
}

function guardarUsuarios(Usuarios){
    const datosComoTexto = JSON.stringify(Usuarios);
    localStorage.setItem(CLAVE_LOCALSTORAGE, datosComoTexto);
}
function buscarUsuarioPorNombre(nombreUsuario) {
  const usuarios = obtenerUsuarios();
 
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarios[i].usuario === nombreUsuario) {
      return usuarios[i];
    }
  }
 
  return undefined;
}
function existeUsuario(nombreUsuario) {
  return buscarUsuarioPorNombre(nombreUsuario) !== undefined;
}
function actualizarUsuario(usuarioActualizado) {
  const usuarios = obtenerUsuarios();
 
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarios[i].usuario === usuarioActualizado.usuario) {
      usuarios[i] = usuarioActualizado;
      break;
    }
  }
 
  guardarUsuarios(usuarios);
}